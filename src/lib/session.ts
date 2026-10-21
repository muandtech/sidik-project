import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, queryOne } from "@/lib/db";
import { getPengaturan } from "@/lib/konfigurasi";

export const SESSION_COOKIE = "sidik_session";

export type Role = "mahasiswa" | "dosen" | "keuangan" | "admin";

export type SessionUser = {
  userId: number;
  username: string;
  email: string;
  role: Role;
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

export async function getClientInfo() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const userAgent = h.get("user-agent")?.slice(0, 255) ?? null;
  return { ip, userAgent };
}

export async function createSession(userId: number, remember: boolean) {
  const token = randomBytes(32).toString("base64url");
  // Durasi diatur di tabel pengaturan (sesi_durasi_jam / sesi_ingat_saya_hari).
  const pengaturan = await getPengaturan();
  const maxAgeSeconds = remember
    ? positiveNumber(pengaturan.sesi_ingat_saya_hari, "sesi_ingat_saya_hari") * 24 * 3600
    : positiveNumber(pengaturan.sesi_durasi_jam, "sesi_durasi_jam") * 3600;
  const { ip, userAgent } = await getClientInfo();

  await db.execute(
    `INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES (?, ?, NOW() + INTERVAL ? SECOND, ?, ?)`,
    [userId, hashToken(token), maxAgeSeconds, ip, userAgent],
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

/** Pengguna yang sedang login, atau null bila session tidak ada/kedaluwarsa. Di-cache per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  return queryOne<SessionUser>(
    `SELECT u.id AS userId, u.username, u.email, u.role,
            COALESCE(m.nama, d.nama, u.nama, u.username) AS nama
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN mahasiswa m ON m.user_id = u.id
       LEFT JOIN dosen d ON d.user_id = u.id
      WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.status = 'aktif'`,
    [hashToken(token)],
  );
});

/** Wajib login; mengarahkan ke /login bila belum. */
export async function requireUser(role?: Role) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (role && user.role !== role) redirect(homeFor(user.role));
  return user;
}

export function homeFor(role: Role) {
  if (role === "mahasiswa") return "/dashboard";
  if (role === "keuangan") return "/admin-keuangan";
  return "/portal-staf";
}
