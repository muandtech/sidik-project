import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/session";

const sesi = vi.hoisted(() => ({ user: null as SessionUser | null }));
vi.mock("@/lib/session", async (asli) => ({
  ...(await asli<typeof import("@/lib/session")>()),
  getClientInfo: async () => ({ ip: null, userAgent: "vitest" }),
  getSessionUser: async () => sesi.user,
}));
vi.mock("next/cache", () => ({ refresh: () => undefined }));

import { putuskan, tambahKelas } from "@/app/actions/akademik";
import { hitungIndeks, hitungRingkasanStudi, maksSksDariIps, pilihNilaiPerMk, type BarisNilai } from "@/lib/akademik";
import { db } from "@/lib/db";
import { GagalAksi } from "@/lib/gagal-aksi";
import { izinkanYangMemenuhiSyarat, memenuhiSyaratBayar } from "@/lib/izin-krs";
import {
  ajukanKrs,
  alasanKrsTerkunci,
  batalkanPengajuanKrs,
  hapusKelasKrs,
  jadwalBentrok,
  putuskanKrs,
  tambahKelasKrs,
} from "@/lib/krs";
import { getRoleTersedia } from "@/lib/session";
import { buatKelas, buatMahasiswa, siapkanDunia, statusKrs, terisi, type Dunia } from "./support/akademik";
import { tutupDb } from "./support/db";
import { buatTagihan, buatUser } from "./support/keuangan";

let d: Dunia;
const senin = (mulai: string, selesai: string) => ({ hari: 1, mulai, selesai });

beforeAll(async () => {
  d = await siapkanDunia();
});
beforeEach(() => {
  sesi.user = null;
});
afterAll(tutupDb);

describe("Aturan murni", () => {
  const ta = { krs_mulai: "2026-08-01", krs_selesai: "2026-08-14" };

  it("KRS terkunci untuk cuti/nonaktif, tanpa izin Keuangan, atau di luar periode", () => {
    expect(alasanKrsTerkunci({ status_akademik: "cuti", boleh_krs: 1 }, ta, true)).toMatch(/cuti/);
    expect(alasanKrsTerkunci({ status_akademik: "nonaktif", boleh_krs: 1 }, ta, true)).toMatch(/tidak aktif/);
    expect(alasanKrsTerkunci({ status_akademik: "aktif", boleh_krs: 0 }, ta, true)).toMatch(/Keuangan/);
    expect(alasanKrsTerkunci({ status_akademik: "aktif", boleh_krs: 1 }, ta, false)).toMatch(/periode/);
    expect(alasanKrsTerkunci({ status_akademik: "aktif", boleh_krs: 1 }, ta, true)).toBeNull();
  });

  it("bentrok jadwal: beririsan di hari sama; bersambung atau beda hari tidak", () => {
    const a = [{ hari: 1, jam_mulai: "08:00:00", jam_selesai: "10:30:00" }];
    expect(jadwalBentrok(a, [{ hari: 1, jam_mulai: "10:00:00", jam_selesai: "12:00:00" }])).toBe(true);
    expect(jadwalBentrok(a, [{ hari: 1, jam_mulai: "10:30:00", jam_selesai: "12:00:00" }])).toBe(false);
    expect(jadwalBentrok(a, [{ hari: 2, jam_mulai: "08:00:00", jam_selesai: "10:30:00" }])).toBe(false);
  });

  it("batas SKS dari IPS (BR-SD-03, tabel default)", () => {
    const tabel = [
      { ips_min: "3.00", maks_sks: 24 },
      { ips_min: "2.50", maks_sks: 21 },
      { ips_min: "2.00", maks_sks: 18 },
      { ips_min: "0.00", maks_sks: 15 },
    ];
    expect(maksSksDariIps(3, tabel)).toBe(24);
    expect(maksSksDariIps(2.99, tabel)).toBe(21);
    expect(maksSksDariIps(2.0, tabel)).toBe(18);
    expect(maksSksDariIps(1.99, tabel)).toBe(15);
  });

  const baris = (kode_ta: string, kode_mk: string, sks: number, huruf: string, bobot: number, lulus: number): BarisNilai => ({
    tahun_akademik_id: Number(kode_ta), kode_ta, tahun: "2025/2026", periode: "Ganjil", kode_mk, nama_mk: kode_mk, sks,
    nilai_huruf: huruf, bobot: bobot.toFixed(2), lulus,
  });

  it("IPS = Σ(bobot×SKS)/ΣSKS dibulatkan 2 desimal, tanpa galat float", () => {
    // (3×3.75 + 2×2.75 + 3×3.5) / 8 = 27.25 / 8 = 3.40625 → 3.41
    expect(hitungIndeks([{ sks: 3, bobot: "3.75" }, { sks: 2, bobot: "2.75" }, { sks: 3, bobot: "3.50" }]).ip).toBe(3.41);
    expect(hitungIndeks([]).ip).toBeNull();
  });

  it("mata kuliah diulang: aturan terbaik vs terakhir; SKS lulus tidak menghitung D/E", () => {
    const rows = [baris("20251", "X1", 3, "B", 3, 1), baris("20252", "X1", 3, "C", 2, 1), baris("20251", "X2", 2, "E", 0, 0)];
    expect(pilihNilaiPerMk(rows, "terbaik").find((r) => r.kode_mk === "X1")?.nilai_huruf).toBe("B");
    expect(pilihNilaiPerMk(rows, "terakhir").find((r) => r.kode_mk === "X1")?.nilai_huruf).toBe("C");
    const studi = hitungRingkasanStudi(rows, "terbaik");
    expect(studi.sksLulus).toBe(3);
    expect(studi.ipk).toBe(1.8); // (3×3 + 2×0) / 5
    expect(studi.semester.map((s) => s.ips)).toEqual([1.8, 2]);
  });

  it("syarat bayar untuk izin KRS (BR-SD-02)", () => {
    expect(memenuhiSyaratBayar({ status_tagihan: "lunas", jumlah_termin: 0, termin_lunas: 0 }, 1)).toBe(true);
    expect(memenuhiSyaratBayar({ status_tagihan: "cicilan", jumlah_termin: 6, termin_lunas: 1 }, 1)).toBe(true);
    expect(memenuhiSyaratBayar({ status_tagihan: "belum_lunas", jumlah_termin: 6, termin_lunas: 0 }, 1)).toBe(false);
    expect(memenuhiSyaratBayar({ status_tagihan: null, jumlah_termin: 0, termin_lunas: 0 }, 1)).toBe(false);
  });
});

describe("Login & role per status akademik (keputusan kampus 2026-11-16)", () => {
  it("aktif, cuti, nonaktif boleh memakai role mahasiswa; lulus & keluar tidak", async () => {
    for (const [status, harapan] of [
      ["aktif", ["mahasiswa"]],
      ["cuti", ["mahasiswa"]],
      ["nonaktif", ["mahasiswa"]],
      ["lulus", []],
      ["keluar", []],
    ] as const) {
      const { userId } = await buatMahasiswa({ semester: 3, status });
      expect(await getRoleTersedia(userId)).toEqual(harapan);
    }
  });

  it("satu pengguna dapat memiliki beberapa role, urut sesuai prioritas", async () => {
    const userId = await buatUser("kaprodi", "dosen");
    expect(await getRoleTersedia(userId)).toEqual(["dosen", "kaprodi"]);
  });
});

describe("Isi KRS (FR-AK-07)", () => {
  it("mahasiswa cuti dan yang belum diizinkan Keuangan tidak bisa menambah kelas", async () => {
    const kelas = await buatKelas("C2", senin("07:00", "08:00"));
    const cuti = await buatMahasiswa({ semester: 3, status: "cuti" });
    await expect(tambahKelasKrs(cuti.mahasiswaId, kelas)).rejects.toThrow(/cuti/);
    const belumBayar = await buatMahasiswa({ semester: 3, bolehKrs: false });
    await expect(tambahKelasKrs(belumBayar.mahasiswaId, kelas)).rejects.toThrow(/Keuangan/);
  });

  it("IPS < 2.00 → batas 15 SKS; kelas ke-6 (18 SKS) ditolak", async () => {
    const m = await buatMahasiswa({ semester: 3, nilaiLampau: { A1: "D", A2: "D" } }); // IPS 1.00
    const kelas = [];
    for (const [i, kode] of ["C2", "C3", "C4", "C5", "C6", "A2"].entries()) {
      kelas.push(await buatKelas(kode, { hari: 2, mulai: `${String(7 + i * 2).padStart(2, "0")}:00`, selesai: `${String(8 + i * 2).padStart(2, "0")}:30` }));
    }
    for (const k of kelas.slice(0, 5)) await tambahKelasKrs(m.mahasiswaId, k);
    expect((await statusKrs(m.mahasiswaId))?.maks_sks).toBe(15);
    await expect(tambahKelasKrs(m.mahasiswaId, kelas[5])).rejects.toThrow("Total 18 SKS melebihi batas 15 SKS.");
  });

  it("prasyarat belum lulus (BR-SD-04) ditolak; prasyarat lulus diterima", async () => {
    const kelasC1 = await buatKelas("C1", { hari: 3, mulai: "08:00", selesai: "10:30" });
    const gagal = await buatMahasiswa({ semester: 3, nilaiLampau: { A1: "D" } });
    await expect(tambahKelasKrs(gagal.mahasiswaId, kelasC1)).rejects.toThrow(/prasyarat/);
    const lulus = await buatMahasiswa({ semester: 3, nilaiLampau: { A1: "C" } });
    await expect(tambahKelasKrs(lulus.mahasiswaId, kelasC1)).resolves.toMatch(/ditambahkan/);
  });

  it("menolak jadwal bentrok, mata kuliah ganda, dan mata kuliah yang sudah lulus", async () => {
    const m = await buatMahasiswa({ semester: 3, nilaiLampau: { A2: "B" } });
    const c2 = await buatKelas("C2", { hari: 4, mulai: "08:00", selesai: "10:30" });
    const c3Bentrok = await buatKelas("C3", { hari: 4, mulai: "10:00", selesai: "12:00" });
    const c2Lain = await buatKelas("C2", { hari: 5, mulai: "08:00", selesai: "10:30" });
    const a2 = await buatKelas("A2", { hari: 5, mulai: "13:00", selesai: "15:30" });
    await tambahKelasKrs(m.mahasiswaId, c2);
    await expect(tambahKelasKrs(m.mahasiswaId, c3Bentrok)).rejects.toThrow(/bentrok/);
    await expect(tambahKelasKrs(m.mahasiswaId, c2Lain)).rejects.toThrow(/sudah dipilih/);
    await expect(tambahKelasKrs(m.mahasiswaId, a2)).rejects.toThrow(/sudah lulus/);
  });

  it("semester 1 hanya paket semester 1 dan harus lengkap saat diajukan", async () => {
    const m = await buatMahasiswa({ semester: 1 });
    const a1 = await buatKelas("A1", { hari: 6, mulai: "08:00", selesai: "10:30" });
    const c2 = await buatKelas("C2", { hari: 6, mulai: "13:00", selesai: "15:30" });
    await expect(tambahKelasKrs(m.mahasiswaId, c2)).rejects.toThrow(/tidak tersedia/);
    await tambahKelasKrs(m.mahasiswaId, a1);
    await expect(ajukanKrs(m.mahasiswaId, m.userId)).rejects.toThrow(/Paket semester 1 belum lengkap/);
  });
});

describe("Kuota & persetujuan (SD-S2-09, SD-S2-10)", () => {
  it("kuota 1, dua mahasiswa mengajukan bersamaan → hanya satu berhasil, kuota tidak terlampaui", async () => {
    const kelas = await buatKelas("C6", { hari: 7, mulai: "08:00", selesai: "10:30" }, 1);
    const a = await buatMahasiswa({ semester: 3 });
    const b = await buatMahasiswa({ semester: 3 });
    await tambahKelasKrs(a.mahasiswaId, kelas);
    await tambahKelasKrs(b.mahasiswaId, kelas);

    const hasil = await Promise.allSettled([ajukanKrs(a.mahasiswaId, a.userId), ajukanKrs(b.mahasiswaId, b.userId)]);
    expect(hasil.filter((h) => h.status === "fulfilled")).toHaveLength(1);
    const ditolak = hasil.find((h) => h.status === "rejected");
    expect(ditolak?.status === "rejected" && ditolak.reason).toBeInstanceOf(GagalAksi);
    expect(await terisi(kelas)).toBe(1);
  });

  it("hanya Dosen PA-nya yang bisa memutuskan; tolak wajib catatan dan melepas kuota", async () => {
    const kelas = await buatKelas("C5", { hari: 7, mulai: "13:00", selesai: "15:30" });
    const m = await buatMahasiswa({ semester: 3 });
    await tambahKelasKrs(m.mahasiswaId, kelas);
    await ajukanKrs(m.mahasiswaId, m.userId);
    const krs = (await statusKrs(m.mahasiswaId))!;
    expect(await terisi(kelas)).toBe(1);

    await expect(putuskanKrs(krs.id, d.dosenLain.dosenId, d.dosenLain.userId, "setujui", "")).rejects.toThrow("KRS tidak ditemukan.");
    await expect(putuskanKrs(krs.id, d.dosenPa.dosenId, d.dosenPa.userId, "tolak", "")).rejects.toThrow(/wajib/);

    await putuskanKrs(krs.id, d.dosenPa.dosenId, d.dosenPa.userId, "tolak", "Tambah mata kuliah wajib");
    expect(await statusKrs(m.mahasiswaId)).toMatchObject({ status: "ditolak", catatan_pa: "Tambah mata kuliah wajib" });
    expect(await terisi(kelas)).toBe(0);

    // Setelah ditolak, mahasiswa memperbaiki → kembali draf, lalu diajukan dan disetujui.
    await hapusKelasKrs(m.mahasiswaId, kelas);
    expect((await statusKrs(m.mahasiswaId))?.status).toBe("draf");
    await tambahKelasKrs(m.mahasiswaId, kelas);
    await ajukanKrs(m.mahasiswaId, m.userId);
    await putuskanKrs(krs.id, d.dosenPa.dosenId, d.dosenPa.userId, "setujui", "");
    expect((await statusKrs(m.mahasiswaId))?.status).toBe("disetujui");
    await expect(tambahKelasKrs(m.mahasiswaId, kelas)).rejects.toThrow(/sudah disetujui/);
  });

  it("membatalkan pengajuan melepas kuota dan mengembalikan ke draf", async () => {
    const kelas = await buatKelas("C4", { hari: 6, mulai: "15:30", selesai: "18:00" });
    const m = await buatMahasiswa({ semester: 3 });
    await tambahKelasKrs(m.mahasiswaId, kelas);
    await ajukanKrs(m.mahasiswaId, m.userId);
    await batalkanPengajuanKrs(m.mahasiswaId, m.userId);
    expect((await statusKrs(m.mahasiswaId))?.status).toBe("draf");
    expect(await terisi(kelas)).toBe(0);
  });
});

describe("RBAC Server Action (lolos uji akses negatif)", () => {
  it("dosen tidak bisa mengisi KRS; mahasiswa tidak bisa menyetujui KRS", async () => {
    sesi.user = { userId: d.dosenPa.userId, username: "d", email: "d@uji.test", role: "dosen", roles: ["dosen"], nama: "D" };
    const form = new FormData();
    form.set("kelas_id", "1");
    expect(await tambahKelas({}, form)).toEqual({ error: expect.stringMatching(/tidak berhak/) });

    const m = await buatMahasiswa({ semester: 3 });
    sesi.user = { userId: m.userId, username: m.nim, email: "m@uji.test", role: "mahasiswa", roles: ["mahasiswa"], nama: "M" };
    const putus = new FormData();
    putus.set("krs_id", "1");
    expect(await putuskan({}, putus)).toEqual({ error: expect.stringMatching(/tidak berhak/) });
  });
});

describe("Izin KRS oleh Keuangan (PRD 21.4, BR-SD-02)", () => {
  it("izin massal hanya membuka mahasiswa aktif yang lunas atau minimal 1 termin lunas", async () => {
    const lunas = await buatTagihan({ status: "lunas", dibayar: 1000, jumlah: 1000, tahunAkademik: "2026/2027" });
    const belum = await buatTagihan({ tahunAkademik: "2026/2027" });
    await db.execute("UPDATE mahasiswa SET boleh_krs = 0 WHERE user_id IN (?, ?)", [lunas.userId, belum.userId]);
    const admin = await buatUser("keuangan");

    await izinkanYangMemenuhiSyarat(admin);
    const [rows] = await db.query<import("mysql2").RowDataPacket[]>(
      "SELECT user_id, boleh_krs FROM mahasiswa WHERE user_id IN (?, ?) ORDER BY user_id",
      [lunas.userId, belum.userId],
    );
    expect(rows.map((r) => r.boleh_krs)).toEqual([1, 0]);
  });
});
