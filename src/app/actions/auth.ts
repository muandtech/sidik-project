"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { catatAudit as audit } from "@/lib/audit";
import { db, queryOne } from "@/lib/db";
import { CAPTCHA_COOKIE, verifyCaptcha } from "@/lib/captcha";
import { getPengaturan } from "@/lib/konfigurasi";
import { createSession, deleteSession, getSessionUser, homeFor, type Role } from "@/lib/session";

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

  // CAPTCHA hanya berlaku untuk satu kali percobaan.
  const cookieStore = await cookies();
  const captchaToken = cookieStore.get(CAPTCHA_COOKIE)?.value;
  cookieStore.delete(CAPTCHA_COOKIE);
  if (!verifyCaptcha(captcha, captchaToken)) {
    return {
      errors: { captcha: "Kode CAPTCHA tidak sesuai atau sudah kedaluwarsa. Silakan coba lagi." },
      identifier,
      attempt: Date.now(),
    };
  }

  const user = await queryOne<{ id: number; password_hash: string; role: Role; status: string }>(
    "SELECT id, password_hash, role, status FROM users WHERE username = ? OR email = ? LIMIT 1",
    [identifier, identifier.toLowerCase()],
  );
  const passwordValid = await bcrypt.compare(password, user?.password_hash ?? (await getDummyHash()));

  if (!user || !passwordValid) {
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

  await createSession(user.id, remember);
  await db.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]);
  await audit(user.id, "login_sukses");

  redirect(homeFor(user.role));
}

export async function logout() {
  const user = await getSessionUser();
  await deleteSession();
  if (user) await audit(user.userId, "logout");
  redirect("/login");
}
