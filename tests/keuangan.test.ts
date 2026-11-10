import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/session";

// Di luar request Next.js tidak ada header/cookie: info klien & session dipalsukan, sisanya modul asli.
const sesi = vi.hoisted(() => ({ user: null as SessionUser | null }));
vi.mock("@/lib/session", async (asli) => ({
  ...(await asli<typeof import("@/lib/session")>()),
  getClientInfo: async () => ({ ip: null, userAgent: "vitest" }),
  getSessionUser: async () => sesi.user,
}));
vi.mock("next/cache", () => ({ refresh: () => undefined }));

import { accTermin } from "@/app/actions/keuangan";
import { db, query, queryOne } from "@/lib/db";
import { getBulanRekap, getRekapTagihan, getRingkasanPeriode, getRiwayatTagihan } from "@/lib/keuangan";
import {
  bentukCicilan,
  GagalAksi,
  gabungkanCicilan,
  koreksiTagihan,
  koreksiTermin,
  validasiAlasan,
  validasiPembayaran,
  verifikasiTagihan,
  verifikasiTermin,
  type DataPembayaran,
} from "@/lib/keuangan-aksi";
import { tutupDb } from "./support/db";
import { buatTagihan, buatUser } from "./support/keuangan";

const bayar: DataPembayaran = { tanggal: "2026-10-01", metode: "Transfer Manual", catatan: null };
let adminKeuangan: number;

type BarisTagihan = { status: string; dibayar: string; jatuh_tempo: string; no_kuitansi: string | null };
type BarisTermin = { id: number; termin_ke: number; jumlah: string; jatuh_tempo: string; status: string; no_kuitansi: string | null };

const tagihan = (id: number) =>
  queryOne<BarisTagihan>("SELECT status, dibayar, jatuh_tempo, no_kuitansi FROM tagihan WHERE id = ?", [id]);
const termin = (tagihanId: number) =>
  query<BarisTermin>(
    "SELECT id, termin_ke, jumlah, jatuh_tempo, status, no_kuitansi FROM tagihan_termin WHERE tagihan_id = ? ORDER BY termin_ke",
    [tagihanId],
  );
const auditTerakhir = (tagihanId: number) =>
  queryOne<{ aksi: string; user_id: number; data_lama: Record<string, unknown>; data_baru: Record<string, unknown>; alasan: string | null }>(
    "SELECT aksi, user_id, data_lama, data_baru, alasan FROM audit_log WHERE entitas = 'tagihan' AND entitas_id = ? ORDER BY id DESC LIMIT 1",
    [tagihanId],
  );

beforeAll(async () => {
  adminKeuangan = await buatUser("keuangan");
});
beforeEach(() => {
  sesi.user = null;
});
afterAll(tutupDb);

describe("Pembentukan cicilan (FR-KEU-08, BR-SD-13)", () => {
  it("jumlah seluruh termin sama dengan nominal; sisa pembulatan masuk termin terakhir", async () => {
    const { tagihanId } = await buatTagihan({ jumlah: 7_000_001 });
    await bentukCicilan(tagihanId, 6, "2026-09-15", adminKeuangan);

    const daftar = await termin(tagihanId);
    expect(daftar.map((t) => Number(t.jumlah))).toEqual([1_166_666, 1_166_666, 1_166_666, 1_166_666, 1_166_666, 1_166_671]);
    expect(daftar.reduce((n, t) => n + Number(t.jumlah), 0)).toBe(7_000_001);
    expect((await tagihan(tagihanId))?.jatuh_tempo).toBe("2027-02-15");
  });

  it("jatuh tempo bulan berikutnya dibatasi ke akhir bulan (PRD 6.4.1)", async () => {
    const { tagihanId } = await buatTagihan();
    await bentukCicilan(tagihanId, 3, "2027-01-31", adminKeuangan);
    expect((await termin(tagihanId)).map((t) => t.jatuh_tempo)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
  });

  it("menolak tagihan yang sudah dibayar sebagian", async () => {
    const { tagihanId } = await buatTagihan({ dibayar: 1_000_000, status: "cicilan" });
    await expect(bentukCicilan(tagihanId, 3, "2026-09-15", adminKeuangan)).rejects.toThrow(GagalAksi);
    expect(await termin(tagihanId)).toHaveLength(0);
  });

  it("menolak jumlah termin di luar batas pengaturan dan tanggal yang tidak ada", async () => {
    const { tagihanId } = await buatTagihan();
    await expect(bentukCicilan(tagihanId, 7, "2026-09-15", adminKeuangan)).rejects.toThrow("Jumlah termin harus 2–6.");
    await expect(bentukCicilan(tagihanId, 1, "2026-09-15", adminKeuangan)).rejects.toThrow(GagalAksi);
    await expect(bentukCicilan(tagihanId, 3, "2026-02-31", adminKeuangan)).rejects.toThrow(GagalAksi);
  });
});

describe("ACC termin (BR-SD-08, BR-SD-14)", () => {
  it("status & dibayar tagihan dihitung dari termin; lunas setelah semua termin di-ACC", async () => {
    const { tagihanId } = await buatTagihan({ jumlah: 3_000_000 });
    await bentukCicilan(tagihanId, 3, "2026-09-15", adminKeuangan);
    const [t1, t2, t3] = await termin(tagihanId);

    await verifikasiTermin(t1.id, bayar, adminKeuangan);
    expect(await tagihan(tagihanId)).toMatchObject({ status: "cicilan", dibayar: "1000000" });

    await verifikasiTermin(t2.id, bayar, adminKeuangan);
    await verifikasiTermin(t3.id, bayar, adminKeuangan);
    expect(await tagihan(tagihanId)).toMatchObject({ status: "lunas", dibayar: "3000000" });
    expect((await termin(tagihanId)).every((t) => t.no_kuitansi?.startsWith("KWT-20261-T"))).toBe(true);
  });

  it("ACC ganda bersamaan hanya berhasil sekali (atomik)", async () => {
    const { tagihanId } = await buatTagihan({ jumlah: 2_000_000 });
    await bentukCicilan(tagihanId, 2, "2026-09-15", adminKeuangan);
    const [t1] = await termin(tagihanId);

    const hasil = await Promise.allSettled([
      verifikasiTermin(t1.id, bayar, adminKeuangan),
      verifikasiTermin(t1.id, bayar, adminKeuangan),
    ]);
    expect(hasil.filter((h) => h.status === "fulfilled")).toHaveLength(1);
    const ditolak = hasil.find((h) => h.status === "rejected");
    expect(ditolak?.status === "rejected" && ditolak.reason).toBeInstanceOf(GagalAksi);
    expect((await tagihan(tagihanId))?.dibayar).toBe("1000000");
  });

  it("audit menyimpan pelaku, entitas, dan nilai sebelum/sesudah", async () => {
    const { tagihanId } = await buatTagihan({ jumlah: 2_000_000 });
    await bentukCicilan(tagihanId, 2, "2026-09-15", adminKeuangan);
    const [t1] = await termin(tagihanId);
    await verifikasiTermin(t1.id, bayar, adminKeuangan);

    const audit = await auditTerakhir(tagihanId);
    expect(audit).toMatchObject({ aksi: "tagihan_verifikasi", user_id: adminKeuangan });
    expect(audit?.data_lama).toMatchObject({ status: "belum_lunas", status_termin: "belum_bayar", dibayar: "0" });
    expect(audit?.data_baru).toMatchObject({ status: "cicilan", status_termin: "lunas", dibayar: "1000000" });
  });

  it("termin yang tidak ada ditolak dengan pesan, bukan error 500", async () => {
    await expect(verifikasiTermin(999_999_999, bayar, adminKeuangan)).rejects.toThrow("Termin tidak ditemukan.");
  });
});

describe("Koreksi (BR-SD-10) dan gabung cicilan (BR-SD-15)", () => {
  it("koreksi termin mencabut kuitansi, menghitung ulang tagihan, dan menyimpan alasan", async () => {
    const { tagihanId } = await buatTagihan({ jumlah: 2_000_000 });
    await bentukCicilan(tagihanId, 2, "2026-09-15", adminKeuangan);
    const [t1] = await termin(tagihanId);
    await verifikasiTermin(t1.id, bayar, adminKeuangan);

    await koreksiTermin(t1.id, "Salah input mahasiswa", adminKeuangan);
    expect((await termin(tagihanId))[0]).toMatchObject({ status: "belum_bayar", no_kuitansi: null });
    expect(await tagihan(tagihanId)).toMatchObject({ status: "belum_lunas", dibayar: "0" });
    expect(await auditTerakhir(tagihanId)).toMatchObject({ aksi: "tagihan_koreksi", alasan: "Salah input mahasiswa" });
  });

  it("alasan koreksi wajib (minimal 5 karakter)", () => {
    expect(() => validasiAlasan("ok")).toThrow(GagalAksi);
    expect(validasiAlasan("Bukti transfer palsu")).toBe("Bukti transfer palsu");
  });

  it("gabung ditolak bila sudah ada termin lunas, diizinkan bila belum", async () => {
    const { tagihanId } = await buatTagihan({ jumlah: 2_000_000, jatuhTempo: "2026-09-30" });
    await bentukCicilan(tagihanId, 2, "2026-09-15", adminKeuangan);
    const [t1] = await termin(tagihanId);
    await verifikasiTermin(t1.id, bayar, adminKeuangan);
    await expect(gabungkanCicilan(tagihanId, adminKeuangan)).rejects.toThrow(GagalAksi);

    await koreksiTermin(t1.id, "Salah pilih termin", adminKeuangan);
    await gabungkanCicilan(tagihanId, adminKeuangan);
    expect(await termin(tagihanId)).toHaveLength(0);
    expect(await tagihan(tagihanId)).toMatchObject({ status: "belum_lunas", jatuh_tempo: "2026-09-15" });
  });

  it("tagihan sekaligus: ACC sekali, ACC kedua ditolak, koreksi mengembalikan ke belum lunas", async () => {
    const { tagihanId } = await buatTagihan({ jumlah: 5_000_000 });
    await verifikasiTagihan(tagihanId, bayar, adminKeuangan);
    expect(await tagihan(tagihanId)).toMatchObject({ status: "lunas", dibayar: "5000000" });
    await expect(verifikasiTagihan(tagihanId, bayar, adminKeuangan)).rejects.toThrow("Tagihan sudah lunas.");

    await koreksiTagihan(tagihanId, "Dana belum masuk rekening", adminKeuangan);
    expect(await tagihan(tagihanId)).toMatchObject({ status: "belum_lunas", dibayar: "0", no_kuitansi: null });
  });

  it("tagihan bercicilan tidak bisa di-ACC sekaligus", async () => {
    const { tagihanId } = await buatTagihan();
    await bentukCicilan(tagihanId, 2, "2026-09-15", adminKeuangan);
    await expect(verifikasiTagihan(tagihanId, bayar, adminKeuangan)).rejects.toThrow(GagalAksi);
  });
});

describe("Validasi pembayaran", () => {
  const now = new Date("2026-11-10T10:00:00+07:00");

  it("menerima tanggal hari ini (WIB) dan metode dari pengaturan", async () => {
    await expect(
      validasiPembayaran({ tanggal: "2026-11-10", metode: "Transfer Manual", catatan: "" }, now),
    ).resolves.toEqual({ tanggal: "2026-11-10", metode: "Transfer Manual", catatan: null });
  });

  it("menolak tanggal masa depan, tanggal tidak valid, dan metode di luar daftar", async () => {
    const coba = (tanggal: string, metode = "Transfer Manual") => validasiPembayaran({ tanggal, metode, catatan: "" }, now);
    await expect(coba("2026-11-11")).rejects.toThrow("Tanggal bayar tidak boleh melewati hari ini.");
    await expect(coba("2026-13-01")).rejects.toThrow(GagalAksi);
    await expect(coba("2026-11-01", "Bitcoin")).rejects.toThrow("Pilih metode pembayaran.");
  });
});

describe("Hak akses Server Action (RBAC, anti-IDOR)", () => {
  async function kirimAcc() {
    const { tagihanId } = await buatTagihan({ jumlah: 2_000_000 });
    await bentukCicilan(tagihanId, 2, "2026-09-15", adminKeuangan);
    const [t1] = await termin(tagihanId);
    const form = new FormData();
    form.set("termin_id", String(t1.id));
    form.set("tanggal_bayar", "2026-10-01");
    form.set("metode_bayar", "Transfer Manual");
    return { tagihanId, hasil: await accTermin({}, form) };
  }

  it("mahasiswa tidak bisa ACC walau memanggil action langsung", async () => {
    sesi.user = { userId: await buatUser("mahasiswa"), username: "m", email: "m@uji.test", role: "mahasiswa", nama: "M" };
    const { tagihanId, hasil } = await kirimAcc();
    expect(hasil).toEqual({ error: "Hanya Admin Keuangan yang dapat mengubah tagihan." });
    expect((await termin(tagihanId))[0].status).toBe("belum_bayar");
  });

  it("tanpa login ditolak; Admin Keuangan berhasil", async () => {
    expect((await kirimAcc()).hasil.error).toBeDefined();

    sesi.user = { userId: adminKeuangan, username: "k", email: "k@uji.test", role: "keuangan", nama: "K" };
    const { tagihanId, hasil } = await kirimAcc();
    expect(hasil.sukses).toContain("berhasil di-ACC");
    expect((await termin(tagihanId))[0].status).toBe("lunas");
  });
});

describe("Audit log (NFR-07, S5/S6)", () => {
  it("riwayat tagihan hanya berisi aksi tagihan itu, tanpa awalan nomor tagihan", async () => {
    const a = await buatTagihan();
    const b = await buatTagihan();
    await bentukCicilan(a.tagihanId, 2, "2026-09-15", adminKeuangan);
    await bentukCicilan(b.tagihanId, 3, "2026-09-15", adminKeuangan);

    const riwayat = await getRiwayatTagihan({ id: a.tagihanId, no_tagihan: a.noTagihan });
    expect(riwayat).toHaveLength(1);
    expect(riwayat[0].uraian).toBe("Dipecah menjadi 2 termin bulanan mulai September 2026");
  });

  it("baris audit tidak dapat diubah atau dihapus", async () => {
    await expect(db.execute("UPDATE audit_log SET aksi = 'x' LIMIT 1")).rejects.toThrow("tidak boleh diubah");
    await expect(db.execute("DELETE FROM audit_log LIMIT 1")).rejects.toThrow("tidak boleh dihapus");
  });
});

describe("Rekap Admin Keuangan (S4: filter & paginasi di SQL)", () => {
  // Periode khusus test supaya tidak tercampur tagihan dari test lain.
  const periode = { tahun_akademik: "2031/2032", periode: "Ganjil" as const };
  const filter = { q: "", status: "" as const, bulan: "", halaman: 1 };

  beforeAll(async () => {
    const dasar = { tahunAkademik: periode.tahun_akademik, periode: periode.periode };
    // 52 tagihan sekaligus belum lunas, jatuh tempo 2031-09-30 (lebih dari satu halaman @50).
    for (let i = 0; i < 52; i++) await buatTagihan({ ...dasar, jumlah: 1_000_000, jatuhTempo: "2031-09-30" });
    // 1 lunas sekaligus, 1 bercicilan (Sep lunas, Okt belum).
    const lunas = await buatTagihan({ ...dasar, nama: "Zahra 100%_Lunas", jumlah: 1_000_000 });
    await verifikasiTagihan(lunas.tagihanId, bayar, adminKeuangan);
    const cicil = await buatTagihan({ ...dasar, nama: "Zidan Cicil", jumlah: 2_000_000 });
    await bentukCicilan(cicil.tagihanId, 2, "2031-09-15", adminKeuangan);
    await verifikasiTermin((await termin(cicil.tagihanId))[0].id, bayar, adminKeuangan);
  });

  it("paginasi 50 per halaman; halaman di luar jangkauan dijepit ke halaman terakhir", async () => {
    const h1 = await getRekapTagihan(periode, filter);
    expect(h1).toMatchObject({ totalBaris: 54, halaman: 1, jumlahHalaman: 2 });
    expect(h1.baris).toHaveLength(50);

    const h99 = await getRekapTagihan(periode, { ...filter, halaman: 99 });
    expect(h99.halaman).toBe(2);
    expect(h99.baris).toHaveLength(4);
  });

  it("filter status tanpa bulan memakai status tagihan", async () => {
    expect((await getRekapTagihan(periode, { ...filter, status: "lunas" })).totalBaris).toBe(1);
    expect((await getRekapTagihan(periode, { ...filter, status: "belum" })).totalBaris).toBe(53);
  });

  it("filter bulan + status memakai termin bulan itu untuk tagihan bercicilan", async () => {
    expect(await getBulanRekap(periode)).toEqual(["2031-09", "2031-10"]);
    // September: termin cicilan lunas + tagihan sekaligus yang lunas.
    const sepLunas = await getRekapTagihan(periode, { ...filter, bulan: "2031-09", status: "lunas" });
    expect(sepLunas.baris.map((b) => b.nama).sort()).toEqual(["Zahra 100%_Lunas", "Zidan Cicil"]);
    // Oktober belum bayar: hanya termin cicilan (tagihan sekaligus jatuh tempo September).
    const oktBelum = await getRekapTagihan(periode, { ...filter, bulan: "2031-10", status: "belum" });
    expect(oktBelum.baris.map((b) => b.nama)).toEqual(["Zidan Cicil"]);
    expect((await getRekapTagihan(periode, { ...filter, bulan: "2031-09", status: "belum" })).totalBaris).toBe(52);
  });

  it("pencarian memperlakukan % dan _ sebagai huruf biasa", async () => {
    expect((await getRekapTagihan(periode, { ...filter, q: "100%_" })).totalBaris).toBe(1);
    expect((await getRekapTagihan(periode, { ...filter, q: "%" })).totalBaris).toBe(1);
    expect((await getRekapTagihan(periode, { ...filter, q: "zidan" })).totalBaris).toBe(1);
  });

  it("ringkasan periode & tunggakan (BR-SD-16) dihitung di database", async () => {
    const sebelumJatuhTempo = await getRingkasanPeriode(periode, "2031-09-01");
    expect(sebelumJatuhTempo).toEqual({
      jumlahTagihan: 54,
      jumlahLunas: 1,
      total: 55_000_000,
      diterima: 2_000_000,
      tunggakan: 0,
    });
    // 16 Okt: 52 tagihan sekaligus lewat 30 Sep, termin Oktober cicilan (15 Okt) juga lewat.
    expect((await getRingkasanPeriode(periode, "2031-10-16")).tunggakan).toBe(52_000_000 + 1_000_000);
    // Jatuh tempo berlaku sampai akhir hari: pada 15 Okt termin Oktober belum menunggak.
    expect((await getRingkasanPeriode(periode, "2031-10-15")).tunggakan).toBe(52_000_000);
  });
});
