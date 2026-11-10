import "server-only";
import { db, queryOne } from "@/lib/db";
import { getPengaturan } from "@/lib/konfigurasi";

// Rate limiting login (NFR-04, temuan audit T3). Percobaan gagal dicatat di tabel login_gagal — bukan
// di memori proses — supaya batasnya tetap berlaku bila aplikasi berjalan di beberapa instance.
//
// Batas dihitung dengan jendela geser: akun/IP terkunci selama dalam `jendelaMenit` terakhir ada
// minimal `maks` percobaan gagal. Kunci terbuka sendiri ketika percobaan tertua keluar dari jendela.

export type AturanBatasLogin = {
  /** Maksimal gagal per akun (NIM/username/email) dalam satu jendela. */
  maksGagalAkun: number;
  /** Maksimal gagal per IP. Dibuat longgar karena ribuan mahasiswa di Wi-Fi kampus berbagi satu IP publik. */
  maksGagalIp: number;
  jendelaMenit: number;
};

function angkaPositif(nilai: string | undefined, kunci: string) {
  const angka = Number(nilai);
  if (!Number.isInteger(angka) || angka <= 0) {
    throw new Error(`Pengaturan "${kunci}" belum diisi atau tidak valid di tabel pengaturan.`);
  }
  return angka;
}

export async function getAturanBatasLogin(): Promise<AturanBatasLogin> {
  const p = await getPengaturan();
  return {
    maksGagalAkun: angkaPositif(p.login_maks_gagal_akun, "login_maks_gagal_akun"),
    maksGagalIp: angkaPositif(p.login_maks_gagal_ip, "login_maks_gagal_ip"),
    jendelaMenit: angkaPositif(p.login_jendela_menit, "login_jendela_menit"),
  };
}

/** Kunci pencatatan akun: sama untuk "Budi@IAIS.ac.id" dan "budi@iais.ac.id". */
export function kunciAkun(identifier: string) {
  return identifier.trim().toLowerCase().slice(0, 120);
}

/** Sisa menit sampai `kolom = nilai` boleh mencoba lagi; 0 bila belum mencapai batas. */
async function sisaMenit(kolom: "identifier" | "ip_address", nilai: string, maks: number, jendelaMenit: number) {
  // Percobaan gagal ke-`maks` yang paling baru: kunci terbuka ketika percobaan ini keluar dari jendela.
  const baris = await queryOne<{ sisa_detik: number }>(
    `SELECT TIMESTAMPDIFF(SECOND, NOW(), created_at + INTERVAL ? MINUTE) AS sisa_detik
       FROM login_gagal
      WHERE ${kolom} = ? AND created_at > NOW() - INTERVAL ? MINUTE
      ORDER BY created_at DESC, id DESC
      LIMIT 1 OFFSET ?`,
    [jendelaMenit, nilai, jendelaMenit, maks - 1],
  );
  return baris ? Math.max(1, Math.ceil(Number(baris.sisa_detik) / 60)) : 0;
}

/** Sisa menit penguncian untuk akun atau IP ini; 0 berarti boleh mencoba login. */
export async function sisaKunciLogin(identifier: string, ip: string | null, aturan: AturanBatasLogin) {
  const [akun, alamat] = await Promise.all([
    sisaMenit("identifier", kunciAkun(identifier), aturan.maksGagalAkun, aturan.jendelaMenit),
    ip ? sisaMenit("ip_address", ip, aturan.maksGagalIp, aturan.jendelaMenit) : 0,
  ]);
  return Math.max(akun, alamat);
}

/**
 * Mencatat satu percobaan gagal. `identifier` null untuk kegagalan yang tidak boleh mengunci akun
 * (mis. salah ketik CAPTCHA) — hanya dihitung per IP.
 */
export async function catatLoginGagal(identifier: string | null, ip: string | null) {
  await db.execute("INSERT INTO login_gagal (identifier, ip_address) VALUES (?, ?)", [
    identifier === null ? null : kunciAkun(identifier),
    ip,
  ]);
  // Data lebih dari sehari tidak dipakai lagi; riwayat lengkap tetap ada di audit_log.
  await db.execute("DELETE FROM login_gagal WHERE created_at < NOW() - INTERVAL 1 DAY");
}

/**
 * Login berhasil: hitungan gagal akun ini direset. Barisnya tidak dihapus, hanya dilepas dari akun,
 * supaya hitungan per IP tetap utuh (login ke akun sendiri tidak boleh "membersihkan" IP penyerang).
 */
export async function resetLoginGagal(identifier: string) {
  await db.execute("UPDATE login_gagal SET identifier = NULL WHERE identifier = ?", [kunciAkun(identifier)]);
}
