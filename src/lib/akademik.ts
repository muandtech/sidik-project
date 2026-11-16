import "server-only";
import { cache } from "react";
import { query, queryOne } from "@/lib/db";
import { getPengaturan } from "@/lib/konfigurasi";

// SIAKAD: semester aktif, nilai resmi, IPS/IPK, jadwal (PRD 6.3, FR-AK-04/11/12/13).

export type TahunAkademik = {
  id: number;
  kode: string;
  tahun: string;
  periode: "Ganjil" | "Genap";
  krs_mulai: string | null;
  krs_selesai: string | null;
  perubahan_mulai: string | null;
  perubahan_selesai: string | null;
  kuliah_mulai: string | null;
  kuliah_selesai: string | null;
  uts_mulai: string | null;
  uts_selesai: string | null;
  uas_mulai: string | null;
  uas_selesai: string | null;
  nilai_mulai: string | null;
  nilai_selesai: string | null;
};

const TA_SELECT = `SELECT id, kode, tahun, periode, krs_mulai, krs_selesai, perubahan_mulai, perubahan_selesai,
         kuliah_mulai, kuliah_selesai, uts_mulai, uts_selesai, uas_mulai, uas_selesai, nilai_mulai, nilai_selesai
    FROM tahun_akademik`;

/** Semester aktif (hanya satu, SD-S2-07); null bila BAAK belum menetapkan. */
export const getTahunAkademikAktif = cache(() => queryOne<TahunAkademik>(`${TA_SELECT} WHERE aktif = 1`));

export function labelTahunAkademik(ta: Pick<TahunAkademik, "tahun" | "periode">) {
  return `${ta.periode} ${ta.tahun}`;
}

// ---------------------------------------------------------------------------------------------
// Nilai, IPS & IPK
// ---------------------------------------------------------------------------------------------

export type BarisNilai = {
  tahun_akademik_id: number;
  kode_ta: string;
  tahun: string;
  periode: "Ganjil" | "Genap";
  kode_mk: string;
  nama_mk: string;
  sks: number;
  nilai_huruf: string;
  bobot: string;
  lulus: number;
};

/**
 * Nilai resmi mahasiswa: hanya dari KRS yang disetujui dan nilai yang sudah terpublikasi (BR-SD-06).
 * Urut per semester lalu kode mata kuliah.
 */
export function getNilaiTerpublikasi(mahasiswaId: number) {
  return query<BarisNilai>(
    `SELECT ta.id AS tahun_akademik_id, ta.kode AS kode_ta, ta.tahun, ta.periode,
            mk.kode AS kode_mk, mk.nama AS nama_mk, mk.sks, n.nilai_huruf, n.bobot, COALESCE(b.lulus, 0) AS lulus
       FROM krs k
       JOIN tahun_akademik ta ON ta.id = k.tahun_akademik_id
       JOIN krs_detail kd ON kd.krs_id = k.id
       JOIN kelas kl ON kl.id = kd.kelas_id
       JOIN mata_kuliah mk ON mk.id = kl.mata_kuliah_id
       JOIN nilai n ON n.krs_detail_id = kd.id AND n.status = 'terpublikasi'
       LEFT JOIN bobot_nilai b ON b.huruf = n.nilai_huruf
      WHERE k.mahasiswa_id = ? AND k.status = 'disetujui'
      ORDER BY ta.kode, mk.kode`,
    [mahasiswaId],
  );
}

/**
 * Indeks prestasi dari sekumpulan nilai: Σ(bobot × SKS) / Σ SKS, dibulatkan 2 desimal.
 * Dihitung dalam bilangan bulat (bobot × 100) supaya tidak ada galat pembulatan float.
 */
export function hitungIndeks(rows: Pick<BarisNilai, "sks" | "bobot">[]) {
  let sks = 0;
  let mutuSeratus = 0;
  for (const r of rows) {
    sks += r.sks;
    mutuSeratus += Math.round(Number(r.bobot) * 100) * r.sks;
  }
  return { sks, ip: sks === 0 ? null : Math.round(mutuSeratus / sks) / 100 };
}

export type AturanNilaiUlang = "terbaik" | "terakhir";

/** Satu nilai per mata kuliah untuk IPK & transkrip bila mata kuliah diulang (pengaturan `ipk_nilai_ulang`). */
export function pilihNilaiPerMk<T extends Pick<BarisNilai, "kode_mk" | "kode_ta" | "bobot">>(rows: T[], aturan: AturanNilaiUlang) {
  const terpilih = new Map<string, T>();
  for (const r of rows) {
    const lama = terpilih.get(r.kode_mk);
    const ganti =
      !lama ||
      (aturan === "terakhir"
        ? r.kode_ta > lama.kode_ta
        : Number(r.bobot) > Number(lama.bobot) || (Number(r.bobot) === Number(lama.bobot) && r.kode_ta > lama.kode_ta));
    if (ganti) terpilih.set(r.kode_mk, r);
  }
  return [...terpilih.values()].sort((a, b) => a.kode_mk.localeCompare(b.kode_mk));
}

export type SemesterKhs = {
  tahun_akademik_id: number;
  kode_ta: string;
  tahun: string;
  periode: "Ganjil" | "Genap";
  nilai: BarisNilai[];
  sks: number;
  ips: number | null;
};

export type RingkasanStudi = {
  ipk: number | null;
  /** SKS mata kuliah yang lulus (nilai dengan `bobot_nilai.lulus = 1`). */
  sksLulus: number;
  semester: SemesterKhs[];
  transkrip: BarisNilai[];
};

/** KHS per semester (IPS), transkrip, IPK, dan SKS lulus dari daftar nilai terpublikasi. */
export function hitungRingkasanStudi(rows: BarisNilai[], aturan: AturanNilaiUlang): RingkasanStudi {
  const perTa = new Map<number, BarisNilai[]>();
  for (const r of rows) perTa.set(r.tahun_akademik_id, [...(perTa.get(r.tahun_akademik_id) ?? []), r]);

  const semester = [...perTa.values()]
    .map((nilai): SemesterKhs => {
      const { sks, ip } = hitungIndeks(nilai);
      const [awal] = nilai;
      return { tahun_akademik_id: awal.tahun_akademik_id, kode_ta: awal.kode_ta, tahun: awal.tahun, periode: awal.periode, nilai, sks, ips: ip };
    })
    .sort((a, b) => a.kode_ta.localeCompare(b.kode_ta));

  const transkrip = pilihNilaiPerMk(rows, aturan);
  return {
    ipk: hitungIndeks(transkrip).ip,
    sksLulus: transkrip.filter((r) => r.lulus === 1).reduce((n, r) => n + r.sks, 0),
    semester,
    transkrip,
  };
}

function aturanNilaiUlang(nilai: string | undefined): AturanNilaiUlang {
  return nilai === "terakhir" ? "terakhir" : "terbaik";
}

export const getRingkasanStudi = cache(async (mahasiswaId: number) => {
  const [rows, pengaturan] = await Promise.all([getNilaiTerpublikasi(mahasiswaId), getPengaturan()]);
  return hitungRingkasanStudi(rows, aturanNilaiUlang(pengaturan.ipk_nilai_ulang));
});

export function formatIp(ip: number | null) {
  return ip === null ? "-" : ip.toFixed(2);
}

// ---------------------------------------------------------------------------------------------
// Batas SKS (BR-SD-03)
// ---------------------------------------------------------------------------------------------

export type BatasSks = { ips_min: string; maks_sks: number };

export function getTabelBatasSks() {
  return query<BatasSks>("SELECT ips_min, maks_sks FROM batas_sks ORDER BY ips_min DESC");
}

/** Maks SKS untuk IPS tertentu: baris dengan ips_min tertinggi yang ≤ IPS. */
export function maksSksDariIps(ips: number, tabel: BatasSks[]) {
  const baris = [...tabel].sort((a, b) => Number(b.ips_min) - Number(a.ips_min)).find((b) => ips >= Number(b.ips_min));
  return baris?.maks_sks ?? null;
}

// ---------------------------------------------------------------------------------------------
// Jadwal (FR-AK-11)
// ---------------------------------------------------------------------------------------------

export type JadwalKelas = {
  jadwal_id: number;
  kelas_id: number;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  semester: number;
  kelas: string;
  dosen: string | null;
  hari: number;
  jam_mulai: string;
  jam_selesai: string;
  ruang: string | null;
};

const JADWAL_SELECT = `SELECT j.id AS jadwal_id, kl.id AS kelas_id, mk.kode AS kode_mk, mk.nama AS nama_mk, mk.sks, mk.semester,
         kl.nama AS kelas, d.nama AS dosen, j.hari, j.jam_mulai, j.jam_selesai, r.nama AS ruang
    FROM jadwal j
    JOIN kelas kl ON kl.id = j.kelas_id
    JOIN mata_kuliah mk ON mk.id = kl.mata_kuliah_id
    LEFT JOIN dosen d ON d.id = kl.dosen_id
    LEFT JOIN ruang r ON r.id = j.ruang_id`;

/** Jadwal mingguan mahasiswa pada satu semester dari KRS dengan status tertentu. */
export function getJadwalMahasiswa(mahasiswaId: number, tahunAkademikId: number, status: readonly string[] = ["disetujui"]) {
  return query<JadwalKelas>(
    `${JADWAL_SELECT}
      JOIN krs_detail kd ON kd.kelas_id = kl.id
      JOIN krs k ON k.id = kd.krs_id
     WHERE k.mahasiswa_id = ? AND k.tahun_akademik_id = ? AND k.status IN (?)
     ORDER BY j.hari, j.jam_mulai`,
    [mahasiswaId, tahunAkademikId, status],
  );
}

/** Agenda hari ini di dashboard: jadwal KRS yang disetujui pada semester aktif. */
export async function getJadwalHari(mahasiswaId: number, hari: number) {
  const ta = await getTahunAkademikAktif();
  if (!ta) return [];
  return (await getJadwalMahasiswa(mahasiswaId, ta.id)).filter((j) => j.hari === hari);
}

/** Seluruh kelas yang ditawarkan untuk kurikulum-kurikulum satu prodi pada satu semester. */
export function getJadwalProdi(prodiId: number, tahunAkademikId: number) {
  return query<JadwalKelas>(
    `${JADWAL_SELECT}
      JOIN kurikulum ku ON ku.id = mk.kurikulum_id
     WHERE ku.prodi_id = ? AND kl.tahun_akademik_id = ?
     ORDER BY mk.semester, mk.kode, kl.nama, j.hari, j.jam_mulai`,
    [prodiId, tahunAkademikId],
  );
}

export const NAMA_HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;

export function namaHari(hari: number) {
  return NAMA_HARI[hari] ?? "-";
}
