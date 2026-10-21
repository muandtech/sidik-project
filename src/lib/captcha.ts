import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const CAPTCHA_COOKIE = "sidik_captcha";
export const CAPTCHA_TTL_SECONDS = 5 * 60;

// Tanpa karakter yang mudah tertukar (0/O, 1/l/I).
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const LENGTH = 5;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET belum diatur di .env.local");
  return value;
}

function sign(code: string, expires: number) {
  return createHmac("sha256", secret()).update(`${code}|${expires}`).digest("hex");
}

/** Membuat kode baru; kode tidak pernah disimpan — hanya tanda tangannya yang dikirim sebagai cookie. */
export function createCaptcha() {
  const code = Array.from({ length: LENGTH }, () => CHARSET[randomInt(CHARSET.length)]).join("");
  const expires = Math.floor(Date.now() / 1000) + CAPTCHA_TTL_SECONDS;
  return { code, token: `${expires}.${sign(code, expires)}` };
}

/** Kode peka huruf besar/kecil sesuai petunjuk pada form login. */
export function verifyCaptcha(input: string, token: string | undefined) {
  if (!token || !input) return false;
  const [expiresRaw, signature] = token.split(".");
  const expires = Number(expiresRaw);
  if (!signature || !Number.isFinite(expires) || expires < Date.now() / 1000) return false;

  const expected = Buffer.from(sign(input, expires), "hex");
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function renderCaptchaSvg(code: string) {
  const width = 132;
  const height = 48;
  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  const colors = ["#374151", "#4b5563", "#1f2937", "#6b7280"];

  const lines = Array.from({ length: 5 }, () => {
    const color = colors[randomInt(colors.length)];
    return `<path d="M${rand(0, 20)} ${rand(5, 43)} Q ${rand(40, 90)} ${rand(0, 48)} ${rand(110, 132)} ${rand(5, 43)}" stroke="${color}" stroke-opacity="0.35" stroke-width="${rand(1, 2).toFixed(1)}" fill="none"/>`;
  }).join("");

  const dots = Array.from({ length: 30 }, () =>
    `<circle cx="${rand(0, width).toFixed(1)}" cy="${rand(0, height).toFixed(1)}" r="${rand(0.6, 1.4).toFixed(1)}" fill="#9ca3af" fill-opacity="0.6"/>`,
  ).join("");

  const chars = [...code]
    .map((char, i) => {
      const x = 16 + i * 24;
      const y = rand(30, 36);
      const rotate = rand(-22, 22).toFixed(0);
      const color = colors[randomInt(colors.length)];
      return `<text x="${x}" y="${y.toFixed(1)}" transform="rotate(${rotate} ${x} ${y.toFixed(1)})" font-family="Verdana, Arial, sans-serif" font-size="${rand(22, 26).toFixed(0)}" font-weight="700" fill="${color}" text-anchor="middle">${char}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#eef0f3"/>${dots}${lines}${chars}</svg>`;
}
