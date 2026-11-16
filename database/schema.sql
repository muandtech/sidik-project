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
  prodi, fakultas, audit_log, sessions, users, login_gagal, captcha_terpakai,
  user_roles, nilai, krs_detail, krs, jadwal, kelas, ruang, prasyarat_mk, mata_kuliah, kurikulum,
  tahun_akademik, bobot_nilai, batas_sks;
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
  grup        ENUM('menu_atas','sidebar','menu_pengguna','aksi_dashboard','aksi_cepat','aksi_biodata','aksi_keuangan','staf') NOT NULL,
  roles       SET('dosen','kaprodi','baak','keuangan','pimpinan','superadmin') NULL COMMENT 'Grup staf: role yang melihat menu ini',
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
  nama          VARCHAR(120) NULL COMMENT 'Nama tampilan akun staf yang tidak punya profil mahasiswa/dosen',
  status        ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
  last_login    DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- RBAC (PRD §10, SD-S2-01): satu pengguna dapat memiliki beberapa role dan berpindah role aktif.
-- Dosen PA bukan role tersendiri: dosen yang ditunjuk di mahasiswa.dosen_pa_id.
CREATE TABLE user_roles (
  user_id   INT UNSIGNED NOT NULL,
  role      ENUM('mahasiswa','dosen','kaprodi','baak','keuangan','pimpinan','superadmin') NOT NULL,
  prodi_id  INT UNSIGNED NULL COMMENT 'Lingkup prodi untuk role kaprodi',
  PRIMARY KEY (user_id, role),
  INDEX idx_user_roles_role (role),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE sessions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  role_aktif  ENUM('mahasiswa','dosen','kaprodi','baak','keuangan','pimpinan','superadmin') NOT NULL,
  token_hash  CHAR(64)     NOT NULL UNIQUE COMMENT 'SHA-256 dari token cookie',
  expires_at  DATETIME     NOT NULL,
  ip_address  VARCHAR(45)  NULL,
  user_agent  VARCHAR(255) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Jejak audit (NFR-07). Perubahan data penting menyimpan objek yang diubah (entitas, entitas_id) beserta
-- nilai sebelum/sesudah dan alasan (BR-SD-07/10). Baris tidak dapat diubah atau dihapus (trigger di bawah).
CREATE TABLE audit_log (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NULL,
  aksi        VARCHAR(50)  NOT NULL COMMENT 'login_sukses, login_gagal, logout, tagihan_*',
  keterangan  VARCHAR(255) NULL,
  entitas     VARCHAR(30)  NULL COMMENT 'Jenis objek yang diubah, mis. tagihan',
  entitas_id  INT UNSIGNED NULL,
  data_lama   JSON         NULL,
  data_baru   JSON         NULL,
  alasan      VARCHAR(255) NULL,
  ip_address  VARCHAR(45)  NULL,
  user_agent  VARCHAR(255) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_entitas (entitas, entitas_id, created_at),
  INDEX idx_audit_aksi (aksi, created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Audit log hanya boleh ditambah (append-only), termasuk bila aplikasi terhubung dengan akun DB berhak penuh.
-- Pengarsipan oleh DBA: DROP TRIGGER, arsipkan, lalu buat kembali trigger ini.
CREATE TRIGGER audit_log_tolak_ubah BEFORE UPDATE ON audit_log FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log tidak boleh diubah';
CREATE TRIGGER audit_log_tolak_hapus BEFORE DELETE ON audit_log FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log tidak boleh dihapus';

-- Percobaan login gagal untuk rate limiting (NFR-04). Batas diatur di tabel pengaturan (login_*).
-- identifier NULL = gagal CAPTCHA, hanya dihitung per IP. Baris > 1 hari dihapus otomatis.
CREATE TABLE login_gagal (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identifier  VARCHAR(120) NULL COMMENT 'NIM/username/email dalam huruf kecil',
  ip_address  VARCHAR(45)  NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_gagal_identifier (identifier, created_at),
  INDEX idx_login_gagal_ip (ip_address, created_at),
  INDEX idx_login_gagal_waktu (created_at)
) ENGINE=InnoDB;

-- Token CAPTCHA yang sudah dipakai, agar satu token hanya berlaku untuk satu percobaan login (anti-replay).
CREATE TABLE captcha_terpakai (
  nonce           VARCHAR(32) PRIMARY KEY,
  kedaluwarsa_at  DATETIME    NOT NULL,
  INDEX idx_captcha_kedaluwarsa (kedaluwarsa_at)
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
  -- Aturan akses (keputusan kampus 2026-11-16): aktif = penuh; cuti & nonaktif = boleh login, lihat saja,
  -- tidak bisa KRS; lulus & keluar = tidak bisa login sebagai mahasiswa.
  status_akademik  ENUM('aktif','cuti','nonaktif','lulus','keluar') NOT NULL DEFAULT 'aktif',
  -- Sprint 2-3: izin mengisi KRS diatur manual oleh Admin Keuangan (PRD 21.4); otomatis dari pembayaran di Sprint 4.
  boleh_krs        TINYINT(1)   NOT NULL DEFAULT 0,
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
  nilai_tilawah    VARCHAR(5)   NULL,
  CONSTRAINT fk_mhs_user  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mhs_prodi FOREIGN KEY (prodi_id)    REFERENCES prodi(id),
  INDEX idx_mhs_pa (dosen_pa_id),
  INDEX idx_mhs_prodi_status (prodi_id, status_akademik),
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

-- ---------------------------------------------------------------------
-- SIAKAD (PRD 6.3, Sprint 2)
-- ---------------------------------------------------------------------

-- Semester & kalender akademik (FR-AK-04). Hanya satu semester aktif (kolom aktif_unik).
CREATE TABLE tahun_akademik (
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
CREATE TABLE kurikulum (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prodi_id        INT UNSIGNED NOT NULL,
  kode            VARCHAR(20)  NOT NULL UNIQUE,
  nama            VARCHAR(120) NOT NULL,
  angkatan_mulai  YEAR         NOT NULL,
  aktif           TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_kurikulum_prodi FOREIGN KEY (prodi_id) REFERENCES prodi(id)
) ENGINE=InnoDB;

CREATE TABLE mata_kuliah (
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
CREATE TABLE prasyarat_mk (
  mata_kuliah_id  INT UNSIGNED NOT NULL,
  prasyarat_id    INT UNSIGNED NOT NULL,
  PRIMARY KEY (mata_kuliah_id, prasyarat_id),
  CONSTRAINT fk_prasyarat_mk  FOREIGN KEY (mata_kuliah_id) REFERENCES mata_kuliah(id) ON DELETE CASCADE,
  CONSTRAINT fk_prasyarat_req FOREIGN KEY (prasyarat_id)   REFERENCES mata_kuliah(id)
) ENGINE=InnoDB;

CREATE TABLE ruang (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode       VARCHAR(20)  NOT NULL UNIQUE,
  nama       VARCHAR(80)  NOT NULL,
  kapasitas  SMALLINT UNSIGNED NOT NULL
) ENGINE=InnoDB;

-- Kelas yang ditawarkan pada satu semester (FR-AK-05). `terisi` dinaikkan secara atomik saat KRS diajukan.
CREATE TABLE kelas (
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

CREATE TABLE jadwal (
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
CREATE TABLE krs (
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

CREATE TABLE krs_detail (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  krs_id    INT UNSIGNED NOT NULL,
  kelas_id  INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_krs_detail (krs_id, kelas_id),
  INDEX idx_krs_detail_kelas (kelas_id),
  CONSTRAINT fk_krsd_krs   FOREIGN KEY (krs_id)   REFERENCES krs(id) ON DELETE CASCADE,
  CONSTRAINT fk_krsd_kelas FOREIGN KEY (kelas_id) REFERENCES kelas(id)
) ENGINE=InnoDB;

-- Nilai resmi per mata kuliah. BR-SD-06: hanya nilai terpublikasi yang tampil di KHS.
CREATE TABLE nilai (
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
CREATE TABLE bobot_nilai (
  huruf      VARCHAR(2)   PRIMARY KEY,
  nilai_min  DECIMAL(5,2) NOT NULL COMMENT 'Nilai angka minimal untuk huruf ini',
  bobot      DECIMAL(3,2) NOT NULL,
  lulus      TINYINT(1)   NOT NULL COMMENT '1 = SKS dihitung lulus'
) ENGINE=InnoDB;

-- BR-SD-03: batas SKS berdasarkan IPS semester sebelumnya (dikonfigurasi BAAK).
CREATE TABLE batas_sks (
  ips_min   DECIMAL(3,2) PRIMARY KEY,
  maks_sks  TINYINT UNSIGNED NOT NULL
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
  INDEX idx_tagihan_periode (tahun_akademik, periode),
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
