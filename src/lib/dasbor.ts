import "server-only";
import { query, queryOne } from "@/lib/db";

// Data dashboard per role (SD-S2-03). Semua angka dihitung di database (agregat), bukan di aplikasi.

export type Hitungan = { kunci: string; jumlah: number };

function keHitungan(rows: { kunci: string; jumlah: number | string }[]): Hitungan[] {
  return rows.map((r) => ({ kunci: r.kunci, jumlah: Number(r.jumlah) }));
}

export type KelasAmpu = {
  kelas_id: number;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  kelas: string;
  kuota: number;
  terisi: number;
  prodi: string;
  jadwal: string | null;
};

/** Kelas yang diampu dosen pada satu semester, beserta ringkasan jadwal. */
export function getKelasAmpu(dosenId: number, tahunAkademikId: number) {
  return query<KelasAmpu>(
    `SELECT kl.id AS kelas_id, mk.kode AS kode_mk, mk.nama AS nama_mk, mk.sks, kl.nama AS kelas, kl.kuota, kl.terisi,
            p.nama AS prodi,
            GROUP_CONCAT(CONCAT(ELT(j.hari, 'Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'), ' ',
                                TIME_FORMAT(j.jam_mulai, '%H:%i'), '–', TIME_FORMAT(j.jam_selesai, '%H:%i'),
                                COALESCE(CONCAT(' · ', r.nama), ''))
                         ORDER BY j.hari, j.jam_mulai SEPARATOR '; ') AS jadwal
       FROM kelas kl
       JOIN mata_kuliah mk ON mk.id = kl.mata_kuliah_id
       JOIN kurikulum ku ON ku.id = mk.kurikulum_id
       JOIN prodi p ON p.id = ku.prodi_id
       LEFT JOIN jadwal j ON j.kelas_id = kl.id
       LEFT JOIN ruang r ON r.id = j.ruang_id
      WHERE kl.dosen_id = ? AND kl.tahun_akademik_id = ?
      GROUP BY kl.id
      ORDER BY mk.kode, kl.nama`,
    [dosenId, tahunAkademikId],
  );
}

export type PesertaKelas = { nim: string; nama: string; prodi: string; angkatan: number; status_krs: string };

/** Peserta kelas dari KRS yang diajukan/disetujui. Pemanggil wajib memastikan kelas milik dosen tsb. */
export function getPesertaKelas(kelasId: number) {
  return query<PesertaKelas>(
    `SELECT m.nim, m.nama, p.nama AS prodi, m.angkatan, k.status AS status_krs
       FROM krs_detail kd
       JOIN krs k ON k.id = kd.krs_id AND k.status IN ('diajukan', 'disetujui')
       JOIN mahasiswa m ON m.id = k.mahasiswa_id
       JOIN prodi p ON p.id = m.prodi_id
      WHERE kd.kelas_id = ?
      ORDER BY m.nim`,
    [kelasId],
  );
}

/** Kelas milik dosen tertentu (anti-IDOR); null bila bukan kelasnya. */
export function getKelasMilikDosen(kelasId: number, dosenId: number) {
  return queryOne<{ kelas_id: number; kode_mk: string; nama_mk: string; kelas: string; kuota: number; terisi: number }>(
    `SELECT kl.id AS kelas_id, mk.kode AS kode_mk, mk.nama AS nama_mk, kl.nama AS kelas, kl.kuota, kl.terisi
       FROM kelas kl JOIN mata_kuliah mk ON mk.id = kl.mata_kuliah_id
      WHERE kl.id = ? AND kl.dosen_id = ?`,
    [kelasId, dosenId],
  );
}

/** Jumlah KRS bimbingan per status. */
export async function getStatusKrsBimbingan(dosenId: number, tahunAkademikId: number) {
  return keHitungan(
    await query<{ kunci: string; jumlah: number }>(
      `SELECT k.status AS kunci, COUNT(*) AS jumlah
         FROM krs k JOIN mahasiswa m ON m.id = k.mahasiswa_id
        WHERE m.dosen_pa_id = ? AND k.tahun_akademik_id = ?
        GROUP BY k.status`,
      [dosenId, tahunAkademikId],
    ),
  );
}

/** Mahasiswa bimbingan aktif yang belum membuat KRS sama sekali di semester ini. */
export async function getBimbinganBelumKrs(dosenId: number, tahunAkademikId: number) {
  const row = await queryOne<{ jumlah: number }>(
    `SELECT COUNT(*) AS jumlah FROM mahasiswa m
      WHERE m.dosen_pa_id = ? AND m.status_akademik = 'aktif'
        AND NOT EXISTS (SELECT 1 FROM krs k WHERE k.mahasiswa_id = m.id AND k.tahun_akademik_id = ?)`,
    [dosenId, tahunAkademikId],
  );
  return Number(row?.jumlah ?? 0);
}

/** Prodi yang dipimpin seorang kaprodi (kolom user_roles.prodi_id). */
export function getProdiKaprodi(userId: number) {
  return queryOne<{ id: number; nama: string; jenjang: string }>(
    `SELECT p.id, p.nama, p.jenjang FROM user_roles ur JOIN prodi p ON p.id = ur.prodi_id
      WHERE ur.user_id = ? AND ur.role = 'kaprodi'`,
    [userId],
  );
}

/** Status akademik mahasiswa, opsional dibatasi satu prodi. */
export async function getStatusMahasiswa(prodiId?: number) {
  return keHitungan(
    await query<{ kunci: string; jumlah: number }>(
      `SELECT status_akademik AS kunci, COUNT(*) AS jumlah FROM mahasiswa
        ${prodiId ? "WHERE prodi_id = ?" : ""} GROUP BY status_akademik`,
      prodiId ? [prodiId] : [],
    ),
  );
}

/** Status KRS satu semester, opsional dibatasi satu prodi; mahasiswa aktif tanpa KRS dihitung "belum". */
export async function getStatusKrs(tahunAkademikId: number, prodiId?: number) {
  const filter = prodiId ? "AND m.prodi_id = ?" : "";
  const params = prodiId ? [tahunAkademikId, prodiId] : [tahunAkademikId];
  return keHitungan(
    await query<{ kunci: string; jumlah: number }>(
      `SELECT COALESCE(k.status, 'belum') AS kunci, COUNT(*) AS jumlah
         FROM mahasiswa m
         LEFT JOIN krs k ON k.mahasiswa_id = m.id AND k.tahun_akademik_id = ?
        WHERE m.status_akademik = 'aktif' ${filter}
        GROUP BY COALESCE(k.status, 'belum')`,
      params,
    ),
  );
}

export type KelasPenuh = { kode_mk: string; nama_mk: string; kelas: string; kuota: number; terisi: number; prodi: string };

/** Kelas yang hampir/sudah penuh (≥ 90% kuota) — perlu dibuka kelas baru. */
export function getKelasHampirPenuh(tahunAkademikId: number, prodiId?: number) {
  return query<KelasPenuh>(
    `SELECT mk.kode AS kode_mk, mk.nama AS nama_mk, kl.nama AS kelas, kl.kuota, kl.terisi, p.nama AS prodi
       FROM kelas kl
       JOIN mata_kuliah mk ON mk.id = kl.mata_kuliah_id
       JOIN kurikulum ku ON ku.id = mk.kurikulum_id
       JOIN prodi p ON p.id = ku.prodi_id
      WHERE kl.tahun_akademik_id = ? AND kl.terisi >= kl.kuota * 0.9 ${prodiId ? "AND p.id = ?" : ""}
      ORDER BY kl.terisi / kl.kuota DESC, mk.kode
      LIMIT 10`,
    prodiId ? [tahunAkademikId, prodiId] : [tahunAkademikId],
  );
}

export type StatistikFakultas = {
  fakultas: string;
  mahasiswa_aktif: number;
  krs_disetujui: number;
  tagihan: number;
  tagihan_lunas: number;
};

/** Statistik ringkas per fakultas untuk pimpinan. */
export function getStatistikFakultas(tahunAkademikId: number, tahun: string, periode: string) {
  return query<StatistikFakultas>(
    `SELECT f.nama AS fakultas,
            SUM(m.status_akademik = 'aktif') AS mahasiswa_aktif,
            SUM(k.status = 'disetujui') AS krs_disetujui,
            COUNT(t.id) AS tagihan,
            SUM(t.status = 'lunas') AS tagihan_lunas
       FROM fakultas f
       JOIN prodi p ON p.fakultas_id = f.id
       JOIN mahasiswa m ON m.prodi_id = p.id
       LEFT JOIN krs k ON k.mahasiswa_id = m.id AND k.tahun_akademik_id = ?
       LEFT JOIN tagihan t ON t.mahasiswa_id = m.id AND t.tahun_akademik = ? AND t.periode = ?
      GROUP BY f.id
      ORDER BY f.nama`,
    [tahunAkademikId, tahun, periode],
  );
}

/** Jumlah pengguna per role (superadmin). */
export async function getPenggunaPerRole() {
  return keHitungan(await query<{ kunci: string; jumlah: number }>("SELECT role AS kunci, COUNT(*) AS jumlah FROM user_roles GROUP BY role ORDER BY role"));
}

export type BarisAudit = {
  id: number;
  aksi: string;
  keterangan: string | null;
  entitas: string | null;
  entitas_id: number | null;
  data_lama: Record<string, unknown> | null;
  data_baru: Record<string, unknown> | null;
  alasan: string | null;
  ip_address: string | null;
  oleh: string | null;
  created_at: string;
};

export const AUDIT_PER_HALAMAN = 50;

/** Audit log dengan filter aksi & pelaku (SD-S2-13); hanya baca — tidak ada UI untuk mengubah. */
export async function getAuditLog(filter: { aksi: string; q: string; halaman: number }) {
  const kondisi: string[] = [];
  const params: unknown[] = [];
  if (filter.aksi) {
    kondisi.push("a.aksi = ?");
    params.push(filter.aksi);
  }
  if (filter.q) {
    const pola = `%${filter.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    kondisi.push("(u.username LIKE ? OR a.keterangan LIKE ?)");
    params.push(pola, pola);
  }
  const where = kondisi.length > 0 ? `WHERE ${kondisi.join(" AND ")}` : "";
  const hitung = await queryOne<{ jumlah: number }>(
    `SELECT COUNT(*) AS jumlah FROM audit_log a LEFT JOIN users u ON u.id = a.user_id ${where}`,
    params,
  );
  const totalBaris = Number(hitung?.jumlah ?? 0);
  const jumlahHalaman = Math.max(1, Math.ceil(totalBaris / AUDIT_PER_HALAMAN));
  const halaman = Math.min(Math.max(1, Math.floor(filter.halaman) || 1), jumlahHalaman);
  const baris = await query<BarisAudit>(
    `SELECT a.id, a.aksi, a.keterangan, a.entitas, a.entitas_id, a.data_lama, a.data_baru, a.alasan, a.ip_address,
            COALESCE(u.username, '-') AS oleh, a.created_at
       FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
       ${where}
      ORDER BY a.id DESC
      LIMIT ? OFFSET ?`,
    [...params, AUDIT_PER_HALAMAN, (halaman - 1) * AUDIT_PER_HALAMAN],
  );
  return { baris, totalBaris, halaman, jumlahHalaman };
}

export function getDaftarAksiAudit() {
  return query<{ aksi: string }>("SELECT DISTINCT aksi FROM audit_log ORDER BY aksi");
}
