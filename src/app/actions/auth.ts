"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { catatAudit as audit } from "@/lib/audit";
import { db, queryOne } from "@/lib/db";
import { catatLoginGagal, getAturanBatasLogin, resetLoginGagal, sisaKunciLogin } from "@/lib/batas-login";
import { CAPTCHA_COOKIE, verifikasiCaptcha } from "@/lib/captcha";
import { getPengaturan } from "@/lib/konfigurasi";
import { isRole } from "@/lib/peran";
import {
  akhiriSessionLain,
  createSession,
  deleteSession,
  gantiRoleAktif,
  getClientInfo,
  getRoleTersedia,
  getSessionUser,
  homeFor,
} from "@/lib/session";

export type LoginState = {
  message?: string;
  errors?: { identifier?: string; password?: string; captcha?: string };
  identifier?: string;
  /** Berubah setiap percobaan gagal agar gambar CAPTCHA dimuat ulang. */
  attempt?: number;
};

// Hash acak untuk akun yang tidak ditemukan, supaya waktu respons tetap setara (mencegah enumerasi akun).
let dummyHash: Promise<string> | undefined;
function getDummyHash() {
  dummyHash ??= bcrypt.hash(randomBytes(16).toString("hex"), 10);
  return dummyHash;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const captcha = String(formData.get("captcha") ?? "").trim();
  const remember = formData.get("remember") === "on";

  const errors: LoginState["errors"] = {};
  if (!identifier) errors.identifier = "NIM / Username wajib diisi.";
  if (!password) errors.password = "Password wajib diisi.";
  if (!captcha) errors.captcha = "Kode CAPTCHA wajib diisi.";
  if (Object.keys(errors).length > 0) {
    return { errors, identifier, attempt: Date.now() };
  }

  const cookieStore = await cookies();
  const captchaToken = cookieStore.get(CAPTCHA_COOKIE)?.value;
  cookieStore.delete(CAPTCHA_COOKIE);

  // NFR-04: tolak lebih dulu bila akun/IP sedang dikunci karena terlalu banyak percobaan gagal.
  const { ip } = await getClientInfo();
  const sisaKunci = await sisaKunciLogin(identifier, ip, await getAturanBatasLogin());
  if (sisaKunci > 0) {
    await audit(null, "login_diblokir", `identifier: ${identifier.slice(0, 60)}`);
    return {
      message: `Terlalu banyak percobaan masuk yang gagal. Silakan coba lagi dalam ${sisaKunci} menit.`,
      identifier,
      attempt: Date.now(),
    };
  }

  // CAPTCHA hanya berlaku untuk satu kali percobaan (token dicatat di server, tidak bisa dipakai ulang).
  if (!(await verifikasiCaptcha(captcha, captchaToken))) {
    // Salah ketik CAPTCHA hanya dihitung per IP agar tidak mengunci akun pemilik yang sah.
    await catatLoginGagal(null, ip);
    return {
      errors: { captcha: "Kode CAPTCHA tidak sesuai atau sudah kedaluwarsa. Silakan coba lagi." },
      identifier,
      attempt: Date.now(),
    };
  }

  const user = await queryOne<{ id: number; password_hash: string; status: string }>(
    "SELECT id, password_hash, status FROM users WHERE username = ? OR email = ? LIMIT 1",
    [identifier, identifier.toLowerCase()],
  );
  const passwordValid = await bcrypt.compare(password, user?.password_hash ?? (await getDummyHash()));

  if (!user || !passwordValid) {
    // Dicatat juga untuk identifier yang tidak terdaftar agar penguncian tidak membocorkan akun mana yang ada.
    await catatLoginGagal(identifier, ip);
    await audit(user?.id ?? null, "login_gagal", `identifier: ${identifier.slice(0, 60)}`);
    return { message: "NIM/Username atau password salah.", identifier, attempt: Date.now() };
  }
  if (user.status !== "aktif") {
    await audit(user.id, "login_gagal", "akun nonaktif");
    const { unit_layanan_akun } = await getPengaturan();
    return {
      message: `Akun Anda tidak aktif. Silakan hubungi ${unit_layanan_akun ?? "admin"}.`,
      identifier,
      attempt: Date.now(),
    };
  }

  // Mahasiswa lulus/keluar tidak punya role yang boleh dipakai (keputusan kampus 2026-11-16).
  const roles = await getRoleTersedia(user.id);
  const roleAwal = roles[0];
  if (!roleAwal) {
    await audit(user.id, "login_gagal", "tidak ada role yang boleh dipakai (status akademik/role)");
    const pengaturan = await getPengaturan();
    return {
      message: `${pengaturan.pesan_status_mahasiswa_ditolak ?? "Akun Anda tidak dapat masuk ke portal."} Hubungi ${pengaturan.unit_layanan_akun ?? "admin"} bila ada kekeliruan.`,
      identifier,
      attempt: Date.now(),
    };
  }

  await resetLoginGagal(identifier);
  await createSession(user.id, remember, roleAwal);
  await db.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]);
  await audit(user.id, "login_sukses", `role aktif: ${roleAwal}`);

  redirect(homeFor(roleAwal));
}

/** Berpindah role aktif (SD-S2-01). Role tujuan diperiksa ulang di server. */
export async function gantiRole(formData: FormData) {
  const role = String(formData.get("role") ?? "");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isRole(role) || !(await gantiRoleAktif(role))) {
    await audit(user.userId, "akses_ditolak", `ganti role ke ${role.slice(0, 20)}`);
    redirect(homeFor(user.role));
  }
  await audit(user.userId, "ganti_role", `${user.role} → ${role}`);
  redirect(homeFor(role));
}

export type GantiPasswordState = { error?: string; sukses?: string };

/** Ganti password (SD-S2-04): password lama benar, kebijakan password baru, session lain diakhiri. */
export async function gantiPassword(_prev: GantiPasswordState, formData: FormData): Promise<GantiPasswordState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const lama = String(formData.get("password_lama") ?? "");
  const baru = String(formData.get("password_baru") ?? "");
  const ulang = String(formData.get("password_ulang") ?? "");

  const minimal = Number((await getPengaturan()).password_min_panjang) || 8;
  if (baru.length < minimal || !/[A-Za-z]/.test(baru) || !/\d/.test(baru)) {
    return { error: `Password baru minimal ${minimal} karakter dan berisi kombinasi huruf dan angka.` };
  }
  if (baru.length > 72) return { error: "Password baru maksimal 72 karakter." };
  if (baru !== ulang) return { error: "Konfirmasi password baru tidak sama." };
  if (baru === lama) return { error: "Password baru harus berbeda dari password lama." };

  const akun = await queryOne<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [user.userId]);
  if (!akun || !(await bcrypt.compare(lama, akun.password_hash))) {
    await audit(user.userId, "ganti_password_gagal", "password lama salah");
    return { error: "Password lama salah." };
  }

  await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(baru, 10), user.userId]);
  await akhiriSessionLain(user.userId);
  await audit(user.userId, "ganti_password");
  return { sukses: "Password berhasil diganti. Semua session di perangkat lain telah diakhiri." };
}

export async function logout() {
  const user = await getSessionUser();
  await deleteSession();
  if (user) await audit(user.userId, "logout");
  redirect("/login");
}
