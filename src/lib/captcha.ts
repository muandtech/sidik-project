import "server-only";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { ResultSetHeader } from "mysql2/promise";
import { CAPTCHA_CHARSET } from "@/lib/captcha-glyph";
import { db } from "@/lib/db";

export const CAPTCHA_COOKIE = "sidik_captcha";
export const CAPTCHA_TTL_SECONDS = 5 * 60;
const LENGTH = 5;

// Format token di cookie: <nonce>.<kedaluwarsa>.<tanda tangan terbit>.<tanda tangan jawaban>
//  - tanda tangan terbit membuktikan token dibuat server ini (diperiksa tanpa perlu tahu jawabannya);
//  - tanda tangan jawaban mengikat kode ke nonce; kodenya sendiri tidak pernah disimpan.
// Nonce dicatat di tabel captcha_terpakai saat dipakai sehingga satu token hanya berlaku untuk satu
// percobaan login (anti-replay, temuan audit T2).

export type TokenCaptcha = { nonce: string; expires: number; tandaJawaban: string };

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET belum diatur di .env.local");
  return value;
}

function tandaTangan(data: string) {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

function samaAman(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Kode tidak peka huruf besar/kecil: semua karakter CAPTCHA adalah huruf kapital dan angka. */
function normalisasi(kode: string) {
  return kode.trim().toUpperCase();
}

export function createCaptcha(now = Date.now()) {
  const code = Array.from({ length: LENGTH }, () => CAPTCHA_CHARSET[randomInt(CAPTCHA_CHARSET.length)]).join("");
  const nonce = randomBytes(16).toString("base64url");
  const expires = Math.floor(now / 1000) + CAPTCHA_TTL_SECONDS;
  const token = [
    nonce,
    expires,
    tandaTangan(`terbit|${nonce}|${expires}`),
    tandaTangan(`jawaban|${nonce}|${code}`),
  ].join(".");
  return { code, token };
}

/** Isi token bila token asli buatan server dan belum kedaluwarsa; selain itu null. */
export function bacaTokenCaptcha(token: string | undefined, now = Date.now()): TokenCaptcha | null {
  const bagian = token?.split(".");
  if (!bagian || bagian.length !== 4) return null;
  const [nonce, expiresRaw, tandaTerbit, tandaJawaban] = bagian;
  const expires = Number(expiresRaw);
  if (!nonce || !Number.isInteger(expires) || expires < now / 1000) return null;
  if (!samaAman(tandaTerbit, tandaTangan(`terbit|${nonce}|${expires}`))) return null;
  return { nonce, expires, tandaJawaban };
}

export function jawabanCaptchaBenar(input: string, token: TokenCaptcha) {
  return samaAman(token.tandaJawaban, tandaTangan(`jawaban|${token.nonce}|${normalisasi(input)}`));
}

/** Menandai token sudah dipakai. Mengembalikan false bila token pernah dipakai sebelumnya (replay). */
export async function pakaiTokenCaptcha(token: TokenCaptcha) {
  await db.execute("DELETE FROM captcha_terpakai WHERE kedaluwarsa_at < NOW()");
  const [hasil] = await db.execute<ResultSetHeader>(
    "INSERT IGNORE INTO captcha_terpakai (nonce, kedaluwarsa_at) VALUES (?, FROM_UNIXTIME(?))",
    [token.nonce, token.expires],
  );
  return hasil.affectedRows === 1;
}

/**
 * Verifikasi lengkap: token asli, belum kedaluwarsa, belum pernah dipakai, dan jawaban benar.
 * Token selalu hangus setelah diperiksa, termasuk bila jawabannya salah.
 */
export async function verifikasiCaptcha(input: string, rawToken: string | undefined) {
  const token = bacaTokenCaptcha(rawToken);
  if (!token || !input) return false;
  if (!(await pakaiTokenCaptcha(token))) return false;
  return jawabanCaptchaBenar(input, token);
}
