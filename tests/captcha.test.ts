import { afterAll, describe, expect, it } from "vitest";
import {
  CAPTCHA_TTL_SECONDS,
  bacaTokenCaptcha,
  createCaptcha,
  jawabanCaptchaBenar,
  verifikasiCaptcha,
} from "@/lib/captcha";
import { CAPTCHA_CHARSET, renderCaptchaSvg } from "@/lib/captcha-glyph";
import { tutupDb } from "./support/db";

afterAll(tutupDb);

/** Mengganti satu bagian token (0 nonce, 1 kedaluwarsa, 2 tanda terbit, 3 tanda jawaban). */
function ubahBagian(token: string, index: number, nilai: string) {
  const bagian = token.split(".");
  bagian[index] = nilai;
  return bagian.join(".");
}

describe("Gambar CAPTCHA (audit T1)", () => {
  it("tidak memuat kode sebagai teks yang bisa dibaca bot", () => {
    for (let i = 0; i < 20; i++) {
      const { code } = createCaptcha();
      const svg = renderCaptchaSvg(code);
      expect(svg).not.toContain("<text");
      expect(svg).not.toContain(code);
      expect(svg).toMatch(/^<svg [^>]+>.*<\/svg>$/);
    }
  });

  it("setiap karakter di charset bisa digambar dan tidak memakai karakter yang mudah tertukar", () => {
    expect(() => renderCaptchaSvg(CAPTCHA_CHARSET)).not.toThrow();
    expect(CAPTCHA_CHARSET).not.toMatch(/[IO01S5a-z]/);
  });
});

describe("Token CAPTCHA", () => {
  it("token asli dapat dibaca dan jawabannya cocok", () => {
    const { code, token } = createCaptcha();
    const isi = bacaTokenCaptcha(token);
    expect(isi).not.toBeNull();
    expect(jawabanCaptchaBenar(code, isi!)).toBe(true);
  });

  it("jawaban tidak peka huruf besar/kecil dan spasi di tepi", () => {
    const { code, token } = createCaptcha();
    expect(jawabanCaptchaBenar(` ${code.toLowerCase()} `, bacaTokenCaptcha(token)!)).toBe(true);
  });

  it("jawaban salah ditolak", () => {
    const { code, token } = createCaptcha();
    const salah = code[0] === "A" ? `B${code.slice(1)}` : `A${code.slice(1)}`;
    expect(jawabanCaptchaBenar(salah, bacaTokenCaptcha(token)!)).toBe(false);
  });

  it("token kedaluwarsa ditolak", () => {
    const sekarang = Date.now();
    const { token } = createCaptcha(sekarang);
    expect(bacaTokenCaptcha(token, sekarang + (CAPTCHA_TTL_SECONDS + 1) * 1000)).toBeNull();
  });

  it("token yang diubah ditolak", () => {
    const { token } = createCaptcha();
    const [, expires] = token.split(".");
    expect(bacaTokenCaptcha(ubahBagian(token, 1, String(Number(expires) + 3600)))).toBeNull();
    expect(bacaTokenCaptcha(ubahBagian(token, 0, "nonce-palsu"))).toBeNull();
    expect(bacaTokenCaptcha(ubahBagian(token, 2, "tanda-palsu"))).toBeNull();
    expect(bacaTokenCaptcha("bukan.token")).toBeNull();
    expect(bacaTokenCaptcha(undefined)).toBeNull();
  });

  it("tanda jawaban dari token lain tidak bisa dipindahkan", () => {
    const a = createCaptcha();
    const b = createCaptcha();
    const campuran = ubahBagian(a.token, 3, b.token.split(".")[3]);
    expect(jawabanCaptchaBenar(b.code, bacaTokenCaptcha(campuran)!)).toBe(false);
  });
});

describe("Verifikasi CAPTCHA sekali pakai (audit T2)", () => {
  it("token yang sama tidak bisa dipakai dua kali", async () => {
    const { code, token } = createCaptcha();
    expect(await verifikasiCaptcha(code, token)).toBe(true);
    expect(await verifikasiCaptcha(code, token)).toBe(false);
  });

  it("jawaban salah tetap menghanguskan token", async () => {
    const { code, token } = createCaptcha();
    expect(await verifikasiCaptcha("XXXXX", token)).toBe(code === "XXXXX");
    expect(await verifikasiCaptcha(code, token)).toBe(false);
  });

  it("token kosong atau palsu ditolak", async () => {
    expect(await verifikasiCaptcha("ABCDE", undefined)).toBe(false);
    expect(await verifikasiCaptcha("ABCDE", "a.b.c.d")).toBe(false);
  });
});
