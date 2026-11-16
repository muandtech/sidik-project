import "server-only";
import type { ResultSetHeader } from "mysql2/promise";
import { getTahunAkademikAktif } from "@/lib/akademik";
import { catatAudit } from "@/lib/audit";
import { query, queryDalam, queryOne, withTransaction } from "@/lib/db";
import { GagalAksi } from "@/lib/gagal-aksi";
import { getPengaturan } from "@/lib/konfigurasi";

// Izin mengisi KRS per mahasiswa. PRD 21.4: selama Sprint 2–3 diatur manual oleh Admin Keuangan;
// Sprint 4 menggantinya dengan pembukaan otomatis dari status pembayaran (BR-SD-02).

export const IZIN_PER_HALAMAN = 50;

export type BarisIzinKrs = {
  mahasiswa_id: number;
  nim: string;
  nama: string;
  prodi: string;
  semester: number;
  status_akademik: string;
  boleh_krs: number;
  tagihan_id: number | null;
  status_tagihan: "lunas" | "belum_lunas" | "cicilan" | null;
  jumlah_termin: number;
  termin_lunas: number;
};

export type FilterIzin = { q: string; izin: "" | "diizinkan" | "belum"; halaman: number };

/** Syarat minimal pembayaran (BR-SD-02): lunas, atau cicilan dengan minimal N termin lunas (pengaturan). */
async function minTerminLunas() {
  const n = Number((await getPengaturan()).krs_min_termin_lunas);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** true bila status pembayaran memenuhi syarat KRS. */
export function memenuhiSyaratBayar(b: Pick<BarisIzinKrs, "status_tagihan" | "jumlah_termin" | "termin_lunas">, minTermin: number) {
  if (b.status_tagihan === "lunas") return true;
  return b.jumlah_termin > 0 && b.termin_lunas >= minTermin;
}

const DARI = `FROM mahasiswa m
    JOIN prodi p ON p.id = m.prodi_id
    LEFT JOIN tagihan t ON t.mahasiswa_id = m.id AND t.tahun_akademik = ? AND t.periode = ?
    LEFT JOIN (SELECT tagihan_id, COUNT(*) AS jumlah, SUM(status = 'lunas') AS lunas
                 FROM tagihan_termin GROUP BY tagihan_id) tt ON tt.tagihan_id = t.id`;

/** Mahasiswa aktif beserta status tagihan semester aktif dan izin KRS-nya (dengan paginasi). */
export async function getDaftarIzinKrs(filter: FilterIzin) {
  const ta = await getTahunAkademikAktif();
  if (!ta) return { ta: null, baris: [], totalBaris: 0, halaman: 1, jumlahHalaman: 1, minTermin: 1 };

  const kondisi = ["m.status_akademik = 'aktif'"];
  const params: unknown[] = [ta.tahun, ta.periode];
  if (filter.q) {
    const pola = `%${filter.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    kondisi.push("(m.nama LIKE ? OR m.nim LIKE ?)");
    params.push(pola, pola);
  }
  if (filter.izin) kondisi.push(filter.izin === "diizinkan" ? "m.boleh_krs = 1" : "m.boleh_krs = 0");
  const where = kondisi.join(" AND ");

  const hitung = await queryOne<{ jumlah: number }>(`SELECT COUNT(*) AS jumlah ${DARI} WHERE ${where}`, params);
  const totalBaris = Number(hitung?.jumlah ?? 0);
  const jumlahHalaman = Math.max(1, Math.ceil(totalBaris / IZIN_PER_HALAMAN));
  const halaman = Math.min(Math.max(1, Math.floor(filter.halaman) || 1), jumlahHalaman);

  const baris = await query<BarisIzinKrs>(
    `SELECT m.id AS mahasiswa_id, m.nim, m.nama, p.nama AS prodi, m.semester, m.status_akademik, m.boleh_krs,
            t.id AS tagihan_id, t.status AS status_tagihan,
            COALESCE(tt.jumlah, 0) AS jumlah_termin, COALESCE(tt.lunas, 0) AS termin_lunas
       ${DARI}
      WHERE ${where}
      ORDER BY m.boleh_krs, m.nim
      LIMIT ? OFFSET ?`,
    [...params, IZIN_PER_HALAMAN, (halaman - 1) * IZIN_PER_HALAMAN],
  );
  return { ta, baris, totalBaris, halaman, jumlahHalaman, minTermin: await minTerminLunas() };
}

/** Membuka/menutup izin KRS satu mahasiswa (dicatat di audit log). */
export function setIzinKrs(mahasiswaId: number, boleh: boolean, oleh: number) {
  return withTransaction(async (conn) => {
    const [mhs] = await queryDalam<{ nim: string; nama: string; boleh_krs: number }>(
      conn,
      "SELECT nim, nama, boleh_krs FROM mahasiswa WHERE id = ? FOR UPDATE",
      [mahasiswaId],
    );
    if (!mhs) throw new GagalAksi("Mahasiswa tidak ditemukan.");
    if (Boolean(mhs.boleh_krs) === boleh) return `Izin KRS ${mhs.nama} tidak berubah.`;
    await conn.execute("UPDATE mahasiswa SET boleh_krs = ? WHERE id = ?", [boleh ? 1 : 0, mahasiswaId]);
    await catatAudit(oleh, boleh ? "izin_krs_buka" : "izin_krs_tutup", `${mhs.nim} ${mhs.nama}`, conn, {
      entitas: "mahasiswa",
      entitasId: mahasiswaId,
      dataLama: { boleh_krs: mhs.boleh_krs },
      dataBaru: { boleh_krs: boleh ? 1 : 0 },
    });
    return boleh ? `KRS dibuka untuk ${mhs.nama}.` : `KRS ditutup untuk ${mhs.nama}.`;
  });
}

/** Membuka izin KRS sekaligus untuk semua mahasiswa aktif yang memenuhi syarat pembayaran (BR-SD-02). */
export async function izinkanYangMemenuhiSyarat(oleh: number) {
  const ta = await getTahunAkademikAktif();
  if (!ta) throw new GagalAksi("Semester aktif belum ditetapkan.");
  const minTermin = await minTerminLunas();
  return withTransaction(async (conn) => {
    const [hasil] = await conn.execute<ResultSetHeader>(
      `UPDATE mahasiswa m
         JOIN tagihan t ON t.mahasiswa_id = m.id AND t.tahun_akademik = ? AND t.periode = ?
         LEFT JOIN (SELECT tagihan_id, SUM(status = 'lunas') AS lunas FROM tagihan_termin GROUP BY tagihan_id) tt
                ON tt.tagihan_id = t.id
          SET m.boleh_krs = 1
        WHERE m.status_akademik = 'aktif' AND m.boleh_krs = 0
          AND (t.status = 'lunas' OR COALESCE(tt.lunas, 0) >= ?)`,
      [ta.tahun, ta.periode, minTermin],
    );
    await catatAudit(oleh, "izin_krs_massal", `${hasil.affectedRows} mahasiswa dibuka (${ta.kode}, min ${minTermin} termin lunas)`, conn);
    return `${hasil.affectedRows} mahasiswa yang memenuhi syarat pembayaran kini dapat mengisi KRS.`;
  });
}
