import "server-only";
import type { PoolConnection } from "mysql2/promise";
import { catatAudit, type NilaiAudit } from "@/lib/audit";
import type { Tagihan, Termin } from "@/lib/data";
import { queryDalam, withTransaction } from "@/lib/db";
import { formatBulan, formatRupiah, tanggalHariIniWib } from "@/lib/format";
import { keteranganAuditTagihan } from "@/lib/keuangan";
import { getPengaturan } from "@/lib/konfigurasi";

// Operasi Admin Keuangan pada tagihan (simulasi pembayaran manual, PRD 6.4.1). Dipisah dari Server Action
// (Guide §2.1) supaya bisa dites dan dipakai ulang oleh alur payment gateway di Sprint 4.
// Setiap operasi: satu transaksi, baris tagihan & termin dikunci (FOR UPDATE) agar ACC ganda tidak mungkin,
// dan audit + notifikasi ditulis dalam transaksi yang sama.

/** Kesalahan yang pesannya aman ditampilkan ke Admin Keuangan. */
export class GagalAksi extends Error {}

export type DataPembayaran = { tanggal: string; metode: string; catatan: string | null };

type TagihanTerkunci = Pick<
  Tagihan,
  "id" | "no_tagihan" | "tahun_akademik" | "periode" | "jenis_pembayaran" | "jumlah" | "dibayar" | "status" | "jatuh_tempo"
> & { mahasiswa_user_id: number };

type TerminTerkunci = Pick<Termin, "id" | "tagihan_id" | "termin_ke" | "jumlah" | "jatuh_tempo" | "status">;

/** true bila `nilai` berformat YYYY-MM-DD dan tanggalnya ada di kalender (menolak mis. 2026-02-31). */
function tanggalValid(nilai: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nilai)) return false;
  const tanggal = new Date(`${nilai}T00:00:00Z`);
  return !Number.isNaN(tanggal.getTime()) && tanggal.toISOString().slice(0, 10) === nilai;
}

/** Validasi tanggal bayar (tidak boleh melewati hari ini, WIB) dan metode bayar dari tabel pengaturan. */
export async function validasiPembayaran(
  input: { tanggal: string; metode: string; catatan: string },
  now = new Date(),
): Promise<DataPembayaran> {
  if (!tanggalValid(input.tanggal)) throw new GagalAksi("Tanggal bayar wajib diisi.");
  if (input.tanggal > tanggalHariIniWib(now)) throw new GagalAksi("Tanggal bayar tidak boleh melewati hari ini.");

  const { metode_bayar_manual } = await getPengaturan();
  const daftarMetode = (metode_bayar_manual ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  if (!daftarMetode.includes(input.metode)) throw new GagalAksi("Pilih metode pembayaran.");

  return { tanggal: input.tanggal, metode: input.metode, catatan: input.catatan.slice(0, 255) || null };
}

/** BR-SD-10: koreksi wajib disertai alasan. */
export function validasiAlasan(alasan: string) {
  if (alasan.length < 5) throw new GagalAksi("Alasan koreksi wajib diisi (minimal 5 karakter).");
  return alasan.slice(0, 200);
}

/** "2026/2027" + Ganjil → "20261", sama dengan pola nomor tagihan. */
function kodeNomor(t: Pick<TagihanTerkunci, "tahun_akademik" | "periode">) {
  return `${t.tahun_akademik.slice(0, 4)}${t.periode === "Ganjil" ? 1 : 2}`;
}

function labelTermin(t: Pick<TerminTerkunci, "termin_ke" | "jatuh_tempo">) {
  return `Termin ${t.termin_ke} (${formatBulan(t.jatuh_tempo)})`;
}

async function kunciTagihan(conn: PoolConnection, tagihanId: number) {
  const [tagihan] = await queryDalam<TagihanTerkunci>(
    conn,
    `SELECT t.id, t.no_tagihan, t.tahun_akademik, t.periode, t.jenis_pembayaran, t.jumlah, t.dibayar, t.status,
            t.jatuh_tempo, m.user_id AS mahasiswa_user_id
       FROM tagihan t JOIN mahasiswa m ON m.id = t.mahasiswa_id
      WHERE t.id = ? FOR UPDATE`,
    [tagihanId],
  );
  if (!tagihan) throw new GagalAksi("Tagihan tidak ditemukan.");
  return tagihan;
}

function kunciTermin(conn: PoolConnection, tagihanId: number) {
  return queryDalam<TerminTerkunci>(
    conn,
    "SELECT id, tagihan_id, termin_ke, jumlah, jatuh_tempo, status FROM tagihan_termin WHERE tagihan_id = ? ORDER BY termin_ke FOR UPDATE",
    [tagihanId],
  );
}

/** Mengunci tagihan pemilik termin lalu termin itu sendiri. */
async function kunciTerminDenganTagihan(conn: PoolConnection, terminId: number) {
  const [ref] = await queryDalam<{ tagihan_id: number }>(conn, "SELECT tagihan_id FROM tagihan_termin WHERE id = ?", [
    terminId,
  ]);
  if (!ref) throw new GagalAksi("Termin tidak ditemukan.");
  const tagihan = await kunciTagihan(conn, ref.tagihan_id);
  // Dicari ulang setelah tagihan terkunci: termin bisa saja terhapus (digabung) sebelum kunci didapat.
  const termin = (await kunciTermin(conn, tagihan.id)).find((t) => t.id === terminId);
  if (!termin) throw new GagalAksi("Termin tidak ditemukan.");
  return { tagihan, termin };
}

/** Potret status tagihan (dan satu termin) untuk kolom data_lama/data_baru di audit log. */
async function potret(conn: PoolConnection, tagihanId: number, terminId?: number): Promise<NilaiAudit> {
  const [t] = await queryDalam<NilaiAudit>(
    conn,
    `SELECT status, dibayar, jatuh_tempo, tanggal_bayar, metode_bayar, no_kuitansi,
            (SELECT COUNT(*) FROM tagihan_termin WHERE tagihan_id = tagihan.id) AS jumlah_termin
       FROM tagihan WHERE id = ?`,
    [tagihanId],
  );
  if (terminId === undefined) return t ?? {};
  const [tt] = await queryDalam<NilaiAudit>(
    conn,
    `SELECT termin_ke, status AS status_termin, tanggal_bayar AS tanggal_bayar_termin,
            metode_bayar AS metode_bayar_termin, no_kuitansi AS no_kuitansi_termin
       FROM tagihan_termin WHERE id = ?`,
    [terminId],
  );
  return { ...t, ...tt };
}

/** BR-SD-14: dibayar & status tagihan bercicilan selalu dihitung ulang dari termin-terminnya. */
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

async function kabariMahasiswa(conn: PoolConnection, userId: number, judul: string, pesan: string, aktivitas?: string) {
  await conn.execute(
    "INSERT INTO notifikasi (user_id, judul, pesan, tipe, tautan) VALUES (?, ?, ?, 'info', '/keuangan')",
    [userId, judul.slice(0, 160), pesan.slice(0, 255)],
  );
  if (aktivitas) {
    await conn.execute("INSERT INTO aktivitas (user_id, judul, ikon) VALUES (?, ?, 'bayar')", [userId, aktivitas.slice(0, 160)]);
  }
}

/** ACC satu termin cicilan sebagai lunas (verifikasi manual, BR-SD-08). */
export function verifikasiTermin(terminId: number, bayar: DataPembayaran, oleh: number) {
  return withTransaction(async (conn) => {
    const { tagihan, termin } = await kunciTerminDenganTagihan(conn, terminId);
    if (termin.status === "lunas") throw new GagalAksi(`${labelTermin(termin)} sudah lunas.`);
    const dataLama = await potret(conn, tagihan.id, termin.id);

    await conn.execute(
      `UPDATE tagihan_termin
          SET status = 'lunas', tanggal_bayar = TIMESTAMP(?, CURTIME()), metode_bayar = ?, no_kuitansi = ?,
              diverifikasi_oleh = ?, diverifikasi_at = NOW(), catatan = ?
        WHERE id = ?`,
      [bayar.tanggal, bayar.metode, `KWT-${kodeNomor(tagihan)}-T${String(termin.id).padStart(5, "0")}`, oleh, bayar.catatan, termin.id],
    );
    await sinkronTagihan(conn, tagihan.id);

    const uraian = `${labelTermin(termin)} di-ACC lunas · ${bayar.metode}${bayar.catatan ? ` · ${bayar.catatan}` : ""}`;
    await catatAudit(oleh, "tagihan_verifikasi", keteranganAuditTagihan(tagihan.no_tagihan, uraian), conn, {
      entitas: "tagihan",
      entitasId: tagihan.id,
      dataLama,
      dataBaru: await potret(conn, tagihan.id, termin.id),
    });
    await kabariMahasiswa(
      conn,
      tagihan.mahasiswa_user_id,
      `Pembayaran Cicilan ${formatBulan(termin.jatuh_tempo)} Diverifikasi`,
      `${labelTermin(termin)} sebesar ${formatRupiah(termin.jumlah)} telah dinyatakan lunas oleh Bagian Keuangan.`,
      `Pembayaran Cicilan UKT ${formatBulan(termin.jatuh_tempo)}`,
    );
    return `${labelTermin(termin)} berhasil di-ACC lunas.`;
  });
}

/** Membatalkan status lunas satu termin; nomor kuitansi dicabut (koreksi, BR-SD-10). */
export function koreksiTermin(terminId: number, alasan: string, oleh: number) {
  return withTransaction(async (conn) => {
    const { tagihan, termin } = await kunciTerminDenganTagihan(conn, terminId);
    if (termin.status !== "lunas") throw new GagalAksi(`${labelTermin(termin)} belum dibayar.`);
    const dataLama = await potret(conn, tagihan.id, termin.id);

    await conn.execute(
      `UPDATE tagihan_termin
          SET status = 'belum_bayar', tanggal_bayar = NULL, metode_bayar = NULL, no_kuitansi = NULL,
              diverifikasi_oleh = NULL, diverifikasi_at = NULL, catatan = ?
        WHERE id = ?`,
      [`Dibatalkan: ${alasan}`, termin.id],
    );
    await sinkronTagihan(conn, tagihan.id);

    await catatAudit(
      oleh,
      "tagihan_koreksi",
      keteranganAuditTagihan(tagihan.no_tagihan, `${labelTermin(termin)} dibatalkan menjadi belum bayar · ${alasan}`),
      conn,
      { entitas: "tagihan", entitasId: tagihan.id, dataLama, dataBaru: await potret(conn, tagihan.id, termin.id), alasan },
    );
    await kabariMahasiswa(
      conn,
      tagihan.mahasiswa_user_id,
      `Koreksi Pembayaran Cicilan ${formatBulan(termin.jatuh_tempo)}`,
      `Status ${labelTermin(termin)} dikoreksi menjadi belum bayar. Alasan: ${alasan}`,
    );
    return `${labelTermin(termin)} dikembalikan menjadi belum bayar.`;
  });
}

/** ACC tagihan yang dibayar sekaligus (tanpa cicilan, BR-SD-08). */
export function verifikasiTagihan(tagihanId: number, bayar: DataPembayaran, oleh: number) {
  return withTransaction(async (conn) => {
    const tagihan = await kunciTagihan(conn, tagihanId);
    if ((await kunciTermin(conn, tagihan.id)).length > 0) {
      throw new GagalAksi("Tagihan ini dicicil; verifikasi dilakukan per termin.");
    }
    if (tagihan.status === "lunas") throw new GagalAksi("Tagihan sudah lunas.");
    const dataLama = await potret(conn, tagihan.id);

    await conn.execute(
      `UPDATE tagihan
          SET status = 'lunas', dibayar = jumlah, tanggal_bayar = TIMESTAMP(?, CURTIME()), metode_bayar = ?,
              no_kuitansi = ?
        WHERE id = ?`,
      [bayar.tanggal, bayar.metode, `KWT-${kodeNomor(tagihan)}-P${String(tagihan.id).padStart(5, "0")}`, tagihan.id],
    );

    const uraian = `Pembayaran sekaligus di-ACC lunas · ${bayar.metode}${bayar.catatan ? ` · ${bayar.catatan}` : ""}`;
    await catatAudit(oleh, "tagihan_verifikasi", keteranganAuditTagihan(tagihan.no_tagihan, uraian), conn, {
      entitas: "tagihan",
      entitasId: tagihan.id,
      dataLama,
      dataBaru: await potret(conn, tagihan.id),
    });
    await kabariMahasiswa(
      conn,
      tagihan.mahasiswa_user_id,
      "Pembayaran Tagihan Diverifikasi",
      `${tagihan.jenis_pembayaran} ${tagihan.periode} ${tagihan.tahun_akademik} sebesar ${formatRupiah(tagihan.jumlah)} telah lunas.`,
      `Pembayaran ${tagihan.jenis_pembayaran} ${tagihan.periode} ${tagihan.tahun_akademik}`,
    );
    return "Tagihan berhasil di-ACC lunas.";
  });
}

/** Membatalkan status lunas tagihan bayar sekaligus dengan alasan wajib (BR-SD-10). */
export function koreksiTagihan(tagihanId: number, alasan: string, oleh: number) {
  return withTransaction(async (conn) => {
    const tagihan = await kunciTagihan(conn, tagihanId);
    if ((await kunciTermin(conn, tagihan.id)).length > 0) {
      throw new GagalAksi("Tagihan ini dicicil; koreksi dilakukan per termin.");
    }
    if (tagihan.status !== "lunas") throw new GagalAksi("Tagihan belum lunas.");
    const dataLama = await potret(conn, tagihan.id);

    await conn.execute(
      `UPDATE tagihan
          SET status = 'belum_lunas', dibayar = 0, tanggal_bayar = NULL, metode_bayar = NULL, no_kuitansi = NULL
        WHERE id = ?`,
      [tagihan.id],
    );
    await catatAudit(
      oleh,
      "tagihan_koreksi",
      keteranganAuditTagihan(tagihan.no_tagihan, `Status lunas dibatalkan · ${alasan}`),
      conn,
      { entitas: "tagihan", entitasId: tagihan.id, dataLama, dataBaru: await potret(conn, tagihan.id), alasan },
    );
    await kabariMahasiswa(
      conn,
      tagihan.mahasiswa_user_id,
      "Koreksi Pembayaran Tagihan",
      `Status ${tagihan.jenis_pembayaran} ${tagihan.periode} ${tagihan.tahun_akademik} dikoreksi menjadi belum lunas. Alasan: ${alasan}`,
    );
    return "Status lunas dibatalkan.";
  });
}

/** Memecah tagihan menjadi cicilan bulanan (FR-KEU-08, BR-SD-13). */
export async function bentukCicilan(tagihanId: number, jumlahTermin: number, mulai: string, oleh: number) {
  const maks = Number((await getPengaturan()).cicilan_maks_termin);
  if (!Number.isInteger(maks) || maks < 2) {
    throw new GagalAksi('Pengaturan "cicilan_maks_termin" belum diisi dengan angka ≥ 2.');
  }
  if (!Number.isInteger(jumlahTermin) || jumlahTermin < 2 || jumlahTermin > maks) {
    throw new GagalAksi(`Jumlah termin harus 2–${maks}.`);
  }
  if (!tanggalValid(mulai)) throw new GagalAksi("Jatuh tempo termin pertama wajib diisi.");

  return withTransaction(async (conn) => {
    const tagihan = await kunciTagihan(conn, tagihanId);
    if ((await kunciTermin(conn, tagihan.id)).length > 0) throw new GagalAksi("Tagihan ini sudah dicicil.");
    // BR-SD-13: cicilan hanya untuk tagihan yang belum dibayar sama sekali.
    if (tagihan.status !== "belum_lunas" || Number(tagihan.dibayar) > 0) {
      throw new GagalAksi("Hanya tagihan yang belum dibayar sama sekali yang dapat dicicil.");
    }
    const dataLama = await potret(conn, tagihan.id);

    // BR-SD-13: jumlah seluruh termin = nominal tagihan. Nominal dibulatkan ke bawah; sisa ke termin terakhir.
    // Tanggal bulan berikutnya dibatasi ke akhir bulan oleh DATE_ADD (PRD 6.4.1).
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
      oleh,
      "tagihan_cicilan",
      keteranganAuditTagihan(tagihan.no_tagihan, `Dipecah menjadi ${jumlahTermin} termin bulanan mulai ${formatBulan(mulai)}`),
      conn,
      { entitas: "tagihan", entitasId: tagihan.id, dataLama, dataBaru: await potret(conn, tagihan.id) },
    );
    await kabariMahasiswa(
      conn,
      tagihan.mahasiswa_user_id,
      "Tagihan Dapat Dicicil",
      `${tagihan.jenis_pembayaran} ${tagihan.periode} ${tagihan.tahun_akademik} dibagi menjadi ${jumlahTermin} cicilan bulanan mulai ${formatBulan(mulai)}.`,
    );
    return `Tagihan dipecah menjadi ${jumlahTermin} termin bulanan.`;
  });
}

/** Menggabungkan kembali cicilan menjadi bayar sekaligus, hanya bila belum ada termin yang lunas (BR-SD-15). */
export function gabungkanCicilan(tagihanId: number, oleh: number) {
  return withTransaction(async (conn) => {
    const tagihan = await kunciTagihan(conn, tagihanId);
    const termin = await kunciTermin(conn, tagihan.id);
    if (termin.length === 0) throw new GagalAksi("Tagihan ini tidak dicicil.");
    if (termin.some((t) => t.status === "lunas")) {
      throw new GagalAksi("Sudah ada termin yang dibayar; batalkan dulu termin tersebut bila memang perlu dikoreksi.");
    }
    const dataLama = await potret(conn, tagihan.id);

    await conn.execute("DELETE FROM tagihan_termin WHERE tagihan_id = ?", [tagihan.id]);
    await conn.execute(
      "UPDATE tagihan SET jatuh_tempo = ?, dibayar = 0, status = 'belum_lunas', tanggal_bayar = NULL, metode_bayar = NULL WHERE id = ?",
      [termin[0].jatuh_tempo, tagihan.id],
    );
    await catatAudit(
      oleh,
      "tagihan_cicilan",
      keteranganAuditTagihan(tagihan.no_tagihan, "Cicilan digabung kembali menjadi bayar sekaligus"),
      conn,
      { entitas: "tagihan", entitasId: tagihan.id, dataLama, dataBaru: await potret(conn, tagihan.id) },
    );
    return "Cicilan digabung kembali menjadi bayar sekaligus.";
  });
}
