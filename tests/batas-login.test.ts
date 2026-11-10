import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  type AturanBatasLogin,
  catatLoginGagal,
  getAturanBatasLogin,
  resetLoginGagal,
  sisaKunciLogin,
} from "@/lib/batas-login";
import { db } from "@/lib/db";
import { tutupDb } from "./support/db";

const aturan: AturanBatasLogin = { maksGagalAkun: 3, maksGagalIp: 5, jendelaMenit: 15 };

async function gagal(kali: number, identifier: string | null, ip: string | null) {
  for (let i = 0; i < kali; i++) await catatLoginGagal(identifier, ip);
}

beforeEach(async () => {
  await db.execute("DELETE FROM login_gagal");
});
afterAll(tutupDb);

describe("Rate limiting login per akun (NFR-04, audit T3)", () => {
  it("belum terkunci sebelum mencapai batas", async () => {
    await gagal(2, "0102523025", null);
    expect(await sisaKunciLogin("0102523025", null, aturan)).toBe(0);
  });

  it("terkunci selama jendela waktu setelah mencapai batas", async () => {
    await gagal(3, "0102523025", null);
    expect(await sisaKunciLogin("0102523025", null, aturan)).toBe(15);
  });

  it("penguncian tidak bergantung pada huruf besar/kecil identifier", async () => {
    await gagal(3, "Hasan.Yusuf@IAIS.ac.id", null);
    expect(await sisaKunciLogin("hasan.yusuf@iais.ac.id ", null, aturan)).toBeGreaterThan(0);
  });

  it("akun lain tidak ikut terkunci", async () => {
    await gagal(3, "0102523025", null);
    expect(await sisaKunciLogin("0102523026", null, aturan)).toBe(0);
  });

  it("percobaan di luar jendela waktu tidak dihitung", async () => {
    await db.execute(
      "INSERT INTO login_gagal (identifier, created_at) VALUES ('0102523025', NOW() - INTERVAL 16 MINUTE)",
    );
    await gagal(2, "0102523025", null);
    expect(await sisaKunciLogin("0102523025", null, aturan)).toBe(0);
  });

  it("kunci terbuka ketika percobaan gagal tertua keluar dari jendela", async () => {
    await db.execute(
      `INSERT INTO login_gagal (identifier, created_at) VALUES
         ('0102523025', NOW() - INTERVAL 10 MINUTE),
         ('0102523025', NOW() - INTERVAL 9 MINUTE),
         ('0102523025', NOW() - INTERVAL 8 MINUTE)`,
    );
    // Percobaan ke-3 terbaru tercatat 10 menit lalu → kunci terbuka ±5 menit lagi.
    expect(await sisaKunciLogin("0102523025", null, aturan)).toBe(5);
  });

  it("login berhasil mereset hitungan akun", async () => {
    await gagal(3, "0102523025", null);
    await resetLoginGagal("0102523025");
    expect(await sisaKunciLogin("0102523025", null, aturan)).toBe(0);
  });
});

describe("Rate limiting login per IP", () => {
  it("salah CAPTCHA (identifier null) tidak mengunci akun, tetapi dihitung per IP", async () => {
    await gagal(5, null, "10.0.0.1");
    expect(await sisaKunciLogin("0102523025", null, aturan)).toBe(0);
    expect(await sisaKunciLogin("0102523025", "10.0.0.1", aturan)).toBeGreaterThan(0);
  });

  it("menebak banyak akun dari satu IP mengunci IP tersebut saja", async () => {
    for (const nim of ["0102523025", "0102523026", "0102523027", "0102523028", "0102523029"]) {
      await gagal(1, nim, "10.0.0.2");
    }
    expect(await sisaKunciLogin("0102523030", "10.0.0.2", aturan)).toBeGreaterThan(0);
    expect(await sisaKunciLogin("0102523030", "10.0.0.3", aturan)).toBe(0);
  });

  it("login berhasil tidak mereset hitungan IP", async () => {
    await gagal(5, "0102523025", "10.0.0.4");
    await resetLoginGagal("0102523025");
    expect(await sisaKunciLogin("0102523025", "10.0.0.4", aturan)).toBeGreaterThan(0);
  });
});

describe("Aturan dari tabel pengaturan", () => {
  it("nilai default terbaca dari data-master.sql", async () => {
    expect(await getAturanBatasLogin()).toEqual({ maksGagalAkun: 5, maksGagalIp: 100, jendelaMenit: 15 });
  });
});
