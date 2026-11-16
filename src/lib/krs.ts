import "server-only";
import type { PoolConnection, ResultSetHeader } from "mysql2/promise";
import {
  getNilaiTerpublikasi,
  getTabelBatasSks,
  getTahunAkademikAktif,
  hitungRingkasanStudi,
  maksSksDariIps,
  namaHari,
  type TahunAkademik,
} from "@/lib/akademik";
import { catatAudit } from "@/lib/audit";
import { query, queryDalam, queryOne, withTransaction } from "@/lib/db";
import { formatTanggal } from "@/lib/format";
import { GagalAksi } from "@/lib/gagal-aksi";
import { getPengaturan } from "@/lib/konfigurasi";

// Pengisian KRS online (FR-AK-07, SD-S2-09) dan persetujuan Dosen PA (FR-AK-08, SD-S2-10).
//
// Alur status: draf → diajukan → disetujui | ditolak (ditolak dapat diubah lagi → draf).
// Kuota kelas dikunci saat KRS diajukan: `kelas.terisi` dinaikkan secara atomik (UPDATE … WHERE terisi < kuota)
// sehingga kuota tidak pernah terlampaui walau ribuan mahasiswa mengajukan bersamaan.

export type StatusKrs = "draf" | "diajukan" | "disetujui" | "ditolak";

export type Krs = {
  id: number;
  mahasiswa_id: number;
  tahun_akademik_id: number;
  status: StatusKrs;
  maks_sks: number;
  ips_acuan: string | null;
  catatan_pa: string | null;
  diajukan_at: string | null;
  diputuskan_at: string | null;
};

export type MahasiswaKrs = {
  id: number;
  user_id: number;
  nim: string;
  nama: string;
  prodi_id: number;
  angkatan: number;
  semester: number;
  status_akademik: "aktif" | "cuti" | "nonaktif" | "lulus" | "keluar";
  boleh_krs: number;
  dosen_pa_id: number | null;
};

export type SlotJadwal = { hari: number; jam_mulai: string; jam_selesai: string; ruang: string | null };

export type KelasPenawaran = {
  kelas_id: number;
  mata_kuliah_id: number;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  semester: number;
  jenis: "wajib" | "pilihan";
  kelas: string;
  dosen: string | null;
  kuota: number;
  terisi: number;
  jadwal: SlotJadwal[];
};

// ---------------------------------------------------------------------------------------------
// Aturan murni (mudah dites)
// ---------------------------------------------------------------------------------------------

/**
 * Alasan mahasiswa tidak dapat mengubah KRS; null bila boleh.
 * Cuti & nonaktif hanya dapat melihat (keputusan kampus 2026-11-16); izin KRS diatur Keuangan (PRD 21.4).
 */
export function alasanKrsTerkunci(
  mhs: Pick<MahasiswaKrs, "status_akademik" | "boleh_krs">,
  ta: Pick<TahunAkademik, "krs_mulai" | "krs_selesai"> | null,
  periodeBuka: boolean,
) {
  if (!ta) return "Semester aktif belum ditetapkan oleh BAAK.";
  if (mhs.status_akademik === "cuti") return "Anda sedang cuti akademik sehingga tidak dapat mengisi KRS semester ini.";
  if (mhs.status_akademik !== "aktif") {
    return "Status akademik Anda tidak aktif. Hubungi BAAK untuk aktif kembali sebelum mengisi KRS.";
  }
  if (!mhs.boleh_krs) {
    return "KRS belum dibuka untuk Anda. Selesaikan pembayaran UKT atau hubungi Bagian Keuangan.";
  }
  if (!periodeBuka) {
    const rentang =
      ta.krs_mulai && ta.krs_selesai ? ` (${formatTanggal(ta.krs_mulai)} – ${formatTanggal(ta.krs_selesai)})` : "";
    return `Saat ini di luar periode pengisian KRS${rentang}.`;
  }
  return null;
}

function menit(jam: string) {
  const [h, m] = jam.split(":").map(Number);
  return h * 60 + m;
}

/** true bila dua kumpulan jadwal beririsan pada hari yang sama (jam selesai = jam mulai tidak dianggap bentrok). */
export function jadwalBentrok(a: Pick<SlotJadwal, "hari" | "jam_mulai" | "jam_selesai">[], b: Pick<SlotJadwal, "hari" | "jam_mulai" | "jam_selesai">[]) {
  return a.some((x) =>
    b.some(
      (y) =>
        x.hari === y.hari && menit(x.jam_mulai) < menit(y.jam_selesai) && menit(y.jam_mulai) < menit(x.jam_selesai),
    ),
  );
}

export function formatSlot(s: Pick<SlotJadwal, "hari" | "jam_mulai" | "jam_selesai">) {
  return `${namaHari(s.hari)} ${s.jam_mulai.slice(0, 5)}–${s.jam_selesai.slice(0, 5)}`;
}

// ---------------------------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------------------------

const MAHASISWA_KRS_SELECT = `SELECT id, user_id, nim, nama, prodi_id, angkatan, semester, status_akademik, boleh_krs, dosen_pa_id
    FROM mahasiswa`;

export function getMahasiswaKrs(userId: number) {
  return queryOne<MahasiswaKrs>(`${MAHASISWA_KRS_SELECT} WHERE user_id = ?`, [userId]);
}

/** Periode pengisian KRS dibandingkan dengan tanggal database (WIB), bukan jam browser. */
async function periodeKrsBuka(tahunAkademikId: number, conn?: PoolConnection) {
  const sql = "SELECT CURDATE() BETWEEN krs_mulai AND krs_selesai AS buka FROM tahun_akademik WHERE id = ?";
  const [row] = conn
    ? await queryDalam<{ buka: number | null }>(conn, sql, [tahunAkademikId])
    : await query<{ buka: number | null }>(sql, [tahunAkademikId]);
  return row?.buka === 1;
}

/** Kurikulum yang berlaku: kurikulum aktif prodi dengan angkatan_mulai terbaru yang ≤ angkatan mahasiswa. */
async function getKurikulumId(mhs: Pick<MahasiswaKrs, "prodi_id" | "angkatan">) {
  const row = await queryOne<{ id: number }>(
    `SELECT id FROM kurikulum WHERE prodi_id = ? AND angkatan_mulai <= ? AND aktif = 1
      ORDER BY angkatan_mulai DESC LIMIT 1`,
    [mhs.prodi_id, mhs.angkatan],
  );
  return row?.id ?? null;
}

/** Bobot terbaik & status lulus per mata kuliah dari nilai terpublikasi (dasar cek prasyarat & "sudah lulus"). */
async function getCapaianPerMk(mahasiswaId: number) {
  const rows = await query<{ mata_kuliah_id: number; bobot: string; lulus: number }>(
    `SELECT kl.mata_kuliah_id, MAX(n.bobot) AS bobot, MAX(COALESCE(b.lulus, 0)) AS lulus
       FROM krs k
       JOIN krs_detail kd ON kd.krs_id = k.id
       JOIN kelas kl ON kl.id = kd.kelas_id
       JOIN nilai n ON n.krs_detail_id = kd.id AND n.status = 'terpublikasi'
       LEFT JOIN bobot_nilai b ON b.huruf = n.nilai_huruf
      WHERE k.mahasiswa_id = ? AND k.status = 'disetujui'
      GROUP BY kl.mata_kuliah_id`,
    [mahasiswaId],
  );
  return new Map(rows.map((r) => [r.mata_kuliah_id, { bobot: Number(r.bobot), lulus: r.lulus === 1 }]));
}

/** Bobot minimal agar prasyarat dianggap lulus (BR-SD-04), dari pengaturan krs_huruf_min_prasyarat. */
async function getBobotMinPrasyarat() {
  const huruf = (await getPengaturan()).krs_huruf_min_prasyarat ?? "";
  const row = await queryOne<{ bobot: string }>("SELECT bobot FROM bobot_nilai WHERE huruf = ?", [huruf]);
  if (!row) throw new Error(`Pengaturan "krs_huruf_min_prasyarat" (${huruf}) tidak ada di tabel bobot_nilai.`);
  return Number(row.bobot);
}

/** Kelas-kelas beserta jadwalnya. */
async function getKelas(where: string, params: unknown[]): Promise<KelasPenawaran[]> {
  const kelas = await query<Omit<KelasPenawaran, "jadwal">>(
    `SELECT kl.id AS kelas_id, mk.id AS mata_kuliah_id, mk.kode AS kode_mk, mk.nama AS nama_mk, mk.sks, mk.semester,
            mk.jenis, kl.nama AS kelas, d.nama AS dosen, kl.kuota, kl.terisi
       FROM kelas kl
       JOIN mata_kuliah mk ON mk.id = kl.mata_kuliah_id
       LEFT JOIN dosen d ON d.id = kl.dosen_id
      WHERE ${where}
      ORDER BY mk.semester, mk.kode, kl.nama`,
    params,
  );
  if (kelas.length === 0) return [];
  const jadwal = await query<SlotJadwal & { kelas_id: number }>(
    `SELECT j.kelas_id, j.hari, j.jam_mulai, j.jam_selesai, r.nama AS ruang
       FROM jadwal j LEFT JOIN ruang r ON r.id = j.ruang_id
      WHERE j.kelas_id IN (?) ORDER BY j.hari, j.jam_mulai`,
    [kelas.map((k) => k.kelas_id)],
  );
  return kelas.map((k) => ({ ...k, jadwal: jadwal.filter((j) => j.kelas_id === k.kelas_id) }));
}

export type Penawaran = KelasPenawaran & {
  /** Prasyarat yang belum terpenuhi. */
  prasyaratKurang: string[];
  sudahLulus: boolean;
};

/** Penawaran kelas semester aktif sesuai kurikulum mahasiswa; semester 1 hanya paket semester 1 (BR-SD-03). */
export async function getPenawaran(mhs: MahasiswaKrs, ta: TahunAkademik): Promise<Penawaran[]> {
  const kurikulumId = await getKurikulumId(mhs);
  if (!kurikulumId) return [];
  const paket = mhs.semester === 1;
  const kelas = await getKelas(
    `kl.tahun_akademik_id = ? AND mk.kurikulum_id = ? AND mk.aktif = 1${paket ? " AND mk.semester = 1" : ""}`,
    [ta.id, kurikulumId],
  );
  if (kelas.length === 0) return [];

  const [capaian, bobotMin, prasyarat] = await Promise.all([
    getCapaianPerMk(mhs.id),
    getBobotMinPrasyarat(),
    query<{ mata_kuliah_id: number; prasyarat_id: number; nama: string }>(
      `SELECT p.mata_kuliah_id, p.prasyarat_id, CONCAT(mk.kode, ' ', mk.nama) AS nama
         FROM prasyarat_mk p JOIN mata_kuliah mk ON mk.id = p.prasyarat_id
        WHERE p.mata_kuliah_id IN (?)`,
      [[...new Set(kelas.map((k) => k.mata_kuliah_id))]],
    ),
  ]);

  return kelas.map((k) => ({
    ...k,
    sudahLulus: capaian.get(k.mata_kuliah_id)?.lulus ?? false,
    prasyaratKurang: prasyarat
      .filter((p) => p.mata_kuliah_id === k.mata_kuliah_id && (capaian.get(p.prasyarat_id)?.bobot ?? -1) < bobotMin)
      .map((p) => p.nama),
  }));
}

export function getKrs(mahasiswaId: number, tahunAkademikId: number) {
  return queryOne<Krs>(
    `SELECT id, mahasiswa_id, tahun_akademik_id, status, maks_sks, ips_acuan, catatan_pa, diajukan_at, diputuskan_at
       FROM krs WHERE mahasiswa_id = ? AND tahun_akademik_id = ?`,
    [mahasiswaId, tahunAkademikId],
  );
}

/** Kelas yang dipilih dalam satu KRS. */
export function getIsiKrs(krsId: number) {
  return getKelas("kl.id IN (SELECT kelas_id FROM krs_detail WHERE krs_id = ?)", [krsId]);
}

/** Batas SKS & IPS acuan untuk KRS baru (BR-SD-03). Semester 1 = paket semester 1. */
export async function hitungBatasKrs(mhs: MahasiswaKrs, ta: TahunAkademik) {
  if (mhs.semester === 1) {
    const kurikulumId = await getKurikulumId(mhs);
    const row = await queryOne<{ sks: number | null }>(
      "SELECT SUM(sks) AS sks FROM mata_kuliah WHERE kurikulum_id = ? AND semester = 1 AND jenis = 'wajib' AND aktif = 1",
      [kurikulumId],
    );
    return { maksSks: Number(row?.sks ?? 0), ipsAcuan: null, paket: true };
  }
  const [rows, pengaturan, tabel] = await Promise.all([getNilaiTerpublikasi(mhs.id), getPengaturan(), getTabelBatasSks()]);
  const ringkasan = hitungRingkasanStudi(rows, pengaturan.ipk_nilai_ulang === "terakhir" ? "terakhir" : "terbaik");
  // IPS semester terakhir sebelum semester aktif yang sudah punya nilai terpublikasi.
  const sebelumnya = ringkasan.semester.filter((s) => s.kode_ta < ta.kode).at(-1);
  const ips = sebelumnya?.ips ?? 0;
  const maksSks = maksSksDariIps(ips, tabel);
  if (maksSks === null) throw new Error("Tabel batas_sks belum diisi.");
  return { maksSks, ipsAcuan: sebelumnya?.ips ?? null, paket: false };
}

export type KonteksKrs = {
  ta: TahunAkademik | null;
  krs: Krs | null;
  alasanTerkunci: string | null;
  maksSks: number;
  ipsAcuan: number | null;
  paket: boolean;
};

/** Semua informasi yang dibutuhkan halaman Isi KRS. */
export async function getKonteksKrs(mhs: MahasiswaKrs): Promise<KonteksKrs> {
  const ta = await getTahunAkademikAktif();
  if (!ta) return { ta: null, krs: null, alasanTerkunci: alasanKrsTerkunci(mhs, null, false), maksSks: 0, ipsAcuan: null, paket: false };
  const [krs, buka, batas] = await Promise.all([getKrs(mhs.id, ta.id), periodeKrsBuka(ta.id), hitungBatasKrs(mhs, ta)]);
  return {
    ta,
    krs,
    alasanTerkunci: alasanKrsTerkunci(mhs, ta, buka),
    // Batas yang tersimpan di KRS dipakai bila sudah ada, supaya tidak berubah di tengah pengisian.
    maksSks: krs?.maks_sks ?? batas.maksSks,
    ipsAcuan: krs ? (krs.ips_acuan === null ? null : Number(krs.ips_acuan)) : batas.ipsAcuan,
    paket: batas.paket,
  };
}

// ---------------------------------------------------------------------------------------------
// Perubahan KRS oleh mahasiswa
// ---------------------------------------------------------------------------------------------

/**
 * Prelude setiap perubahan: kunci baris mahasiswa, cek status/izin/periode, lalu ambil atau buat KRS draf
 * (terkunci FOR UPDATE). Dijalankan di dalam transaksi.
 */
async function siapkanKrs(conn: PoolConnection, mahasiswaId: number) {
  const [mhs] = await queryDalam<MahasiswaKrs>(conn, `${MAHASISWA_KRS_SELECT} WHERE id = ? FOR UPDATE`, [mahasiswaId]);
  if (!mhs) throw new GagalAksi("Data mahasiswa tidak ditemukan.");
  const ta = await getTahunAkademikAktif();
  const alasan = alasanKrsTerkunci(mhs, ta, ta ? await periodeKrsBuka(ta.id, conn) : false);
  if (alasan || !ta) throw new GagalAksi(alasan ?? "Semester aktif belum ditetapkan.");

  let [krs] = await queryDalam<Krs>(
    conn,
    "SELECT id, mahasiswa_id, tahun_akademik_id, status, maks_sks, ips_acuan, catatan_pa, diajukan_at, diputuskan_at FROM krs WHERE mahasiswa_id = ? AND tahun_akademik_id = ? FOR UPDATE",
    [mhs.id, ta.id],
  );
  if (!krs) {
    const batas = await hitungBatasKrs(mhs, ta);
    // BR-SD-01: UNIQUE (mahasiswa_id, tahun_akademik_id) menjamin hanya satu KRS per semester.
    await conn.execute("INSERT INTO krs (mahasiswa_id, tahun_akademik_id, maks_sks, ips_acuan) VALUES (?, ?, ?, ?)", [
      mhs.id,
      ta.id,
      batas.maksSks,
      batas.ipsAcuan,
    ]);
    [krs] = await queryDalam<Krs>(
      conn,
      "SELECT id, mahasiswa_id, tahun_akademik_id, status, maks_sks, ips_acuan, catatan_pa, diajukan_at, diputuskan_at FROM krs WHERE mahasiswa_id = ? AND tahun_akademik_id = ? FOR UPDATE",
      [mhs.id, ta.id],
    );
  }
  return { mhs, ta, krs };
}

function pastikanDapatDiubah(krs: Krs) {
  if (krs.status === "diajukan") throw new GagalAksi("KRS sedang menunggu persetujuan Dosen PA. Batalkan pengajuan dulu untuk mengubahnya.");
  if (krs.status === "disetujui") {
    throw new GagalAksi("KRS sudah disetujui. Perubahan hanya dapat dilakukan pada masa tambah/batal.");
  }
}

/**
 * Validasi satu kumpulan kelas sebagai isi KRS: satu kelas per mata kuliah, tidak mengulang mata kuliah
 * yang sudah lulus, prasyarat (BR-SD-04), bentrok jadwal, dan batas SKS (BR-SD-03).
 */
async function validasiIsi(mhs: MahasiswaKrs, ta: TahunAkademik, kelasIds: number[], maksSks: number) {
  const penawaran = await getPenawaran(mhs, ta);
  const terpilih = kelasIds.map((id) => {
    const k = penawaran.find((p) => p.kelas_id === id);
    if (!k) throw new GagalAksi("Kelas tidak tersedia untuk kurikulum atau semester Anda.");
    return k;
  });

  const mk = new Set<number>();
  for (const [i, k] of terpilih.entries()) {
    if (mk.has(k.mata_kuliah_id)) throw new GagalAksi(`${k.kode_mk} ${k.nama_mk} sudah dipilih di kelas lain.`);
    mk.add(k.mata_kuliah_id);
    if (k.sudahLulus) throw new GagalAksi(`${k.kode_mk} ${k.nama_mk} sudah lulus dan tidak perlu diambil lagi.`);
    if (k.prasyaratKurang.length > 0) {
      throw new GagalAksi(`${k.kode_mk} ${k.nama_mk} membutuhkan prasyarat: ${k.prasyaratKurang.join(", ")}.`);
    }
    const lawan = terpilih.slice(0, i).find((x) => jadwalBentrok(x.jadwal, k.jadwal));
    if (lawan) throw new GagalAksi(`Jadwal ${k.kode_mk} ${k.nama_mk} bentrok dengan ${lawan.kode_mk} ${lawan.nama_mk}.`);
  }

  const totalSks = terpilih.reduce((n, k) => n + k.sks, 0);
  if (totalSks > maksSks) throw new GagalAksi(`Total ${totalSks} SKS melebihi batas ${maksSks} SKS.`);
  return { terpilih, totalSks, penawaran };
}

async function kelasDalamKrs(conn: PoolConnection, krsId: number) {
  const rows = await queryDalam<{ kelas_id: number }>(conn, "SELECT kelas_id FROM krs_detail WHERE krs_id = ? ORDER BY kelas_id", [krsId]);
  return rows.map((r) => r.kelas_id);
}

export function tambahKelasKrs(mahasiswaId: number, kelasId: number) {
  return withTransaction(async (conn) => {
    const { mhs, ta, krs } = await siapkanKrs(conn, mahasiswaId);
    pastikanDapatDiubah(krs);
    const isi = await kelasDalamKrs(conn, krs.id);
    if (isi.includes(kelasId)) throw new GagalAksi("Kelas ini sudah ada di KRS Anda.");

    const { terpilih } = await validasiIsi(mhs, ta, [...isi, kelasId], krs.maks_sks);
    const kelas = terpilih[terpilih.length - 1];
    if (kelas.terisi >= kelas.kuota) throw new GagalAksi(`Kelas ${kelas.kode_mk} ${kelas.kelas} sudah penuh. Pilih kelas lain.`);

    await conn.execute("INSERT INTO krs_detail (krs_id, kelas_id) VALUES (?, ?)", [krs.id, kelasId]);
    if (krs.status === "ditolak") await conn.execute("UPDATE krs SET status = 'draf' WHERE id = ?", [krs.id]);
    return `${kelas.kode_mk} ${kelas.nama_mk} (kelas ${kelas.kelas}) ditambahkan.`;
  });
}

export function hapusKelasKrs(mahasiswaId: number, kelasId: number) {
  return withTransaction(async (conn) => {
    const { krs } = await siapkanKrs(conn, mahasiswaId);
    pastikanDapatDiubah(krs);
    const [hasil] = await conn.execute<ResultSetHeader>("DELETE FROM krs_detail WHERE krs_id = ? AND kelas_id = ?", [krs.id, kelasId]);
    if (hasil.affectedRows === 0) throw new GagalAksi("Kelas tidak ada di KRS Anda.");
    if (krs.status === "ditolak") await conn.execute("UPDATE krs SET status = 'draf' WHERE id = ?", [krs.id]);
    return "Kelas dihapus dari KRS.";
  });
}

/** Mengajukan KRS ke Dosen PA; kuota setiap kelas dikunci secara atomik di sini (SD-S2-09). */
export function ajukanKrs(mahasiswaId: number, oleh: number) {
  return withTransaction(async (conn) => {
    const { mhs, ta, krs } = await siapkanKrs(conn, mahasiswaId);
    pastikanDapatDiubah(krs);
    const isi = await kelasDalamKrs(conn, krs.id);
    if (isi.length === 0) throw new GagalAksi("Pilih minimal satu kelas sebelum mengajukan KRS.");

    const { terpilih, totalSks, penawaran } = await validasiIsi(mhs, ta, isi, krs.maks_sks);
    if (mhs.semester === 1) {
      // Semester 1 mengikuti paket: semua mata kuliah wajib semester 1 harus diambil (BR-SD-03).
      const wajib = new Map(penawaran.filter((p) => p.jenis === "wajib").map((p) => [p.mata_kuliah_id, p]));
      const kurang = [...wajib.values()].filter((p) => !terpilih.some((t) => t.mata_kuliah_id === p.mata_kuliah_id));
      if (kurang.length > 0) throw new GagalAksi(`Paket semester 1 belum lengkap: ${kurang.map((k) => k.kode_mk).join(", ")}.`);
    }

    // Urut id kelas agar transaksi bersamaan mengunci baris kelas dalam urutan yang sama (hindari deadlock).
    for (const kelas of [...terpilih].sort((a, b) => a.kelas_id - b.kelas_id)) {
      const [hasil] = await conn.execute<ResultSetHeader>(
        "UPDATE kelas SET terisi = terisi + 1 WHERE id = ? AND terisi < kuota",
        [kelas.kelas_id],
      );
      if (hasil.affectedRows !== 1) {
        throw new GagalAksi(`Kelas ${kelas.kode_mk} ${kelas.nama_mk} (${kelas.kelas}) sudah penuh. Pilih kelas lain lalu ajukan lagi.`);
      }
    }

    await conn.execute("UPDATE krs SET status = 'diajukan', diajukan_at = NOW(), catatan_pa = NULL WHERE id = ?", [krs.id]);
    await catatAudit(oleh, "krs_ajukan", `KRS ${mhs.nim} ${ta.kode}: ${terpilih.length} kelas, ${totalSks} SKS`, conn, {
      entitas: "krs",
      entitasId: krs.id,
      dataLama: { status: krs.status },
      dataBaru: { status: "diajukan", total_sks: totalSks, kelas: terpilih.map((k) => `${k.kode_mk}-${k.kelas}`).join(",") },
    });
    const [pa] = await queryDalam<{ user_id: number | null }>(conn, "SELECT user_id FROM dosen WHERE id = ?", [mhs.dosen_pa_id]);
    if (pa?.user_id) {
      await conn.execute(
        "INSERT INTO notifikasi (user_id, judul, pesan, tipe, tautan) VALUES (?, ?, ?, 'info', ?)",
        [pa.user_id, `KRS ${mhs.nama} Menunggu Persetujuan`, `${mhs.nim} mengajukan ${totalSks} SKS.`, `/staf/perwalian/${krs.id}`],
      );
    }
    return `KRS diajukan (${totalSks} SKS) dan menunggu persetujuan Dosen PA.`;
  });
}

/** Menurunkan `terisi` setiap kelas dalam KRS (pengajuan dibatalkan atau ditolak). */
async function lepasKuota(conn: PoolConnection, krsId: number) {
  await conn.execute(
    "UPDATE kelas SET terisi = terisi - 1 WHERE terisi > 0 AND id IN (SELECT kelas_id FROM krs_detail WHERE krs_id = ?) ORDER BY id",
    [krsId],
  );
}

/** Mahasiswa menarik kembali pengajuan yang belum diputuskan; kuota dilepas. */
export function batalkanPengajuanKrs(mahasiswaId: number, oleh: number) {
  return withTransaction(async (conn) => {
    const { mhs, ta, krs } = await siapkanKrs(conn, mahasiswaId);
    if (krs.status !== "diajukan") throw new GagalAksi("KRS tidak sedang diajukan.");
    await lepasKuota(conn, krs.id);
    await conn.execute("UPDATE krs SET status = 'draf', diajukan_at = NULL WHERE id = ?", [krs.id]);
    await catatAudit(oleh, "krs_batal_ajukan", `KRS ${mhs.nim} ${ta.kode}`, conn, {
      entitas: "krs",
      entitasId: krs.id,
      dataLama: { status: "diajukan" },
      dataBaru: { status: "draf" },
    });
    return "Pengajuan KRS dibatalkan. Anda dapat mengubah KRS lagi.";
  });
}

// ---------------------------------------------------------------------------------------------
// Persetujuan Dosen PA (FR-AK-08)
// ---------------------------------------------------------------------------------------------

export type KrsBimbingan = {
  id: number;
  status: StatusKrs;
  maks_sks: number;
  ips_acuan: string | null;
  catatan_pa: string | null;
  diajukan_at: string | null;
  diputuskan_at: string | null;
  mahasiswa_id: number;
  nim: string;
  nama: string;
  semester: number;
  prodi: string;
  total_sks: number;
  jumlah_kelas: number;
};

const KRS_BIMBINGAN_SELECT = `SELECT k.id, k.status, k.maks_sks, k.ips_acuan, k.catatan_pa, k.diajukan_at, k.diputuskan_at,
         m.id AS mahasiswa_id, m.nim, m.nama, m.semester, p.nama AS prodi,
         COALESCE(SUM(mk.sks), 0) AS total_sks, COUNT(kd.id) AS jumlah_kelas
    FROM krs k
    JOIN mahasiswa m ON m.id = k.mahasiswa_id
    JOIN prodi p ON p.id = m.prodi_id
    LEFT JOIN krs_detail kd ON kd.krs_id = k.id
    LEFT JOIN kelas kl ON kl.id = kd.kelas_id
    LEFT JOIN mata_kuliah mk ON mk.id = kl.mata_kuliah_id`;

/** KRS mahasiswa bimbingan seorang Dosen PA pada satu semester (hanya bimbingannya sendiri). */
export function getKrsBimbingan(dosenId: number, tahunAkademikId: number, status?: StatusKrs) {
  return query<KrsBimbingan>(
    `${KRS_BIMBINGAN_SELECT}
      WHERE m.dosen_pa_id = ? AND k.tahun_akademik_id = ?${status ? " AND k.status = ?" : ""}
      GROUP BY k.id
      ORDER BY FIELD(k.status, 'diajukan', 'ditolak', 'draf', 'disetujui'), k.diajukan_at, m.nim`,
    status ? [dosenId, tahunAkademikId, status] : [dosenId, tahunAkademikId],
  );
}

/** Satu KRS untuk Dosen PA; null bila bukan bimbingannya (anti-IDOR). */
export function getKrsUntukPa(krsId: number, dosenId: number) {
  return queryOne<KrsBimbingan>(`${KRS_BIMBINGAN_SELECT} WHERE k.id = ? AND m.dosen_pa_id = ? GROUP BY k.id`, [krsId, dosenId]);
}

export type KeputusanKrs = "setujui" | "tolak";

/** Dosen PA menyetujui atau menolak KRS bimbingannya. Penolakan wajib bercatatan dan melepas kuota. */
export async function putuskanKrs(krsId: number, dosenId: number, oleh: number, keputusan: KeputusanKrs, catatan: string) {
  const catatanBersih = catatan.trim().slice(0, 255);
  if (keputusan === "tolak" && catatanBersih.length < 5) {
    throw new GagalAksi("Catatan penolakan wajib diisi (minimal 5 karakter) agar mahasiswa tahu yang harus diperbaiki.");
  }
  return withTransaction(async (conn) => {
    const [krs] = await queryDalam<{ id: number; status: StatusKrs; nim: string; nama: string; user_id: number; dosen_pa_id: number | null }>(
      conn,
      `SELECT k.id, k.status, m.nim, m.nama, m.user_id, m.dosen_pa_id
         FROM krs k JOIN mahasiswa m ON m.id = k.mahasiswa_id
        WHERE k.id = ? FOR UPDATE`,
      [krsId],
    );
    // Pesan sama untuk "tidak ada" dan "bukan bimbingan Anda" agar tidak membocorkan keberadaan data.
    if (!krs || krs.dosen_pa_id !== dosenId) throw new GagalAksi("KRS tidak ditemukan.");
    if (krs.status !== "diajukan") throw new GagalAksi(`KRS ${krs.nama} tidak sedang menunggu persetujuan.`);

    const statusBaru: StatusKrs = keputusan === "setujui" ? "disetujui" : "ditolak";
    if (statusBaru === "ditolak") await lepasKuota(conn, krs.id);
    await conn.execute(
      "UPDATE krs SET status = ?, catatan_pa = ?, diputuskan_at = NOW(), diputuskan_oleh = ? WHERE id = ?",
      [statusBaru, catatanBersih || null, oleh, krs.id],
    );
    await catatAudit(oleh, keputusan === "setujui" ? "krs_setujui" : "krs_tolak", `KRS ${krs.nim}`, conn, {
      entitas: "krs",
      entitasId: krs.id,
      dataLama: { status: "diajukan" },
      dataBaru: { status: statusBaru },
      alasan: catatanBersih || null,
    });
    await conn.execute("INSERT INTO notifikasi (user_id, judul, pesan, tipe, tautan) VALUES (?, ?, ?, ?, '/krs')", [
      krs.user_id,
      keputusan === "setujui" ? "KRS Disetujui Dosen PA" : "KRS Ditolak Dosen PA",
      (keputusan === "setujui" ? "KRS Anda telah disetujui." : `Perbaiki KRS Anda. Catatan: ${catatanBersih}`).slice(0, 255),
      keputusan === "setujui" ? "info" : "peringatan",
    ]);
    return keputusan === "setujui" ? `KRS ${krs.nama} disetujui.` : `KRS ${krs.nama} ditolak.`;
  });
}

/** Persetujuan massal: setiap KRS diproses dalam transaksinya sendiri; yang gagal dilaporkan. */
export async function setujuiKrsMassal(krsIds: number[], dosenId: number, oleh: number) {
  let berhasil = 0;
  const gagal: string[] = [];
  for (const id of krsIds) {
    try {
      await putuskanKrs(id, dosenId, oleh, "setujui", "");
      berhasil++;
    } catch (error) {
      if (!(error instanceof GagalAksi)) throw error;
      gagal.push(error.message);
    }
  }
  return { berhasil, gagal };
}

export function getDosenByUser(userId: number) {
  return queryOne<{ id: number; nidn: string; nama: string; prodi_id: number | null }>(
    "SELECT id, nidn, nama, prodi_id FROM dosen WHERE user_id = ?",
    [userId],
  );
}
