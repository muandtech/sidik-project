import type { ExecuteValues, ResultSetHeader } from "mysql2/promise";
import { db, queryOne } from "@/lib/db";

// Data uji fiktif untuk modul keuangan. Setiap tagihan dibuat untuk mahasiswa baru supaya test tidak saling
// bergantung (audit_log append-only, jadi test tidak menghapus data melainkan memakai id masing-masing).

let urut = 0;

async function sisip(sql: string, params: ExecuteValues[]) {
  const [hasil] = await db.execute<ResultSetHeader>(sql, params);
  return hasil.insertId;
}

async function prodiUji() {
  await db.execute("INSERT IGNORE INTO fakultas (kode, nama) VALUES ('FUJI', 'Fakultas Uji')");
  const fakultas = await queryOne<{ id: number }>("SELECT id FROM fakultas WHERE kode = 'FUJI'");
  if (!fakultas) throw new Error("Fakultas uji gagal dibuat");
  await db.execute("INSERT IGNORE INTO prodi (fakultas_id, kode, nama, jenjang) VALUES (?, 'PUJI', 'Prodi Uji', 'S1')", [
    fakultas.id,
  ]);
  const prodi = await queryOne<{ id: number }>("SELECT id FROM prodi WHERE kode = 'PUJI'");
  if (!prodi) throw new Error("Prodi uji gagal dibuat");
  return prodi.id;
}

export async function buatUser(role: "mahasiswa" | "keuangan" = "mahasiswa") {
  urut += 1;
  const username = `uji${Date.now() % 1e7}${urut}`;
  return sisip("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, 'x', ?)", [
    username,
    `${username}@uji.test`,
    role,
  ]);
}

export type OpsiTagihan = {
  nama?: string;
  tahunAkademik?: string;
  periode?: "Ganjil" | "Genap";
  jumlah?: number;
  dibayar?: number;
  status?: "lunas" | "belum_lunas" | "cicilan";
  jatuhTempo?: string;
};

/** Mahasiswa baru + satu tagihan; mengembalikan id tagihan, user mahasiswa, dan nomor tagihan. */
export async function buatTagihan(opsi: OpsiTagihan = {}) {
  const userId = await buatUser("mahasiswa");
  const nim = `99${String(userId).padStart(8, "0")}`;
  const mahasiswaId = await sisip(
    "INSERT INTO mahasiswa (user_id, nim, nama, prodi_id, angkatan) VALUES (?, ?, ?, ?, 2026)",
    [userId, nim, opsi.nama ?? `Mahasiswa Uji ${userId}`, await prodiUji()],
  );
  const noTagihan = `TGH-UJI-${nim}`;
  const tagihanId = await sisip(
    `INSERT INTO tagihan (no_tagihan, mahasiswa_id, semester_ke, periode, tahun_akademik, jenis_pembayaran,
                          jumlah, dibayar, status, jatuh_tempo)
     VALUES (?, ?, 1, ?, ?, 'UKT / SPP Tetap', ?, ?, ?, ?)`,
    [
      noTagihan,
      mahasiswaId,
      opsi.periode ?? "Ganjil",
      opsi.tahunAkademik ?? "2026/2027",
      opsi.jumlah ?? 6_000_000,
      opsi.dibayar ?? 0,
      opsi.status ?? "belum_lunas",
      opsi.jatuhTempo ?? "2026-09-30",
    ],
  );
  return { tagihanId, userId, nim, noTagihan };
}
