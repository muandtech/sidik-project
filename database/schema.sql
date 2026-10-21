-- =====================================================================
-- SIDIK — Sistem Informasi Akademik IAI Sukabumi
-- 1/3 Skema tabel (tanpa data)
--
-- Urutan import: schema.sql → data-master.sql → (opsional) data-demo.sql
-- Lewat terminal: npm run db:setup  (lalu npm run db:demo untuk data contoh)
-- Lewat phpMyAdmin: buat/pilih database sidik_db, lalu Import ketiga berkas berurutan.
-- PERINGATAN: berkas ini menghapus lalu membuat ulang seluruh tabel SIDIK.
-- =====================================================================

SET time_zone = '+07:00';
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS menu, fitur, pengaturan, tagihan_termin, tagihan, aktivitas, notifikasi, pengumuman,
  kategori_pengumuman, jadwal_kuliah, dokumen_mahasiswa, orang_tua_wali, mahasiswa, dosen,
  prodi, fakultas, audit_log, sessions, users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Konfigurasi aplikasi (dikelola lewat database, bukan di kode)
-- ---------------------------------------------------------------------
CREATE TABLE pengaturan (
  kunci       VARCHAR(60)  PRIMARY KEY,
  nilai       TEXT         NOT NULL,
  keterangan  VARCHAR(255) NULL
) ENGINE=InnoDB;

-- Setiap fitur portal. status 'tersedia' → tautan menuju `rute`;
-- status 'segera' → tautan otomatis menuju halaman Coming Soon /coming-soon/{slug}.
-- Mengaktifkan fitur di sprint berikutnya cukup dengan mengubah status & rute.
CREATE TABLE fitur (
  slug            VARCHAR(60)  PRIMARY KEY,
  nama            VARCHAR(120) NOT NULL,
  deskripsi       VARCHAR(255) NOT NULL,
  status          ENUM('tersedia','segera') NOT NULL DEFAULT 'segera',
  rute            VARCHAR(120) NULL COMMENT 'Wajib diisi bila status tersedia',
  rencana_sprint  TINYINT UNSIGNED NULL
) ENGINE=InnoDB;

-- Semua menu & tombol aksi portal. Item induk sidebar (punya submenu) tidak memiliki fitur_slug.
CREATE TABLE menu (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  grup        ENUM('menu_atas','sidebar','menu_pengguna','aksi_dashboard','aksi_cepat','aksi_biodata','aksi_keuangan') NOT NULL,
  parent_id   INT UNSIGNED NULL,
  label       VARCHAR(80)  NOT NULL,
  ikon        VARCHAR(40)  NULL COMMENT 'Nama ikon lucide, mis. House, Wallet',
  fitur_slug  VARCHAR(60)  NULL,
  varian      ENUM('primary','outline','plain','soft') NULL COMMENT 'Gaya tombol untuk grup aksi_*',
  urutan      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  aktif       TINYINT(1) NOT NULL DEFAULT 1,
  INDEX idx_menu_grup (grup, aktif, urutan),
  CONSTRAINT fk_menu_parent FOREIGN KEY (parent_id)  REFERENCES menu(id) ON DELETE CASCADE,
  CONSTRAINT fk_menu_fitur  FOREIGN KEY (fitur_slug) REFERENCES fitur(slug) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Pengguna & autentikasi
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE COMMENT 'NIM / NIDN',
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('mahasiswa','dosen','keuangan','admin') NOT NULL DEFAULT 'mahasiswa',
  nama          VARCHAR(120) NULL COMMENT 'Nama tampilan akun staf yang tidak punya profil mahasiswa/dosen',
  status        ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
  last_login    DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE sessions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  CHAR(64)     NOT NULL UNIQUE COMMENT 'SHA-256 dari token cookie',
  expires_at  DATETIME     NOT NULL,
  ip_address  VARCHAR(45)  NULL,
  user_agent  VARCHAR(255) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE audit_log (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NULL,
  aksi        VARCHAR(50)  NOT NULL COMMENT 'login_sukses, login_gagal, logout, tagihan_*',
  keterangan  VARCHAR(255) NULL,
  ip_address  VARCHAR(45)  NULL,
  user_agent  VARCHAR(255) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Struktur akademik
-- ---------------------------------------------------------------------
CREATE TABLE fakultas (
  id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode  VARCHAR(10)  NOT NULL UNIQUE,
  nama  VARCHAR(120) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE prodi (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fakultas_id INT UNSIGNED NOT NULL,
  kode        VARCHAR(10)  NOT NULL UNIQUE,
  nama        VARCHAR(120) NOT NULL,
  jenjang     VARCHAR(5)   NOT NULL DEFAULT 'S1',
  akreditasi  VARCHAR(20)  NULL,
  CONSTRAINT fk_prodi_fakultas FOREIGN KEY (fakultas_id) REFERENCES fakultas(id)
) ENGINE=InnoDB;

CREATE TABLE dosen (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id   INT UNSIGNED NULL UNIQUE,
  nidn      VARCHAR(20)  NOT NULL UNIQUE,
  nama      VARCHAR(120) NOT NULL COMMENT 'Nama lengkap dengan gelar',
  prodi_id  INT UNSIGNED NULL,
  jabatan   VARCHAR(60)  NULL,
  CONSTRAINT fk_dosen_user  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_dosen_prodi FOREIGN KEY (prodi_id) REFERENCES prodi(id)
) ENGINE=InnoDB;

CREATE TABLE mahasiswa (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED NOT NULL UNIQUE,
  nim              VARCHAR(20)  NOT NULL UNIQUE,
  nama             VARCHAR(120) NOT NULL,
  prodi_id         INT UNSIGNED NOT NULL,
  angkatan         YEAR         NOT NULL,
  semester         TINYINT UNSIGNED NOT NULL DEFAULT 1,
  dosen_pa_id      INT UNSIGNED NULL,
  status_akademik  ENUM('aktif','cuti','nonaktif','lulus') NOT NULL DEFAULT 'aktif',
  tempat_lahir     VARCHAR(60)  NULL,
  tanggal_lahir    DATE         NULL,
  jenis_kelamin    ENUM('L','P') NULL,
  agama            VARCHAR(20)  NULL,
  kewarganegaraan  VARCHAR(60)  NULL,
  golongan_darah   VARCHAR(3)   NULL,
  no_hp            VARCHAR(20)  NULL,
  email_kampus     VARCHAR(120) NULL,
  alamat_ktp       VARCHAR(255) NULL,
  alamat_domisili  VARCHAR(255) NULL,
  foto             VARCHAR(255) NULL COMMENT 'Path relatif di /public',
  total_sks        SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'SKS lulus nilai A/B/C',
  ipk              DECIMAL(3,2) NULL,
  nilai_tilawah    VARCHAR(5)   NULL,
  CONSTRAINT fk_mhs_user  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mhs_prodi FOREIGN KEY (prodi_id)    REFERENCES prodi(id),
  CONSTRAINT fk_mhs_pa    FOREIGN KEY (dosen_pa_id) REFERENCES dosen(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE orang_tua_wali (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mahasiswa_id    INT UNSIGNED NOT NULL UNIQUE,
  nama_ayah       VARCHAR(120) NULL,
  nama_ibu        VARCHAR(120) NULL,
  pekerjaan       VARCHAR(80)  NULL,
  kontak_darurat  VARCHAR(20)  NULL,
  CONSTRAINT fk_ortu_mhs FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE dokumen_mahasiswa (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mahasiswa_id  INT UNSIGNED NOT NULL,
  jenis         VARCHAR(60)  NOT NULL,
  ukuran_kb     INT UNSIGNED NULL,
  status        ENUM('terverifikasi','pending','belum_ada') NOT NULL DEFAULT 'belum_ada',
  file_path     VARCHAR(255) NULL,
  urutan        TINYINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_dok_mhs FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Jadwal sederhana untuk widget "Agenda Hari Ini".
-- Sprint 2 akan menggantinya dengan kelas/jadwal hasil KRS.
CREATE TABLE jadwal_kuliah (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mahasiswa_id  INT UNSIGNED NOT NULL,
  kode_mk       VARCHAR(15)  NOT NULL,
  nama_mk       VARCHAR(120) NOT NULL,
  sks           TINYINT UNSIGNED NOT NULL DEFAULT 2,
  dosen_id      INT UNSIGNED NULL,
  ruang         VARCHAR(40)  NOT NULL,
  hari          TINYINT UNSIGNED NOT NULL COMMENT '1=Senin ... 7=Minggu',
  jam_mulai     TIME NOT NULL,
  jam_selesai   TIME NOT NULL,
  INDEX idx_jadwal_hari (mahasiswa_id, hari),
  CONSTRAINT fk_jadwal_mhs   FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE,
  CONSTRAINT fk_jadwal_dosen FOREIGN KEY (dosen_id)     REFERENCES dosen(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Informasi: pengumuman, notifikasi, aktivitas
-- ---------------------------------------------------------------------
CREATE TABLE kategori_pengumuman (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode    VARCHAR(30)  NOT NULL UNIQUE COMMENT 'Dipakai di URL filter, mis. akademik',
  nama    VARCHAR(80)  NOT NULL,
  urutan  SMALLINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE pengumuman (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  judul         VARCHAR(160) NOT NULL,
  ringkasan     VARCHAR(255) NOT NULL,
  isi           TEXT         NOT NULL,
  kategori_id   INT UNSIGNED NOT NULL,
  target        ENUM('semua','mahasiswa','dosen') NOT NULL DEFAULT 'semua',
  penulis       VARCHAR(80)  NOT NULL,
  tanggal_acara DATETIME     NULL COMMENT 'Diisi untuk kategori agenda',
  published_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pengumuman_pub (published_at),
  CONSTRAINT fk_pengumuman_kategori FOREIGN KEY (kategori_id) REFERENCES kategori_pengumuman(id)
) ENGINE=InnoDB;

CREATE TABLE notifikasi (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  judul       VARCHAR(160) NOT NULL,
  pesan       VARCHAR(255) NOT NULL,
  tipe        ENUM('peringatan','dokumen','jadwal','info') NOT NULL DEFAULT 'info',
  tautan      VARCHAR(255) NULL,
  dibaca_at   DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id, dibaca_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE aktivitas (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  judul       VARCHAR(160) NOT NULL,
  ikon        ENUM('edit','unduh','bayar','info') NOT NULL DEFAULT 'info',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_aktivitas_user (user_id, created_at),
  CONSTRAINT fk_aktivitas_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Keuangan
-- Tagihan tanpa termin dibayar sekaligus; tagihan dengan termin dicicil per bulan.
-- Kolom dibayar/status/tanggal_bayar tagihan bercicilan dihitung ulang dari tagihan_termin.
-- ---------------------------------------------------------------------
CREATE TABLE tagihan (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  no_tagihan        VARCHAR(30)  NOT NULL UNIQUE,
  mahasiswa_id      INT UNSIGNED NOT NULL,
  semester_ke       TINYINT UNSIGNED NOT NULL,
  periode           ENUM('Ganjil','Genap') NOT NULL,
  tahun_akademik    VARCHAR(9)   NOT NULL COMMENT 'mis. 2026/2027',
  jenis_pembayaran  VARCHAR(80)  NOT NULL,
  jumlah            DECIMAL(12,0) NOT NULL,
  dibayar           DECIMAL(12,0) NOT NULL DEFAULT 0,
  status            ENUM('lunas','belum_lunas','cicilan') NOT NULL DEFAULT 'belum_lunas',
  jatuh_tempo       DATE NOT NULL,
  tanggal_bayar     DATETIME NULL,
  metode_bayar      VARCHAR(40) NULL,
  no_kuitansi       VARCHAR(30) NULL UNIQUE,
  UNIQUE KEY uq_tagihan_semester (mahasiswa_id, semester_ke),
  CONSTRAINT fk_tagihan_mhs FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Cicilan per bulan (FR-KEU-08). Jumlah seluruh termin = tagihan.jumlah.
-- Status termin hanya diubah oleh Admin Keuangan (verifikasi manual, BR-SD-08).
CREATE TABLE tagihan_termin (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tagihan_id         INT UNSIGNED NOT NULL,
  termin_ke          TINYINT UNSIGNED NOT NULL,
  jumlah             DECIMAL(12,0) NOT NULL,
  jatuh_tempo        DATE NOT NULL COMMENT 'Bulan cicilan diambil dari tanggal ini',
  status             ENUM('belum_bayar','lunas') NOT NULL DEFAULT 'belum_bayar',
  tanggal_bayar      DATETIME NULL,
  metode_bayar       VARCHAR(40) NULL,
  no_kuitansi        VARCHAR(30) NULL UNIQUE,
  diverifikasi_oleh  INT UNSIGNED NULL,
  diverifikasi_at    DATETIME NULL,
  catatan            VARCHAR(255) NULL COMMENT 'Catatan verifikasi atau alasan koreksi terakhir',
  UNIQUE KEY uq_termin (tagihan_id, termin_ke),
  CONSTRAINT fk_termin_tagihan     FOREIGN KEY (tagihan_id)        REFERENCES tagihan(id) ON DELETE CASCADE,
  CONSTRAINT fk_termin_verifikator FOREIGN KEY (diverifikasi_oleh) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
