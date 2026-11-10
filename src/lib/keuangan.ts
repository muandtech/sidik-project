import "server-only";
import { query, queryOne } from "@/lib/db";
import { TERMIN_SELECT, type Tagihan, type Termin } from "@/lib/data";

// Query untuk modul Admin Keuangan (melihat tagihan seluruh mahasiswa).

export type PeriodeTagihan = { tahun_akademik: string; periode: Tagihan["periode"] };

/** Kode periode untuk URL & nomor dokumen, mis. "2026/2027-Ganjil". */
export function kodePeriode(p: PeriodeTagihan) {
  return `${p.tahun_akademik}-${p.periode}`;
}

/** Periode yang punya tagihan, terbaru lebih dulu. */
export function getPeriodeTagihan() {
  return query<PeriodeTagihan>(
    `SELECT DISTINCT tahun_akademik, periode FROM tagihan
      ORDER BY tahun_akademik DESC, FIELD(periode, 'Genap', 'Ganjil')`,
  );
}

export type TagihanMahasiswa = Tagihan & {
  mahasiswa_id: number;
  mahasiswa_user_id: number;
  nim: string;
  nama: string;
  prodi: string;
  jenjang: string;
  semester: number;
};

const TAGIHAN_MAHASISWA_SELECT = `SELECT t.id, t.no_tagihan, t.semester_ke, t.periode, t.tahun_akademik, t.jenis_pembayaran,
         t.jumlah, t.dibayar, t.status, t.jatuh_tempo, t.tanggal_bayar, t.metode_bayar, t.no_kuitansi,
         (SELECT COUNT(*) FROM tagihan_termin tt WHERE tt.tagihan_id = t.id) AS jumlah_termin,
         m.id AS mahasiswa_id, m.user_id AS mahasiswa_user_id, m.nim, m.nama, m.semester,
         p.nama AS prodi, p.jenjang
    FROM tagihan t
    JOIN mahasiswa m ON m.id = t.mahasiswa_id
    JOIN prodi p ON p.id = m.prodi_id`;

export type RekapBaris = TagihanMahasiswa & { termin: Termin[] };

/** Jumlah baris rekap per halaman (Guide §4.2 B: daftar besar wajib dipaginasi). */
export const REKAP_PER_HALAMAN = 50;

export type FilterRekap = {
  /** Potongan nama atau NIM. */
  q: string;
  /** "lunas" = sudah bayar, "belum" = belum bayar, "" = semua. */
  status: "" | "lunas" | "belum";
  /** Bulan "YYYY-MM"; bersama `status` menjawab "siapa yang sudah/belum bayar bulan X" (PRD 6.4.1). */
  bulan: string;
  /** Mulai dari 1. */
  halaman: number;
};

const ADA_TERMIN = "EXISTS (SELECT 1 FROM tagihan_termin x WHERE x.tagihan_id = t.id)";

/** Kondisi WHERE untuk filter rekap. Potongan SQL di sini konstan; nilai dari pengguna selalu lewat parameter. */
function kondisiRekap(periode: PeriodeTagihan, filter: Omit<FilterRekap, "halaman">) {
  const kondisi = ["t.tahun_akademik = ?", "t.periode = ?"];
  const params: unknown[] = [periode.tahun_akademik, periode.periode];

  if (filter.q) {
    // Karakter wildcard LIKE (\ % _) di input dianggap huruf biasa.
    const pola = `%${filter.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    kondisi.push("(m.nama LIKE ? OR m.nim LIKE ?)");
    params.push(pola, pola);
  }

  if (filter.status && !filter.bulan) {
    kondisi.push(filter.status === "lunas" ? "t.status = 'lunas'" : "t.status <> 'lunas'");
  } else if (filter.status && filter.bulan) {
    // Tagihan bercicilan dinilai dari termin bulan itu; tagihan sekaligus dari status tagihannya
    // (sama dengan tampilan kolom bulan di halaman rekap).
    const awalBulan = `${filter.bulan}-01`;
    const terminBulan = `EXISTS (SELECT 1 FROM tagihan_termin x WHERE x.tagihan_id = t.id AND x.status = ?
                          AND x.jatuh_tempo >= ? AND x.jatuh_tempo < ? + INTERVAL 1 MONTH)`;
    if (filter.status === "lunas") {
      kondisi.push(`(${terminBulan} OR (NOT ${ADA_TERMIN} AND t.status = 'lunas'))`);
      params.push("lunas", awalBulan, awalBulan);
    } else {
      kondisi.push(
        `(${terminBulan} OR (NOT ${ADA_TERMIN} AND t.status <> 'lunas'
           AND t.jatuh_tempo >= ? AND t.jatuh_tempo < ? + INTERVAL 1 MONTH))`,
      );
      params.push("belum_bayar", awalBulan, awalBulan, awalBulan, awalBulan);
    }
  }
  return { where: kondisi.join(" AND "), params };
}

/** Satu halaman rekap tagihan periode (filter & paginasi di SQL), beserta termin cicilannya. */
export async function getRekapTagihan(
  periode: PeriodeTagihan,
  filter: FilterRekap,
): Promise<{ baris: RekapBaris[]; totalBaris: number; halaman: number; jumlahHalaman: number }> {
  const { where, params } = kondisiRekap(periode, filter);
  const dari = `FROM tagihan t JOIN mahasiswa m ON m.id = t.mahasiswa_id WHERE ${where}`;
  const hitung = await queryOne<{ jumlah: number }>(`SELECT COUNT(*) AS jumlah ${dari}`, params);
  const totalBaris = Number(hitung?.jumlah ?? 0);

  const jumlahHalaman = Math.max(1, Math.ceil(totalBaris / REKAP_PER_HALAMAN));
  // Halaman di luar jangkauan (mis. ?halaman=999) dijepit ke halaman terakhir.
  const halaman = Math.min(Math.max(1, Math.floor(filter.halaman) || 1), jumlahHalaman);
  const tagihan = await query<TagihanMahasiswa>(
    `${TAGIHAN_MAHASISWA_SELECT}
      WHERE ${where}
      ORDER BY m.nama, t.id
      LIMIT ? OFFSET ?`,
    [...params, REKAP_PER_HALAMAN, (halaman - 1) * REKAP_PER_HALAMAN],
  );
  if (tagihan.length === 0) return { baris: [], totalBaris, halaman, jumlahHalaman };

  const termin = await query<Termin>(`${TERMIN_SELECT} WHERE tt.tagihan_id IN (?) ORDER BY tt.termin_ke`, [
    tagihan.map((t) => t.id),
  ]);
  const baris = tagihan.map((t) => ({ ...t, termin: termin.filter((tt) => tt.tagihan_id === t.id) }));
  return { baris, totalBaris, halaman, jumlahHalaman };
}

export type RingkasanPeriode = {
  jumlahTagihan: number;
  jumlahLunas: number;
  total: number;
  diterima: number;
  /** BR-SD-16: termin/tagihan belum lunas yang sudah lewat jatuh tempo. */
  tunggakan: number;
};

/**
 * Ringkasan seluruh tagihan periode (tidak terpengaruh filter), dihitung di database.
 * `hariIni` = tanggal WIB "YYYY-MM-DD"; jatuh tempo berlaku sampai akhir hari, jadi menunggak bila < hariIni.
 */
export async function getRingkasanPeriode(periode: PeriodeTagihan, hariIni: string): Promise<RingkasanPeriode> {
  const r = await queryOne<Record<keyof RingkasanPeriode, string | number | null>>(
    `SELECT COUNT(*) AS jumlahTagihan,
            SUM(t.status = 'lunas') AS jumlahLunas,
            SUM(t.jumlah) AS total,
            SUM(t.dibayar) AS diterima,
            SUM(CASE WHEN x.tagihan_id IS NULL
                     THEN IF(t.status <> 'lunas' AND t.jatuh_tempo < ?, t.jumlah - t.dibayar, 0)
                     ELSE x.menunggak END) AS tunggakan
       FROM tagihan t
       LEFT JOIN (SELECT tt.tagihan_id, SUM(IF(tt.status = 'belum_bayar' AND tt.jatuh_tempo < ?, tt.jumlah, 0)) AS menunggak
                    FROM tagihan_termin tt JOIN tagihan p ON p.id = tt.tagihan_id
                   WHERE p.tahun_akademik = ? AND p.periode = ?
                   GROUP BY tt.tagihan_id) x ON x.tagihan_id = t.id
      WHERE t.tahun_akademik = ? AND t.periode = ?`,
    [hariIni, hariIni, periode.tahun_akademik, periode.periode, periode.tahun_akademik, periode.periode],
  );
  return {
    jumlahTagihan: Number(r?.jumlahTagihan ?? 0),
    jumlahLunas: Number(r?.jumlahLunas ?? 0),
    total: Number(r?.total ?? 0),
    diterima: Number(r?.diterima ?? 0),
    tunggakan: Number(r?.tunggakan ?? 0),
  };
}

/** Bulan-bulan ("YYYY-MM") yang punya termin cicilan pada periode ini, urut naik. */
export async function getBulanRekap(periode: PeriodeTagihan) {
  const rows = await query<{ bulan: string }>(
    `SELECT DISTINCT DATE_FORMAT(tt.jatuh_tempo, '%Y-%m') AS bulan
       FROM tagihan_termin tt JOIN tagihan t ON t.id = tt.tagihan_id
      WHERE t.tahun_akademik = ? AND t.periode = ?
      ORDER BY bulan`,
    [periode.tahun_akademik, periode.periode],
  );
  return rows.map((r) => r.bulan);
}

export function getTagihanMahasiswa(id: number) {
  return queryOne<TagihanMahasiswa>(`${TAGIHAN_MAHASISWA_SELECT} WHERE t.id = ?`, [id]);
}

export function getTerminTagihan(tagihanId: number) {
  return query<Termin>(`${TERMIN_SELECT} WHERE tt.tagihan_id = ? ORDER BY tt.termin_ke`, [tagihanId]);
}

export type RiwayatTagihan = {
  id: number;
  aksi: string;
  uraian: string;
  oleh: string | null;
  created_at: string;
};

/** Format keterangan audit untuk aksi tagihan: "<no_tagihan> | <uraian>". */
export function keteranganAuditTagihan(noTagihan: string, uraian: string) {
  return `${noTagihan} | ${uraian}`.slice(0, 255);
}

/** Riwayat perubahan satu tagihan dari audit_log (memakai index entitas, bukan pencarian teks). */
export function getRiwayatTagihan(tagihan: Pick<Tagihan, "id" | "no_tagihan">) {
  return query<RiwayatTagihan>(
    `SELECT a.id, a.aksi,
            IF(a.keterangan LIKE CONCAT(?, ' |%'), SUBSTRING(a.keterangan, CHAR_LENGTH(?) + 4), a.keterangan) AS uraian,
            COALESCE(u.nama, u.username) AS oleh, a.created_at
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
      WHERE a.entitas = 'tagihan' AND a.entitas_id = ?
      ORDER BY a.created_at DESC, a.id DESC`,
    [tagihan.no_tagihan, tagihan.no_tagihan, tagihan.id],
  );
}
