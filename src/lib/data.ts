import "server-only";
import { cache } from "react";
import { query, queryOne } from "@/lib/db";
import type { Role } from "@/lib/session";

export type Mahasiswa = {
  id: number;
  nim: string;
  nama: string;
  angkatan: number;
  semester: number;
  status_akademik: string;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  jenis_kelamin: "L" | "P" | null;
  agama: string | null;
  kewarganegaraan: string | null;
  golongan_darah: string | null;
  no_hp: string | null;
  email_kampus: string | null;
  alamat_ktp: string | null;
  alamat_domisili: string | null;
  foto: string | null;
  total_sks: number;
  ipk: string | null;
  nilai_tilawah: string | null;
  prodi: string;
  jenjang: string;
  fakultas: string;
  dosen_pa: string | null;
};

export const getMahasiswa = cache(async (userId: number) =>
  queryOne<Mahasiswa>(
    `SELECT m.id, m.nim, m.nama, m.angkatan, m.semester, m.status_akademik,
            m.tempat_lahir, m.tanggal_lahir, m.jenis_kelamin, m.agama, m.kewarganegaraan,
            m.golongan_darah, m.no_hp, m.email_kampus, m.alamat_ktp, m.alamat_domisili,
            m.foto, m.total_sks, m.ipk, m.nilai_tilawah,
            p.nama AS prodi, p.jenjang, f.nama AS fakultas, d.nama AS dosen_pa
       FROM mahasiswa m
       JOIN prodi p ON p.id = m.prodi_id
       JOIN fakultas f ON f.id = p.fakultas_id
       LEFT JOIN dosen d ON d.id = m.dosen_pa_id
      WHERE m.user_id = ?`,
    [userId],
  ),
);

export type OrangTua = {
  nama_ayah: string | null;
  nama_ibu: string | null;
  pekerjaan: string | null;
  kontak_darurat: string | null;
};

export function getOrangTua(mahasiswaId: number) {
  return queryOne<OrangTua>(
    "SELECT nama_ayah, nama_ibu, pekerjaan, kontak_darurat FROM orang_tua_wali WHERE mahasiswa_id = ?",
    [mahasiswaId],
  );
}

export type Dokumen = {
  id: number;
  jenis: string;
  ukuran_kb: number | null;
  status: "terverifikasi" | "pending" | "belum_ada";
};

export function getDokumen(mahasiswaId: number) {
  return query<Dokumen>(
    "SELECT id, jenis, ukuran_kb, status FROM dokumen_mahasiswa WHERE mahasiswa_id = ? ORDER BY urutan, id",
    [mahasiswaId],
  );
}

export type Jadwal = {
  id: number;
  nama_mk: string;
  ruang: string;
  jam_mulai: string;
  jam_selesai: string;
  dosen: string | null;
};

export function getJadwalHari(mahasiswaId: number, hari: number) {
  return query<Jadwal>(
    `SELECT j.id, j.nama_mk, j.ruang, j.jam_mulai, j.jam_selesai, d.nama AS dosen
       FROM jadwal_kuliah j
       LEFT JOIN dosen d ON d.id = j.dosen_id
      WHERE j.mahasiswa_id = ? AND j.hari = ?
      ORDER BY j.jam_mulai`,
    [mahasiswaId, hari],
  );
}

export type Pengumuman = {
  id: number;
  judul: string;
  ringkasan: string;
  isi: string;
  kategori_kode: string;
  kategori_nama: string;
  penulis: string;
  tanggal_acara: string | null;
  published_at: string;
};

export type KategoriPengumuman = { kode: string; nama: string };

export function getKategoriPengumuman() {
  return query<KategoriPengumuman>("SELECT kode, nama FROM kategori_pengumuman ORDER BY urutan, id");
}

function targetsFor(role: Role) {
  return role === "mahasiswa" ? ["semua", "mahasiswa"] : ["semua", "dosen"];
}

const PENGUMUMAN_SELECT = `SELECT p.id, p.judul, p.ringkasan, p.isi, k.kode AS kategori_kode, k.nama AS kategori_nama,
         p.penulis, p.tanggal_acara, p.published_at
    FROM pengumuman p
    JOIN kategori_pengumuman k ON k.id = p.kategori_id
   WHERE p.target IN (?) AND p.published_at <= NOW()`;

export function getPengumumanList(role: Role, options: { kategori?: string; limit?: number } = {}) {
  const params: unknown[] = [targetsFor(role)];
  let sql = PENGUMUMAN_SELECT;
  if (options.kategori) {
    sql += " AND k.kode = ?";
    params.push(options.kategori);
  }
  sql += " ORDER BY p.published_at DESC";
  if (options.limit) {
    sql += " LIMIT ?";
    params.push(options.limit);
  }
  return query<Pengumuman>(sql, params);
}

export function getPengumuman(id: number, role: Role) {
  return queryOne<Pengumuman>(`${PENGUMUMAN_SELECT} AND p.id = ?`, [targetsFor(role), id]);
}

export type Notifikasi = {
  id: number;
  judul: string;
  pesan: string;
  tipe: "peringatan" | "dokumen" | "jadwal" | "info";
  tautan: string | null;
  created_at: string;
};

export function getNotifikasiBelumDibaca(userId: number, limit = 5) {
  return query<Notifikasi>(
    `SELECT id, judul, pesan, tipe, tautan, created_at
       FROM notifikasi
      WHERE user_id = ? AND dibaca_at IS NULL
      ORDER BY created_at DESC
      LIMIT ?`,
    [userId, limit],
  );
}

export type Aktivitas = {
  id: number;
  judul: string;
  ikon: "edit" | "unduh" | "bayar" | "info";
  created_at: string;
};

export function getAktivitas(userId: number, limit = 3) {
  return query<Aktivitas>(
    "SELECT id, judul, ikon, created_at FROM aktivitas WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    [userId, limit],
  );
}

export type Tagihan = {
  id: number;
  no_tagihan: string;
  semester_ke: number;
  periode: "Ganjil" | "Genap";
  tahun_akademik: string;
  jenis_pembayaran: string;
  jumlah: string;
  dibayar: string;
  status: "lunas" | "belum_lunas" | "cicilan";
  jatuh_tempo: string;
  tanggal_bayar: string | null;
  metode_bayar: string | null;
  no_kuitansi: string | null;
  /** 0 = dibayar sekaligus; > 0 = dicicil per bulan (lihat tagihan_termin). */
  jumlah_termin: number;
};

const TAGIHAN_COLUMNS = `id, no_tagihan, semester_ke, periode, tahun_akademik, jenis_pembayaran, jumlah, dibayar,
  status, jatuh_tempo, tanggal_bayar, metode_bayar, no_kuitansi,
  (SELECT COUNT(*) FROM tagihan_termin tt WHERE tt.tagihan_id = tagihan.id) AS jumlah_termin`;

export function getTagihanList(mahasiswaId: number) {
  return query<Tagihan>(
    `SELECT ${TAGIHAN_COLUMNS} FROM tagihan WHERE mahasiswa_id = ? ORDER BY semester_ke DESC`,
    [mahasiswaId],
  );
}

export function getTagihan(id: number, mahasiswaId: number) {
  return queryOne<Tagihan>(`SELECT ${TAGIHAN_COLUMNS} FROM tagihan WHERE id = ? AND mahasiswa_id = ?`, [
    id,
    mahasiswaId,
  ]);
}

export type Termin = {
  id: number;
  tagihan_id: number;
  termin_ke: number;
  jumlah: string;
  jatuh_tempo: string;
  status: "belum_bayar" | "lunas";
  tanggal_bayar: string | null;
  metode_bayar: string | null;
  no_kuitansi: string | null;
  catatan: string | null;
  diverifikasi_at: string | null;
  diverifikator: string | null;
};

export const TERMIN_SELECT = `SELECT tt.id, tt.tagihan_id, tt.termin_ke, tt.jumlah, tt.jatuh_tempo, tt.status,
         tt.tanggal_bayar, tt.metode_bayar, tt.no_kuitansi, tt.catatan, tt.diverifikasi_at,
         COALESCE(u.nama, u.username) AS diverifikator
    FROM tagihan_termin tt
    LEFT JOIN users u ON u.id = tt.diverifikasi_oleh`;

/** Seluruh termin cicilan milik mahasiswa, urut per tagihan lalu termin. */
export function getTerminMahasiswa(mahasiswaId: number) {
  return query<Termin>(
    `${TERMIN_SELECT}
       JOIN tagihan t ON t.id = tt.tagihan_id
      WHERE t.mahasiswa_id = ?
      ORDER BY tt.tagihan_id, tt.termin_ke`,
    [mahasiswaId],
  );
}

/** Satu termin beserta tagihannya, hanya bila tagihan itu milik mahasiswa tersebut (untuk kuitansi). */
export async function getTerminMilik(terminId: number, mahasiswaId: number) {
  const termin = await queryOne<Termin>(
    `${TERMIN_SELECT}
       JOIN tagihan t ON t.id = tt.tagihan_id
      WHERE tt.id = ? AND t.mahasiswa_id = ?`,
    [terminId, mahasiswaId],
  );
  if (!termin) return null;
  const tagihan = await getTagihan(termin.tagihan_id, mahasiswaId);
  return tagihan ? { termin, tagihan } : null;
}
