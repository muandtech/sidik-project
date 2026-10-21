"use server";

import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { refresh } from "next/cache";
import { catatAudit } from "@/lib/audit";
import { withTransaction } from "@/lib/db";
import { formatBulan, formatRupiah, tanggalHariIniWib } from "@/lib/format";
import { keteranganAuditTagihan } from "@/lib/keuangan";
import { getPengaturan } from "@/lib/konfigurasi";
import { getSessionUser } from "@/lib/session";

export type AksiState = { error?: string; sukses?: string };

/** Kesalahan yang pesannya aman ditampilkan ke Admin Keuangan. */
class GagalAksi extends Error {}

type TagihanRow = RowDataPacket & {
  id: number;
  no_tagihan: string;
  tahun_akademik: string;
  periode: "Ganjil" | "Genap";
  jenis_pembayaran: string;
  jumlah: string;
  dibayar: string;
  status: "lunas" | "belum_lunas" | "cicilan";
  jatuh_tempo: string;
  mahasiswa_user_id: number;
};

type TerminRow = RowDataPacket & {
  id: number;
  tagihan_id: number;
  termin_ke: number;
  jumlah: string;
  jatuh_tempo: string;
  status: "belum_bayar" | "lunas";
};

// Server action dapat dipanggil lewat POST langsung, jadi hak akses selalu diperiksa di sini.
async function requireKeuangan() {
  const user = await getSessionUser();
  if (!user || user.role !== "keuangan") throw new Error("Hanya Admin Keuangan yang dapat mengubah tagihan.");
  return user;
}

async function jalankan(aksi: () => Promise<string>): Promise<AksiState> {
  try {
    const sukses = await aksi();
    refresh();
    return { sukses };
  } catch (error) {
    if (error instanceof GagalAksi) return { error: error.message };
    throw error;
  }
}

function idDari(formData: FormData, key: string) {
  const id = Number(formData.get(key));
  if (!Number.isInteger(id) || id <= 0) throw new GagalAksi("Data tidak valid. Muat ulang halaman lalu coba lagi.");
  return id;
}

function teks(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/** Validasi tanggal bayar (YYYY-MM-DD) dan metode bayar dari daftar di tabel pengaturan. */
async function bacaPembayaran(formData: FormData) {
  const tanggal = teks(formData, "tanggal_bayar");
  const metode = teks(formData, "metode_bayar");
  const catatan = teks(formData, "catatan").slice(0, 255) || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || Number.isNaN(Date.parse(tanggal))) {
    throw new GagalAksi("Tanggal bayar wajib diisi.");
  }
  if (tanggal > tanggalHariIniWib()) throw new GagalAksi("Tanggal bayar tidak boleh melewati hari ini.");

  const { metode_bayar_manual } = await getPengaturan();
  const daftarMetode = (metode_bayar_manual ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  if (!daftarMetode.includes(metode)) throw new GagalAksi("Pilih metode pembayaran.");

  return { tanggal, metode, catatan };
}

function bacaAlasan(formData: FormData) {
  const alasan = teks(formData, "alasan");
  if (alasan.length < 5) throw new GagalAksi("Alasan koreksi wajib diisi (minimal 5 karakter).");
  return alasan.slice(0, 200);
}

/** "2026/2027" + Ganjil → "20261", sama dengan pola nomor tagihan. */
function kodeNomor(t: Pick<TagihanRow, "tahun_akademik" | "periode">) {
  return `${t.tahun_akademik.slice(0, 4)}${t.periode === "Ganjil" ? 1 : 2}`;
}

async function kunciTagihan(conn: PoolConnection, tagihanId: number) {
  const [rows] = await conn.query<TagihanRow[]>(
    `SELECT t.id, t.no_tagihan, t.tahun_akademik, t.periode, t.jenis_pembayaran, t.jumlah, t.dibayar, t.status,
            t.jatuh_tempo, m.user_id AS mahasiswa_user_id
       FROM tagihan t JOIN mahasiswa m ON m.id = t.mahasiswa_id
      WHERE t.id = ? FOR UPDATE`,
    [tagihanId],
  );
  if (!rows[0]) throw new GagalAksi("Tagihan tidak ditemukan.");
  return rows[0];
}

async function kunciTermin(conn: PoolConnection, tagihanId: number) {
  const [rows] = await conn.query<TerminRow[]>(
    "SELECT id, tagihan_id, termin_ke, jumlah, jatuh_tempo, status FROM tagihan_termin WHERE tagihan_id = ? ORDER BY termin_ke FOR UPDATE",
    [tagihanId],
  );
  return rows;
}

/** Hitung ulang dibayar/status tagihan bercicilan dari termin-terminnya. */
async function sinkronTagihan(conn: PoolConnection, tagihanId: number) {
  await conn.execute(
    `UPDATE tagihan t
       JOIN (SELECT tagihan_id, SUM(IF(status = 'lunas', jumlah, 0)) AS dibayar, MAX(tanggal_bayar) AS terakhir
               FROM tagihan_termin WHERE tagihan_id = ? GROUP BY tagihan_id) x ON x.tagihan_id = t.id
        SET t.dibayar = x.dibayar,
            t.status = CASE WHEN x.dibayar >= t.jumlah THEN 'lunas' WHEN x.dibayar > 0 THEN 'cicilan' ELSE 'belum_lunas' END,
            t.tanggal_bayar = IF(x.dibayar >= t.jumlah, x.terakhir, NULL),
            t.metode_bayar = IF(x.dibayar >= t.jumlah, 'Cicilan', NULL)`,
    [tagihanId],
  );
}

async function kabariMahasiswa(
  conn: PoolConnection,
  userId: number,
  judul: string,
  pesan: string,
  aktivitas?: string,
) {
  await conn.execute(
    "INSERT INTO notifikasi (user_id, judul, pesan, tipe, tautan) VALUES (?, ?, ?, 'info', '/keuangan')",
    [userId, judul.slice(0, 160), pesan.slice(0, 255)],
  );
  if (aktivitas) {
    await conn.execute("INSERT INTO aktivitas (user_id, judul, ikon) VALUES (?, ?, 'bayar')", [
      userId,
      aktivitas.slice(0, 160),
    ]);
  }
}

function labelTermin(t: Pick<TerminRow, "termin_ke" | "jatuh_tempo">) {
  return `Termin ${t.termin_ke} (${formatBulan(t.jatuh_tempo)})`;
}

/** ACC satu termin cicilan bulanan sebagai lunas (verifikasi manual, BR-SD-08). */
export async function accTermin(_prev: AksiState, formData: FormData): Promise<AksiState> {
  const user = await requireKeuangan();
  return jalankan(async () => {
    const terminId = idDari(formData, "termin_id");
    const { tanggal, metode, catatan } = await bacaPembayaran(formData);

    return withTransaction(async (conn) => {
      const [[ref]] = await conn.query<(RowDataPacket & { tagihan_id: number })[]>(
        "SELECT tagihan_id FROM tagihan_termin WHERE id = ?",
        [terminId],
      );
      if (!ref) throw new GagalAksi("Termin tidak ditemukan.");
      const tagihan = await kunciTagihan(conn, ref.tagihan_id);
      const termin = (await kunciTermin(conn, tagihan.id)).find((t) => t.id === terminId)!;
      if (termin.status === "lunas") throw new GagalAksi(`${labelTermin(termin)} sudah lunas.`);

      await conn.execute(
        `UPDATE tagihan_termin
            SET status = 'lunas', tanggal_bayar = TIMESTAMP(?, CURTIME()), metode_bayar = ?, no_kuitansi = ?,
                diverifikasi_oleh = ?, diverifikasi_at = NOW(), catatan = ?
          WHERE id = ?`,
        [tanggal, metode, `KWT-${kodeNomor(tagihan)}-T${String(termin.id).padStart(5, "0")}`, user.userId, catatan, termin.id],
      );
      await sinkronTagihan(conn, tagihan.id);

      const uraian = `${labelTermin(termin)} di-ACC lunas · ${metode}${catatan ? ` · ${catatan}` : ""}`;
      await catatAudit(user.userId, "tagihan_verifikasi", keteranganAuditTagihan(tagihan.no_tagihan, uraian), conn);
      await kabariMahasiswa(
        conn,
        tagihan.mahasiswa_user_id,
        `Pembayaran Cicilan ${formatBulan(termin.jatuh_tempo)} Diverifikasi`,
        `${labelTermin(termin)} sebesar ${formatRupiah(termin.jumlah)} telah dinyatakan lunas oleh Bagian Keuangan.`,
        `Pembayaran Cicilan UKT ${formatBulan(termin.jatuh_tempo)}`,
      );
      return `${labelTermin(termin)} berhasil di-ACC lunas.`;
    });
  });
}

/** Membatalkan status lunas satu termin dengan alasan wajib (koreksi, BR-SD-10). */
export async function batalkanTermin(_prev: AksiState, formData: FormData): Promise<AksiState> {
  const user = await requireKeuangan();
  return jalankan(async () => {
    const terminId = idDari(formData, "termin_id");
    const alasan = bacaAlasan(formData);

    return withTransaction(async (conn) => {
      const [[ref]] = await conn.query<(RowDataPacket & { tagihan_id: number })[]>(
        "SELECT tagihan_id FROM tagihan_termin WHERE id = ?",
        [terminId],
      );
      if (!ref) throw new GagalAksi("Termin tidak ditemukan.");
      const tagihan = await kunciTagihan(conn, ref.tagihan_id);
      const termin = (await kunciTermin(conn, tagihan.id)).find((t) => t.id === terminId)!;
      if (termin.status !== "lunas") throw new GagalAksi(`${labelTermin(termin)} belum dibayar.`);

      await conn.execute(
        `UPDATE tagihan_termin
            SET status = 'belum_bayar', tanggal_bayar = NULL, metode_bayar = NULL, no_kuitansi = NULL,
                diverifikasi_oleh = NULL, diverifikasi_at = NULL, catatan = ?
          WHERE id = ?`,
        [`Dibatalkan: ${alasan}`, termin.id],
      );
      await sinkronTagihan(conn, tagihan.id);

      await catatAudit(
        user.userId,
        "tagihan_koreksi",
        keteranganAuditTagihan(tagihan.no_tagihan, `${labelTermin(termin)} dibatalkan menjadi belum bayar · ${alasan}`),
        conn,
      );
      await kabariMahasiswa(
        conn,
        tagihan.mahasiswa_user_id,
        `Koreksi Pembayaran Cicilan ${formatBulan(termin.jatuh_tempo)}`,
        `Status ${labelTermin(termin)} dikoreksi menjadi belum bayar. Alasan: ${alasan}`,
      );
      return `${labelTermin(termin)} dikembalikan menjadi belum bayar.`;
    });
  });
}

/** ACC tagihan yang dibayar sekaligus (tanpa cicilan). */
export async function accTagihan(_prev: AksiState, formData: FormData): Promise<AksiState> {
  const user = await requireKeuangan();
  return jalankan(async () => {
    const tagihanId = idDari(formData, "tagihan_id");
    const { tanggal, metode, catatan } = await bacaPembayaran(formData);

    return withTransaction(async (conn) => {
      const tagihan = await kunciTagihan(conn, tagihanId);
      if ((await kunciTermin(conn, tagihan.id)).length > 0) {
        throw new GagalAksi("Tagihan ini dicicil; verifikasi dilakukan per termin.");
      }
      if (tagihan.status === "lunas") throw new GagalAksi("Tagihan sudah lunas.");

      await conn.execute(
        `UPDATE tagihan
            SET status = 'lunas', dibayar = jumlah, tanggal_bayar = TIMESTAMP(?, CURTIME()), metode_bayar = ?,
                no_kuitansi = ?
          WHERE id = ?`,
        [tanggal, metode, `KWT-${kodeNomor(tagihan)}-P${String(tagihan.id).padStart(5, "0")}`, tagihan.id],
      );

      const uraian = `Pembayaran sekaligus di-ACC lunas · ${metode}${catatan ? ` · ${catatan}` : ""}`;
      await catatAudit(user.userId, "tagihan_verifikasi", keteranganAuditTagihan(tagihan.no_tagihan, uraian), conn);
      await kabariMahasiswa(
        conn,
        tagihan.mahasiswa_user_id,
        "Pembayaran Tagihan Diverifikasi",
        `${tagihan.jenis_pembayaran} ${tagihan.periode} ${tagihan.tahun_akademik} sebesar ${formatRupiah(tagihan.jumlah)} telah lunas.`,
        `Pembayaran ${tagihan.jenis_pembayaran} ${tagihan.periode} ${tagihan.tahun_akademik}`,
      );
      return "Tagihan berhasil di-ACC lunas.";
    });
  });
}

/** Membatalkan status lunas tagihan bayar sekaligus dengan alasan wajib. */
export async function batalkanTagihan(_prev: AksiState, formData: FormData): Promise<AksiState> {
  const user = await requireKeuangan();
  return jalankan(async () => {
    const tagihanId = idDari(formData, "tagihan_id");
    const alasan = bacaAlasan(formData);

    return withTransaction(async (conn) => {
      const tagihan = await kunciTagihan(conn, tagihanId);
      if ((await kunciTermin(conn, tagihan.id)).length > 0) {
        throw new GagalAksi("Tagihan ini dicicil; koreksi dilakukan per termin.");
      }
      if (tagihan.status !== "lunas") throw new GagalAksi("Tagihan belum lunas.");

      await conn.execute(
        `UPDATE tagihan
            SET status = 'belum_lunas', dibayar = 0, tanggal_bayar = NULL, metode_bayar = NULL, no_kuitansi = NULL
          WHERE id = ?`,
        [tagihan.id],
      );
      await catatAudit(
        user.userId,
        "tagihan_koreksi",
        keteranganAuditTagihan(tagihan.no_tagihan, `Status lunas dibatalkan · ${alasan}`),
        conn,
      );
      await kabariMahasiswa(
        conn,
        tagihan.mahasiswa_user_id,
        "Koreksi Pembayaran Tagihan",
        `Status ${tagihan.jenis_pembayaran} ${tagihan.periode} ${tagihan.tahun_akademik} dikoreksi menjadi belum lunas. Alasan: ${alasan}`,
      );
      return "Status lunas dibatalkan.";
    });
  });
}

/** Memecah tagihan yang belum dibayar menjadi cicilan bulanan (FR-KEU-08). */
export async function pecahCicilan(_prev: AksiState, formData: FormData): Promise<AksiState> {
  const user = await requireKeuangan();
  return jalankan(async () => {
    const tagihanId = idDari(formData, "tagihan_id");
    const jumlahTermin = Number(formData.get("jumlah_termin"));
    const mulai = teks(formData, "mulai");
    const maks = Number((await getPengaturan()).cicilan_maks_termin);

    if (!Number.isInteger(maks) || maks < 2) {
      throw new GagalAksi('Pengaturan "cicilan_maks_termin" belum diisi dengan angka ≥ 2.');
    }
    if (!Number.isInteger(jumlahTermin) || jumlahTermin < 2 || jumlahTermin > maks) {
      throw new GagalAksi(`Jumlah termin harus 2–${maks}.`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(mulai) || Number.isNaN(Date.parse(mulai))) {
      throw new GagalAksi("Jatuh tempo termin pertama wajib diisi.");
    }

    return withTransaction(async (conn) => {
      const tagihan = await kunciTagihan(conn, tagihanId);
      if ((await kunciTermin(conn, tagihan.id)).length > 0) throw new GagalAksi("Tagihan ini sudah dicicil.");
      if (tagihan.status !== "belum_lunas" || Number(tagihan.dibayar) > 0) {
        throw new GagalAksi("Hanya tagihan yang belum dibayar sama sekali yang dapat dicicil.");
      }

      // Nominal dibulatkan ke bawah; sisa pembulatan ditambahkan ke termin terakhir.
      const total = Number(tagihan.jumlah);
      const perTermin = Math.floor(total / jumlahTermin);
      for (let k = 1; k <= jumlahTermin; k++) {
        const jumlah = k === jumlahTermin ? total - perTermin * (jumlahTermin - 1) : perTermin;
        await conn.execute(
          `INSERT INTO tagihan_termin (tagihan_id, termin_ke, jumlah, jatuh_tempo)
           VALUES (?, ?, ?, DATE_ADD(?, INTERVAL ? MONTH))`,
          [tagihan.id, k, jumlah, mulai, k - 1],
        );
      }
      // Jatuh tempo tagihan = termin terakhir.
      await conn.execute("UPDATE tagihan SET jatuh_tempo = DATE_ADD(?, INTERVAL ? MONTH) WHERE id = ?", [
        mulai,
        jumlahTermin - 1,
        tagihan.id,
      ]);

      await catatAudit(
        user.userId,
        "tagihan_cicilan",
        keteranganAuditTagihan(tagihan.no_tagihan, `Dipecah menjadi ${jumlahTermin} termin bulanan mulai ${formatBulan(mulai)}`),
        conn,
      );
      await kabariMahasiswa(
        conn,
        tagihan.mahasiswa_user_id,
        "Tagihan Dapat Dicicil",
        `${tagihan.jenis_pembayaran} ${tagihan.periode} ${tagihan.tahun_akademik} dibagi menjadi ${jumlahTermin} cicilan bulanan mulai ${formatBulan(mulai)}.`,
      );
      return `Tagihan dipecah menjadi ${jumlahTermin} termin bulanan.`;
    });
  });
}

/** Menggabungkan kembali cicilan menjadi bayar sekaligus; hanya bila belum ada termin yang dibayar (BR-SD-10). */
export async function gabungCicilan(_prev: AksiState, formData: FormData): Promise<AksiState> {
  const user = await requireKeuangan();
  return jalankan(async () => {
    const tagihanId = idDari(formData, "tagihan_id");

    return withTransaction(async (conn) => {
      const tagihan = await kunciTagihan(conn, tagihanId);
      const termin = await kunciTermin(conn, tagihan.id);
      if (termin.length === 0) throw new GagalAksi("Tagihan ini tidak dicicil.");
      if (termin.some((t) => t.status === "lunas")) {
        throw new GagalAksi("Sudah ada termin yang dibayar; batalkan dulu termin tersebut bila memang perlu dikoreksi.");
      }

      await conn.execute("DELETE FROM tagihan_termin WHERE tagihan_id = ?", [tagihan.id]);
      await conn.execute(
        "UPDATE tagihan SET jatuh_tempo = ?, dibayar = 0, status = 'belum_lunas', tanggal_bayar = NULL, metode_bayar = NULL WHERE id = ?",
        [termin[0].jatuh_tempo, tagihan.id],
      );
      await catatAudit(
        user.userId,
        "tagihan_cicilan",
        keteranganAuditTagihan(tagihan.no_tagihan, "Cicilan digabung kembali menjadi bayar sekaligus"),
        conn,
      );
      return "Cicilan digabung kembali menjadi bayar sekaligus.";
    });
  });
}
