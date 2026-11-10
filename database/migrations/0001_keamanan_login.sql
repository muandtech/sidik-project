-- =====================================================================
-- Migrasi 0001 — Keamanan login (audit 2026-11-10: T2 anti-replay CAPTCHA, T3 rate limiting)
-- Untuk database yang sudah berjalan. Aman dijalankan ulang (idempoten), tidak menghapus data.
--   node --env-file-if-exists=.env.local scripts/db.mjs migrations/0001_keamanan_login
-- Instalasi baru tidak perlu menjalankan ini: isinya sudah ada di schema.sql & data-master.sql.
-- =====================================================================

SET time_zone = '+07:00';

CREATE TABLE IF NOT EXISTS login_gagal (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identifier  VARCHAR(120) NULL COMMENT 'NIM/username/email dalam huruf kecil',
  ip_address  VARCHAR(45)  NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_gagal_identifier (identifier, created_at),
  INDEX idx_login_gagal_ip (ip_address, created_at),
  INDEX idx_login_gagal_waktu (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS captcha_terpakai (
  nonce           VARCHAR(32) PRIMARY KEY,
  kedaluwarsa_at  DATETIME    NOT NULL,
  INDEX idx_captcha_kedaluwarsa (kedaluwarsa_at)
) ENGINE=InnoDB;

INSERT IGNORE INTO pengaturan (kunci, nilai, keterangan) VALUES
  ('login_maks_gagal_akun',  '5', 'Batas login gagal per akun dalam jendela waktu; lewat batas → akun dikunci sementara (NFR-04)'),
  ('login_maks_gagal_ip',    '100', 'Batas login gagal per IP dalam jendela waktu; dibuat longgar karena mahasiswa di Wi-Fi kampus berbagi satu IP'),
  ('login_jendela_menit',    '15', 'Jendela waktu penghitungan login gagal sekaligus lama penguncian (menit)');
