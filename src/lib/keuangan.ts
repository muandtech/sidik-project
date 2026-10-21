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

/** Tagihan satu periode untuk seluruh mahasiswa beserta termin cicilannya. */
export async function getRekapTagihan(periode: PeriodeTagihan): Promise<RekapBaris[]> {
  const tagihan = await query<TagihanMahasiswa>(
    `${TAGIHAN_MAHASISWA_SELECT}
      WHERE t.tahun_akademik = ? AND t.periode = ?
      ORDER BY m.nama`,
    [periode.tahun_akademik, periode.periode],
  );
  if (tagihan.length === 0) return [];

  const termin = await query<Termin>(`${TERMIN_SELECT} WHERE tt.tagihan_id IN (?) ORDER BY tt.termin_ke`, [
    tagihan.map((t) => t.id),
  ]);
  return tagihan.map((t) => ({ ...t, termin: termin.filter((tt) => tt.tagihan_id === t.id) }));
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

export function getRiwayatTagihan(noTagihan: string) {
  return query<RiwayatTagihan>(
    `SELECT a.id, a.aksi, SUBSTRING(a.keterangan, CHAR_LENGTH(?) + 4) AS uraian,
            COALESCE(u.nama, u.username) AS oleh, a.created_at
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
      WHERE a.aksi LIKE 'tagihan\\_%' AND a.keterangan LIKE CONCAT(?, ' |%')
      ORDER BY a.created_at DESC, a.id DESC`,
    [noTagihan, noTagihan],
  );
}
