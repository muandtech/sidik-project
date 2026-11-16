-- =====================================================================
-- Migrasi 0003 — Sprint 2 fase 1: multi-role (RBAC), status akademik, SIAKAD (KRS, nilai, jadwal)
-- Untuk database yang sudah berjalan. Aman dijalankan ulang (idempoten).
--   node --env-file-if-exists=.env.local scripts/db.mjs migrations/0003_sprint2_rbac_siakad
-- Instalasi baru tidak perlu menjalankan ini: isinya sudah ada di schema.sql & data-master.sql.
--
-- PERHATIAN (perubahan yang tidak bisa dibalik):
--   • users.role dipindah ke tabel user_roles ('admin' → 'superadmin'), lalu kolomnya dihapus.
--   • Semua session diakhiri (pengguna login ulang) karena session kini menyimpan role aktif.
--   • mahasiswa.total_sks & mahasiswa.ipk dihapus: kini dihitung dari tabel nilai.
--   • Tabel jadwal_kuliah (widget Sprint 1) dihapus: diganti kelas/jadwal hasil KRS.
-- Jalankan dengan akun admin DB, setelah backup.
-- =====================================================================

SET time_zone = '+07:00';

-- 1. Multi-role
CREATE TABLE IF NOT EXISTS user_roles (
  user_id   INT UNSIGNED NOT NULL,
  role      ENUM('mahasiswa','dosen','kaprodi','baak','keuangan','pimpinan','superadmin') NOT NULL,
  prodi_id  INT UNSIGNED NULL COMMENT 'Lingkup prodi untuk role kaprodi',
  PRIMARY KEY (user_id, role),
  INDEX idx_user_roles_role (role),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;


SET @ada = (SELECT COUNT(*) > 0 FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role');
SET @sql = IF(@ada,
  'INSERT IGNORE INTO user_roles (user_id, role) SELECT id, IF(role = ''admin'', ''superadmin'', role) FROM users',
  'DO 0');
PREPARE langkah FROM @sql; EXECUTE langkah; DEALLOCATE PREPARE langkah;
SET @ada = (SELECT COUNT(*) > 0 FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role');
SET @sql = IF(@ada, 'ALTER TABLE users DROP COLUMN role', 'DO 0');
PREPARE langkah FROM @sql; EXECUTE langkah; DEALLOCATE PREPARE langkah;

-- Session lama tidak punya role aktif → diakhiri.
DELETE FROM sessions;
SET @perlu = (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sessions' AND COLUMN_NAME = 'role_aktif');
SET @sql = IF(@perlu, 'ALTER TABLE sessions ADD COLUMN role_aktif ENUM(''mahasiswa'',''dosen'',''kaprodi'',''baak'',''keuangan'',''pimpinan'',''superadmin'') NOT NULL AFTER user_id', 'DO 0');
PREPARE langkah FROM @sql; EXECUTE langkah; DEALLOCATE PREPARE langkah;

-- 2. Status akademik & izin KRS
ALTER TABLE mahasiswa MODIFY status_akademik ENUM('aktif','cuti','nonaktif','lulus','keluar') NOT NULL DEFAULT 'aktif';
SET @perlu = (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mahasiswa' AND COLUMN_NAME = 'boleh_krs');
SET @sql = IF(@perlu, 'ALTER TABLE mahasiswa ADD COLUMN boleh_krs TINYINT(1) NOT NULL DEFAULT 0 AFTER status_akademik', 'DO 0');
PREPARE langkah FROM @sql; EXECUTE langkah; DEALLOCATE PREPARE langkah;

SET @ada = (SELECT COUNT(*) > 0 FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mahasiswa' AND COLUMN_NAME = 'total_sks');
SET @sql = IF(@ada, 'ALTER TABLE mahasiswa DROP COLUMN total_sks', 'DO 0');
PREPARE langkah FROM @sql; EXECUTE langkah; DEALLOCATE PREPARE langkah;

SET @ada = (SELECT COUNT(*) > 0 FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mahasiswa' AND COLUMN_NAME = 'ipk');
SET @sql = IF(@ada, 'ALTER TABLE mahasiswa DROP COLUMN ipk', 'DO 0');
PREPARE langkah FROM @sql; EXECUTE langkah; DEALLOCATE PREPARE langkah;

SET @perlu = (SELECT COUNT(*) = 0 FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mahasiswa' AND INDEX_NAME = 'idx_mhs_pa');
SET @sql = IF(@perlu, 'ALTER TABLE mahasiswa ADD INDEX idx_mhs_pa (dosen_pa_id)', 'DO 0');
PREPARE langkah FROM @sql; EXECUTE langkah; DEALLOCATE PREPARE langkah;

SET @perlu = (SELECT COUNT(*) = 0 FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mahasiswa' AND INDEX_NAME = 'idx_mhs_prodi_status');
SET @sql = IF(@perlu, 'ALTER TABLE mahasiswa ADD INDEX idx_mhs_prodi_status (prodi_id, status_akademik)', 'DO 0');
PREPARE langkah FROM @sql; EXECUTE langkah; DEALLOCATE PREPARE langkah;

-- 3. Menu staf per role
ALTER TABLE menu MODIFY grup ENUM('menu_atas','sidebar','menu_pengguna','aksi_dashboard','aksi_cepat','aksi_biodata','aksi_keuangan','staf') NOT NULL;
SET @perlu = (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menu' AND COLUMN_NAME = 'roles');
SET @sql = IF(@perlu, 'ALTER TABLE menu ADD COLUMN roles SET(''dosen'',''kaprodi'',''baak'',''keuangan'',''pimpinan'',''superadmin'') NULL AFTER grup', 'DO 0');
PREPARE langkah FROM @sql; EXECUTE langkah; DEALLOCATE PREPARE langkah;

-- 4. Tabel SIAKAD
DROP TABLE IF EXISTS jadwal_kuliah;

-- Semester & kalender akademik (FR-AK-04). Hanya satu semester aktif (kolom aktif_unik).
CREATE TABLE IF NOT EXISTS tahun_akademik (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode               CHAR(5)     NOT NULL UNIQUE COMMENT 'mis. 20261 = 2026/2027 Ganjil',
  tahun              VARCHAR(9)  NOT NULL COMMENT 'mis. 2026/2027',
  periode            ENUM('Ganjil','Genap') NOT NULL,
  aktif              TINYINT(1)  NOT NULL DEFAULT 0,
  aktif_unik         TINYINT(1)  AS (IF(aktif = 1, 1, NULL)) STORED,
  krs_mulai          DATE NULL,
  krs_selesai        DATE NULL,
  perubahan_mulai    DATE NULL COMMENT 'Masa tambah/batal KRS',
  perubahan_selesai  DATE NULL,
  kuliah_mulai       DATE NULL,
  kuliah_selesai     DATE NULL,
  uts_mulai          DATE NULL,
  uts_selesai        DATE NULL,
  uas_mulai          DATE NULL,
  uas_selesai        DATE NULL,
  nilai_mulai        DATE NULL COMMENT 'Periode input nilai',
  nilai_selesai      DATE NULL,
  UNIQUE KEY uq_ta_aktif (aktif_unik),
  UNIQUE KEY uq_ta_tahun_periode (tahun, periode)
) ENGINE=InnoDB;

-- Kurikulum per prodi, berlaku untuk angkatan >= angkatan_mulai (FR-AK-02).
CREATE TABLE IF NOT EXISTS kurikulum (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prodi_id        INT UNSIGNED NOT NULL,
  kode            VARCHAR(20)  NOT NULL UNIQUE,
  nama            VARCHAR(120) NOT NULL,
  angkatan_mulai  YEAR         NOT NULL,
  aktif           TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_kurikulum_prodi FOREIGN KEY (prodi_id) REFERENCES prodi(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mata_kuliah (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kurikulum_id  INT UNSIGNED NOT NULL,
  kode          VARCHAR(15)  NOT NULL,
  nama          VARCHAR(120) NOT NULL,
  sks           TINYINT UNSIGNED NOT NULL,
  semester      TINYINT UNSIGNED NOT NULL COMMENT 'Semester anjuran dalam kurikulum',
  jenis         ENUM('wajib','pilihan') NOT NULL DEFAULT 'wajib',
  aktif         TINYINT(1)   NOT NULL DEFAULT 1 COMMENT 'Data yang sudah dipakai dinonaktifkan, bukan dihapus',
  UNIQUE KEY uq_mk_kurikulum (kurikulum_id, kode),
  CONSTRAINT fk_mk_kurikulum FOREIGN KEY (kurikulum_id) REFERENCES kurikulum(id)
) ENGINE=InnoDB;

-- BR-SD-04: mata kuliah hanya dapat diambil bila prasyaratnya lulus (nilai minimal di pengaturan).
CREATE TABLE IF NOT EXISTS prasyarat_mk (
  mata_kuliah_id  INT UNSIGNED NOT NULL,
  prasyarat_id    INT UNSIGNED NOT NULL,
  PRIMARY KEY (mata_kuliah_id, prasyarat_id),
  CONSTRAINT fk_prasyarat_mk  FOREIGN KEY (mata_kuliah_id) REFERENCES mata_kuliah(id) ON DELETE CASCADE,
  CONSTRAINT fk_prasyarat_req FOREIGN KEY (prasyarat_id)   REFERENCES mata_kuliah(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ruang (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode       VARCHAR(20)  NOT NULL UNIQUE,
  nama       VARCHAR(80)  NOT NULL,
  kapasitas  SMALLINT UNSIGNED NOT NULL
) ENGINE=InnoDB;

-- Kelas yang ditawarkan pada satu semester (FR-AK-05). `terisi` dinaikkan secara atomik saat KRS diajukan.
CREATE TABLE IF NOT EXISTS kelas (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tahun_akademik_id  INT UNSIGNED NOT NULL,
  mata_kuliah_id     INT UNSIGNED NOT NULL,
  nama               VARCHAR(5)   NOT NULL COMMENT 'A, B, ...',
  dosen_id           INT UNSIGNED NULL,
  kuota              SMALLINT UNSIGNED NOT NULL,
  terisi             SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_kelas (tahun_akademik_id, mata_kuliah_id, nama),
  INDEX idx_kelas_dosen (dosen_id, tahun_akademik_id),
  CONSTRAINT ck_kelas_kuota CHECK (terisi <= kuota),
  CONSTRAINT fk_kelas_ta    FOREIGN KEY (tahun_akademik_id) REFERENCES tahun_akademik(id),
  CONSTRAINT fk_kelas_mk    FOREIGN KEY (mata_kuliah_id)    REFERENCES mata_kuliah(id),
  CONSTRAINT fk_kelas_dosen FOREIGN KEY (dosen_id)          REFERENCES dosen(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS jadwal (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kelas_id     INT UNSIGNED NOT NULL,
  hari         TINYINT UNSIGNED NOT NULL COMMENT '1=Senin ... 7=Minggu',
  jam_mulai    TIME NOT NULL,
  jam_selesai  TIME NOT NULL,
  ruang_id     INT UNSIGNED NULL,
  INDEX idx_jadwal_kelas (kelas_id),
  INDEX idx_jadwal_ruang (ruang_id, hari),
  CONSTRAINT fk_jadwal_kelas FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE,
  CONSTRAINT fk_jadwal_ruang FOREIGN KEY (ruang_id) REFERENCES ruang(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- BR-SD-01: satu KRS per mahasiswa per tahun akademik.
CREATE TABLE IF NOT EXISTS krs (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mahasiswa_id       INT UNSIGNED NOT NULL,
  tahun_akademik_id  INT UNSIGNED NOT NULL,
  status             ENUM('draf','diajukan','disetujui','ditolak') NOT NULL DEFAULT 'draf',
  maks_sks           TINYINT UNSIGNED NOT NULL COMMENT 'Batas SKS saat KRS dibuat (BR-SD-03)',
  ips_acuan          DECIMAL(3,2) NULL COMMENT 'IPS semester sebelumnya; NULL = paket semester 1',
  catatan_pa         VARCHAR(255) NULL,
  diajukan_at        DATETIME NULL,
  diputuskan_at      DATETIME NULL,
  diputuskan_oleh    INT UNSIGNED NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_krs (mahasiswa_id, tahun_akademik_id),
  INDEX idx_krs_ta_status (tahun_akademik_id, status),
  CONSTRAINT fk_krs_mhs   FOREIGN KEY (mahasiswa_id)      REFERENCES mahasiswa(id) ON DELETE CASCADE,
  CONSTRAINT fk_krs_ta    FOREIGN KEY (tahun_akademik_id) REFERENCES tahun_akademik(id),
  CONSTRAINT fk_krs_oleh  FOREIGN KEY (diputuskan_oleh)   REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS krs_detail (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  krs_id    INT UNSIGNED NOT NULL,
  kelas_id  INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_krs_detail (krs_id, kelas_id),
  INDEX idx_krs_detail_kelas (kelas_id),
  CONSTRAINT fk_krsd_krs   FOREIGN KEY (krs_id)   REFERENCES krs(id) ON DELETE CASCADE,
  CONSTRAINT fk_krsd_kelas FOREIGN KEY (kelas_id) REFERENCES kelas(id)
) ENGINE=InnoDB;

-- Nilai resmi per mata kuliah. BR-SD-06: hanya nilai terpublikasi yang tampil di KHS.
CREATE TABLE IF NOT EXISTS nilai (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  krs_detail_id   INT UNSIGNED NOT NULL UNIQUE,
  nilai_angka     DECIMAL(5,2) NULL,
  nilai_huruf     VARCHAR(2)   NOT NULL,
  bobot           DECIMAL(3,2) NOT NULL,
  status          ENUM('draf','terpublikasi') NOT NULL DEFAULT 'draf',
  dipublikasi_at  DATETIME NULL,
  CONSTRAINT fk_nilai_krsd FOREIGN KEY (krs_detail_id) REFERENCES krs_detail(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Konversi nilai huruf → bobot mutu (FR-AK-14, dapat dikonfigurasi).
CREATE TABLE IF NOT EXISTS bobot_nilai (
  huruf      VARCHAR(2)   PRIMARY KEY,
  nilai_min  DECIMAL(5,2) NOT NULL COMMENT 'Nilai angka minimal untuk huruf ini',
  bobot      DECIMAL(3,2) NOT NULL,
  lulus      TINYINT(1)   NOT NULL COMMENT '1 = SKS dihitung lulus'
) ENGINE=InnoDB;

-- BR-SD-03: batas SKS berdasarkan IPS semester sebelumnya (dikonfigurasi BAAK).
CREATE TABLE IF NOT EXISTS batas_sks (
  ips_min   DECIMAL(3,2) PRIMARY KEY,
  maks_sks  TINYINT UNSIGNED NOT NULL
) ENGINE=InnoDB;


-- 5. Data master baru (INSERT IGNORE: nilai yang sudah diubah kampus tidak ditimpa)
INSERT IGNORE INTO pengaturan (kunci, nilai, keterangan) VALUES
  ('krs_huruf_min_prasyarat', 'C', 'Nilai huruf minimal agar prasyarat dianggap lulus (BR-SD-04); harus ada di tabel bobot_nilai'),
  ('krs_min_termin_lunas',   '1', 'Jumlah termin cicilan minimal yang lunas agar mahasiswa memenuhi syarat KRS (BR-SD-02)'),
  ('ipk_nilai_ulang',        'terbaik', 'Nilai yang dipakai bila mata kuliah diulang: terbaik atau terakhir (perlu konfirmasi BAAK)'),
  ('password_min_panjang',   '8', 'Panjang minimal password baru (SD-S2-04)'),
  ('pesan_status_mahasiswa_ditolak', 'Status akademik Anda tidak lagi aktif sehingga tidak dapat masuk ke portal mahasiswa.', 'Pesan login untuk mahasiswa lulus/keluar');

UPDATE pengaturan SET nilai = 'Sudah tersedia: Biodata, Tagihan & Keuangan, KRS, KHS, Transkrip, dan Jadwal Kuliah'
 WHERE kunci = 'coming_soon_catatan' AND nilai LIKE 'Tersedia di Sprint 1%';

INSERT IGNORE INTO bobot_nilai (huruf, nilai_min, bobot, lulus) VALUES
  ('A', 85, 4.00, 1),
  ('A-', 80, 3.75, 1),
  ('B+', 75, 3.50, 1),
  ('B', 70, 3.00, 1),
  ('B-', 65, 2.75, 1),
  ('C+', 60, 2.50, 1),
  ('C', 55, 2.00, 1),
  ('D', 45, 1.00, 0),
  ('E', 0, 0.00, 0);

INSERT IGNORE INTO batas_sks (ips_min, maks_sks) VALUES
  (3.00, 24),
  (2.50, 21),
  (2.00, 18),
  (0.00, 15);


INSERT IGNORE INTO fitur (slug, nama, deskripsi, status, rute, rencana_sprint) VALUES
  ('keuangan-rekap',   'Rekap Pembayaran', 'Rekap pembayaran mahasiswa per bulan, ACC dan koreksi.', 'tersedia', '/admin-keuangan', 1),
  ('ganti-password-staf', 'Ganti Password', 'Mengganti password akun staf.', 'tersedia', '/staf/ganti-password', 2),
  ('staf-beranda',     'Beranda', 'Ringkasan sesuai role aktif.', 'tersedia', '/staf', 2),
  ('perwalian',        'Persetujuan KRS', 'Daftar KRS mahasiswa bimbingan yang menunggu persetujuan Dosen PA.', 'tersedia', '/staf/perwalian', 2),
  ('kelas-ampu',       'Kelas Saya', 'Kelas yang diampu pada semester aktif beserta jadwal dan peserta.', 'tersedia', '/staf/kelas', 2),
  ('izin-krs',         'Izin KRS', 'Mengatur izin mengisi KRS per mahasiswa berdasarkan status pembayaran (sementara sampai Sprint 4).', 'tersedia', '/admin-keuangan/izin-krs', 2),
  ('audit-log',        'Audit Log', 'Jejak aktivitas penting: pelaku, aksi, data sebelum/sesudah, IP, dan waktu.', 'tersedia', '/staf/audit', 2),
  ('master-akademik',  'Master Akademik', 'Kelola fakultas, prodi, kurikulum, mata kuliah, kelas, ruang, dan jadwal (dengan deteksi bentrok).', 'segera', NULL, 2),
  ('kelola-pengguna',  'Pengguna & Role', 'Membuat, menonaktifkan, dan mereset password pengguna serta mengatur role.', 'segera', NULL, 2),
  ('kelola-pengumuman','Kelola Pengumuman', 'Menerbitkan pengumuman dengan target audiens dan jadwal tayang.', 'segera', NULL, 2);


UPDATE fitur SET status = 'tersedia', rute = '/khs' WHERE slug = 'ringkasan-akademik' AND status = 'segera';
UPDATE fitur SET status = 'tersedia', rute = '/ganti-password' WHERE slug = 'ganti-password' AND status = 'segera';
UPDATE fitur SET status = 'tersedia', rute = '/jadwal' WHERE slug = 'jadwal-kuliah' AND status = 'segera';
UPDATE fitur SET status = 'tersedia', rute = '/jadwal/prodi' WHERE slug = 'jadwal-kuliah-prodi' AND status = 'segera';
UPDATE fitur SET status = 'tersedia', rute = '/krs' WHERE slug = 'isi-krs' AND status = 'segera';
UPDATE fitur SET status = 'tersedia', rute = '/kalender' WHERE slug = 'kalender-akademik' AND status = 'segera';
UPDATE fitur SET status = 'tersedia', rute = '/khs' WHERE slug = 'nilai' AND status = 'segera';
UPDATE fitur SET status = 'tersedia', rute = '/khs' WHERE slug = 'khs' AND status = 'segera';
UPDATE fitur SET status = 'tersedia', rute = '/transkrip' WHERE slug = 'transkrip' AND status = 'segera';
UPDATE fitur SET status = 'tersedia', rute = '/staf' WHERE slug = 'modul-dosen-admin' AND status = 'segera';

-- Menu staf (hanya bila belum ada)
INSERT INTO menu (grup, roles, label, ikon, fitur_slug, urutan)
  SELECT 'staf', 'dosen,kaprodi,baak,keuangan,pimpinan,superadmin', 'Beranda', 'House', 'staf-beranda', 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM menu WHERE grup = 'staf' AND fitur_slug = 'staf-beranda');
INSERT INTO menu (grup, roles, label, ikon, fitur_slug, urutan)
  SELECT 'staf', 'dosen,kaprodi', 'Persetujuan KRS', 'ClipboardList', 'perwalian', 2 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM menu WHERE grup = 'staf' AND fitur_slug = 'perwalian');
INSERT INTO menu (grup, roles, label, ikon, fitur_slug, urutan)
  SELECT 'staf', 'dosen,kaprodi', 'Kelas Saya', 'GraduationCap', 'kelas-ampu', 3 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM menu WHERE grup = 'staf' AND fitur_slug = 'kelas-ampu');
INSERT INTO menu (grup, roles, label, ikon, fitur_slug, urutan)
  SELECT 'staf', 'keuangan', 'Rekap Pembayaran', 'Wallet', 'keuangan-rekap', 4 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM menu WHERE grup = 'staf' AND fitur_slug = 'keuangan-rekap');
INSERT INTO menu (grup, roles, label, ikon, fitur_slug, urutan)
  SELECT 'staf', 'keuangan', 'Izin KRS', 'PencilLine', 'izin-krs', 5 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM menu WHERE grup = 'staf' AND fitur_slug = 'izin-krs');
INSERT INTO menu (grup, roles, label, ikon, fitur_slug, urutan)
  SELECT 'staf', 'baak,superadmin', 'Master Akademik', 'BookOpen', 'master-akademik', 6 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM menu WHERE grup = 'staf' AND fitur_slug = 'master-akademik');
INSERT INTO menu (grup, roles, label, ikon, fitur_slug, urutan)
  SELECT 'staf', 'baak', 'Kelola Pengumuman', 'Megaphone', 'kelola-pengumuman', 7 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM menu WHERE grup = 'staf' AND fitur_slug = 'kelola-pengumuman');
INSERT INTO menu (grup, roles, label, ikon, fitur_slug, urutan)
  SELECT 'staf', 'superadmin', 'Pengguna & Role', 'Users', 'kelola-pengguna', 8 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM menu WHERE grup = 'staf' AND fitur_slug = 'kelola-pengguna');
INSERT INTO menu (grup, roles, label, ikon, fitur_slug, urutan)
  SELECT 'staf', 'pimpinan,superadmin', 'Audit Log', 'FileText', 'audit-log', 9 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM menu WHERE grup = 'staf' AND fitur_slug = 'audit-log');
INSERT INTO menu (grup, roles, label, ikon, fitur_slug, urutan)
  SELECT 'staf', 'dosen,kaprodi,baak,keuangan,pimpinan,superadmin', 'Ganti Password', 'KeyRound', 'ganti-password-staf', 10 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM menu WHERE grup = 'staf' AND fitur_slug = 'ganti-password-staf');
