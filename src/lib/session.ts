import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { db, query, queryOne } from "@/lib/db";
import { getPengaturan } from "@/lib/konfigurasi";
import { homeFor, isRole, STATUS_BOLEH_LOGIN, type Role } from "@/lib/peran";

export { homeFor, type Role };

export const SESSION_COOKIE = "sidik_session";

export type SessionUser = {
  userId: number;
  username: string;
  email: string;
  /** Role aktif session ini (PRD SD-S2-01: pengguna dapat berpindah role aktif). */
  role: Role;
  /** Seluruh role yang saat ini boleh dipakai pengguna. */
  roles: Role[];
  nama: string;
};

function positiveNumber(value: string | undefined, key: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`Pengaturan "${key}" belum diisi atau tidak valid di tabel pengaturan.`);
  }
  return number;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * IP klien dari header reverse proxy. Header ini bisa diisi bebas oleh klien, sehingga hanya dipercaya
 * bila aplikasi berada di belakang Nginx/Caddy yang menimpanya (TRUST_PROXY=true). Tanpa itu IP = null
 * dan rate limiting hanya berjalan per akun (temuan audit S2).
 */
export function ipDariHeader(h: Pick<Headers, "get">, trustProxy = process.env.TRUST_PROXY === "true") {
  if (!trustProxy) return null;
  // X-Real-IP diisi proxy dengan $remote_addr; entri terakhir X-Forwarded-For ditambahkan oleh proxy itu sendiri.
  const ip = h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return ip ? ip.slice(0, 45) : null;
}

export async function getClientInfo() {
  const h = await headers();
  const userAgent = h.get("user-agent")?.slice(0, 255) ?? null;
  return { ip: ipDariHeader(h), userAgent };
}

/**
 * Role yang boleh dipakai pengguna. Role mahasiswa hanya berlaku bila status akademiknya aktif, cuti,
 * atau nonaktif — mahasiswa lulus/keluar tidak dapat masuk ke portal mahasiswa (keputusan kampus 2026-11-16).
 */
export async function getRoleTersedia(userId: number): Promise<Role[]> {
  const rows = await query<{ role: string }>(
    `SELECT ur.role
       FROM user_roles ur
       LEFT JOIN mahasiswa m ON m.user_id = ur.user_id
      WHERE ur.user_id = ? AND (ur.role <> 'mahasiswa' OR m.status_akademik IN (?))
      ORDER BY FIELD(ur.role, 'mahasiswa', 'dosen', 'kaprodi', 'baak', 'keuangan', 'pimpinan', 'superadmin')`,
    [userId, STATUS_BOLEH_LOGIN],
  );
  return rows.map((r) => r.role).filter(isRole);
}

export async function createSession(userId: number, remember: boolean, role: Role) {
  const token = randomBytes(32).toString("base64url");
  // Durasi diatur di tabel pengaturan (sesi_durasi_jam / sesi_ingat_saya_hari).
  const pengaturan = await getPengaturan();
  const maxAgeSeconds = remember
    ? positiveNumber(pengaturan.sesi_ingat_saya_hari, "sesi_ingat_saya_hari") * 24 * 3600
    : positiveNumber(pengaturan.sesi_durasi_jam, "sesi_durasi_jam") * 3600;
  const { ip, userAgent } = await getClientInfo();

  await db.execute(
    `INSERT INTO sessions (user_id, role_aktif, token_hash, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, NOW() + INTERVAL ? SECOND, ?, ?)`,
    [userId, role, hashToken(token), maxAgeSeconds, ip, userAgent],
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Tanpa "Ingat Saya" cookie berakhir saat browser ditutup; masa berlaku di server tetap dibatasi.
    ...(remember ? { maxAge: maxAgeSeconds } : {}),
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.execute("DELETE FROM sessions WHERE token_hash = ?", [hashToken(token)]);
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Mengganti role aktif session saat ini; hanya ke role yang memang dimiliki pengguna. */
export async function gantiRoleAktif(role: Role) {
  const user = await getSessionUser();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!user || !token || !user.roles.includes(role)) return false;
  await db.execute("UPDATE sessions SET role_aktif = ? WHERE token_hash = ?", [role, hashToken(token)]);
  return true;
}

/** Mengakhiri semua session pengguna kecuali session saat ini (setelah ganti password, SD-S2-04). */
export async function akhiriSessionLain(userId: number) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  await db.execute("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?", [userId, hashToken(token)]);
}

/** Pengguna yang sedang login, atau null bila session tidak ada/kedaluwarsa. Di-cache per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sesi = await queryOne<Omit<SessionUser, "roles" | "role"> & { role: string }>(
    `SELECT u.id AS userId, u.username, u.email, s.role_aktif AS role,
            COALESCE(m.nama, d.nama, u.nama, u.username) AS nama
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN mahasiswa m ON m.user_id = u.id
       LEFT JOIN dosen d ON d.user_id = u.id
      WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.status = 'aktif'`,
    [hashToken(token)],
  );
  if (!sesi || !isRole(sesi.role)) return null;

  // Role diperiksa ulang setiap request: role yang dicabut atau mahasiswa yang baru lulus langsung kehilangan akses.
  const roles = await getRoleTersedia(sesi.userId);
  if (!roles.includes(sesi.role)) return null;
  return { ...sesi, role: sesi.role, roles };
});

/**
 * Wajib login, dan bila `role` diisi, role aktif harus salah satunya. Akses tanpa izin ditolak dengan
 * HTTP 403 dan dicatat di audit log (SD-S2-01). Setiap halaman memanggil ini sendiri (anti-IDOR, Guide §3).
 */
export async function requireUser(role?: Role | readonly Role[]) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const diizinkan = role === undefined ? null : typeof role === "string" ? [role] : role;
  if (diizinkan && !diizinkan.includes(user.role)) {
    // Import dinamis: audit.ts memakai getClientInfo dari modul ini.
    const { catatAudit } = await import("@/lib/audit");
    await catatAudit(user.userId, "akses_ditolak", `role aktif ${user.role}; butuh ${diizinkan.join("/")}`);
    forbidden();
  }
  return user;
}
