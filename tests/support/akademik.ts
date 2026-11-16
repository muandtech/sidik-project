import type { ExecuteValues, ResultSetHeader } from "mysql2/promise";
import { db, queryOne } from "@/lib/db";
import { buatUser, prodiUji } from "./keuangan";

// Fixture akademik fiktif untuk test KRS: satu semester lampau berisi nilai, satu semester aktif dengan
// periode KRS terbuka (relatif terhadap CURDATE()), kurikulum kecil dengan prasyarat, kelas & jadwal.

async function sisip(sql: string, params: ExecuteValues[]) {
  const [hasil] = await db.execute<ResultSetHeader>(sql, params);
  return hasil.insertId;
}

export type Dunia = {
  prodiId: number;
  kurikulumId: number;
  taLampau: number;
  taAktif: number;
  mk: Record<string, number>;
  dosenPa: { dosenId: number; userId: number };
  dosenLain: { dosenId: number; userId: number };
};

let dunia: Dunia | null = null;
let urutKelas = 0;

async function buatDosen(prodiId: number, nidn: string) {
  const userId = await buatUser("dosen");
  const dosenId = await sisip("INSERT INTO dosen (user_id, nidn, nama, prodi_id) VALUES (?, ?, ?, ?)", [userId, nidn, `Dosen ${nidn}`, prodiId]);
  return { dosenId, userId };
}

/** Dibuat sekali per berkas test. */
export async function siapkanDunia(): Promise<Dunia> {
  if (dunia) return dunia;
  const prodiId = await prodiUji();
  const kurikulumId = await sisip(
    "INSERT INTO kurikulum (prodi_id, kode, nama, angkatan_mulai) VALUES (?, 'KUR-UJI', 'Kurikulum Uji', 2000)",
    [prodiId],
  );
  // Semester 1: A1, A2 (paket). Semester 3: C1 (prasyarat A1), C2..C6.
  const mk: Record<string, number> = {};
  for (const [kode, semester] of [["A1", 1], ["A2", 1], ["C1", 3], ["C2", 3], ["C3", 3], ["C4", 3], ["C5", 3], ["C6", 3]] as const) {
    mk[kode] = await sisip(
      "INSERT INTO mata_kuliah (kurikulum_id, kode, nama, sks, semester, jenis) VALUES (?, ?, ?, 3, ?, 'wajib')",
      [kurikulumId, kode, `Mata Kuliah ${kode}`, semester],
    );
  }
  await db.execute("INSERT INTO prasyarat_mk (mata_kuliah_id, prasyarat_id) VALUES (?, ?)", [mk.C1, mk.A1]);

  const taLampau = await sisip(
    "INSERT INTO tahun_akademik (kode, tahun, periode, aktif) VALUES ('20251', '2025/2026', 'Ganjil', 0)",
    [],
  );
  const taAktif = await sisip(
    `INSERT INTO tahun_akademik (kode, tahun, periode, aktif, krs_mulai, krs_selesai)
     VALUES ('20261', '2026/2027', 'Ganjil', 1, CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 1 DAY)`,
    [],
  );
  dunia = {
    prodiId,
    kurikulumId,
    taLampau,
    taAktif,
    mk,
    dosenPa: await buatDosen(prodiId, "0499000001"),
    dosenLain: await buatDosen(prodiId, "0499000002"),
  };
  return dunia;
}

/** Kelas semester aktif dengan satu jadwal. */
export async function buatKelas(mkKode: string, slot: { hari: number; mulai: string; selesai: string }, kuota = 40) {
  const d = await siapkanDunia();
  urutKelas += 1;
  const kelasId = await sisip(
    "INSERT INTO kelas (tahun_akademik_id, mata_kuliah_id, nama, kuota) VALUES (?, ?, ?, ?)",
    [d.taAktif, d.mk[mkKode], `K${urutKelas}`, kuota],
  );
  await db.execute("INSERT INTO jadwal (kelas_id, hari, jam_mulai, jam_selesai) VALUES (?, ?, ?, ?)", [kelasId, slot.hari, slot.mulai, slot.selesai]);
  return kelasId;
}

const BOBOT: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, E: 0 };

/**
 * Mahasiswa baru (dengan user & role mahasiswa). `nilaiLampau` = nilai terpublikasi semester lampau,
 * mis. { A1: "E", A2: "D" } → IPS rendah sehingga batas SKS 15.
 */
export async function buatMahasiswa(opsi: {
  semester: number;
  status?: "aktif" | "cuti" | "nonaktif" | "lulus" | "keluar";
  bolehKrs?: boolean;
  nilaiLampau?: Record<string, string>;
}) {
  const d = await siapkanDunia();
  const userId = await buatUser("mahasiswa");
  const nim = `77${String(userId).padStart(8, "0")}`;
  const mahasiswaId = await sisip(
    `INSERT INTO mahasiswa (user_id, nim, nama, prodi_id, angkatan, semester, dosen_pa_id, status_akademik, boleh_krs)
     VALUES (?, ?, ?, ?, 2025, ?, ?, ?, ?)`,
    [userId, nim, `Mahasiswa ${nim}`, d.prodiId, opsi.semester, d.dosenPa.dosenId, opsi.status ?? "aktif", opsi.bolehKrs === false ? 0 : 1],
  );
  const nilai = Object.entries(opsi.nilaiLampau ?? {});
  if (nilai.length > 0) {
    const krsId = await sisip(
      "INSERT INTO krs (mahasiswa_id, tahun_akademik_id, status, maks_sks) VALUES (?, ?, 'disetujui', 24)",
      [mahasiswaId, d.taLampau],
    );
    for (const [kode, huruf] of nilai) {
      const kelasId = await sisip(
        "INSERT INTO kelas (tahun_akademik_id, mata_kuliah_id, nama, kuota) VALUES (?, ?, ?, 99)",
        [d.taLampau, d.mk[kode], `L${userId}`],
      );
      const detailId = await sisip("INSERT INTO krs_detail (krs_id, kelas_id) VALUES (?, ?)", [krsId, kelasId]);
      await db.execute(
        "INSERT INTO nilai (krs_detail_id, nilai_huruf, bobot, status, dipublikasi_at) VALUES (?, ?, ?, 'terpublikasi', NOW())",
        [detailId, huruf, BOBOT[huruf]],
      );
    }
  }
  return { mahasiswaId, userId, nim };
}

export async function statusKrs(mahasiswaId: number) {
  const d = await siapkanDunia();
  return queryOne<{ id: number; status: string; maks_sks: number; catatan_pa: string | null }>(
    "SELECT id, status, maks_sks, catatan_pa FROM krs WHERE mahasiswa_id = ? AND tahun_akademik_id = ?",
    [mahasiswaId, d.taAktif],
  );
}

export async function terisi(kelasId: number) {
  return (await queryOne<{ terisi: number }>("SELECT terisi FROM kelas WHERE id = ?", [kelasId]))?.terisi;
}
