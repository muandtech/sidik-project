-- =====================================================================
-- SIDIK — 3/3 Data DEMO (opsional, hanya untuk uji coba)
-- Berisi mahasiswa, dosen, tagihan, pengumuman, dll. fiktif.
-- JANGAN diimport ke server produksi — ganti dengan data asli kampus.
--
-- Akun demo (password: password123):
--   Mahasiswa : 0102523025 (atau hasan.yusuf@iais.ac.id) — data lengkap
--   Mahasiswa : 0102523026 — data minim, UKT dicicil 6 bulan (cicilan Oktober menunggak)
--   Mahasiswa : 0102523027 — UKT dicicil 6 bulan (September & Oktober lunas)
--   Mahasiswa : 0102523028 — mahasiswa baru, tagihan bayar sekaligus belum lunas
--   Dosen     : 0412345678 — modul dosen = Coming Soon
--   Keuangan  : keuangan (atau keuangan@iais.ac.id) — Admin Keuangan: verifikasi/ACC pembayaran
-- =====================================================================

SET time_zone = '+07:00';

-- Hash bcrypt untuk "password123"
SET @pwd = '$2b$10$OVb/g3wNMhFvNzNTSVCzT.WlcFB22I38bBul7YCz7/wXN9bCZ38EC';

INSERT INTO fakultas (id, kode, nama) VALUES
  (1, 'FST', 'Fakultas Sains dan Teknologi'),
  (2, 'FTK', 'Fakultas Tarbiyah dan Keguruan');

INSERT INTO prodi (id, fakultas_id, kode, nama, jenjang, akreditasi) VALUES
  (1, 1, 'SI', 'Sistem Informasi', 'S1', 'Baik Sekali'),
  (2, 2, 'PAI', 'Pendidikan Agama Islam', 'S1', 'Unggul');

INSERT INTO users (id, username, email, password_hash, role, nama) VALUES
  (1, '0102523025', 'hasan.yusuf@iais.ac.id', @pwd, 'mahasiswa', NULL),
  (2, '0412345678', 'ahmad.rahman@iais.ac.id', @pwd, 'dosen', NULL),
  (3, '0102523026', 'nabila.putri@iais.ac.id', @pwd, 'mahasiswa', NULL),
  (4, 'keuangan', 'keuangan@iais.ac.id', @pwd, 'keuangan', 'Rina Marlina, S.E.'),
  (5, '0102523027', 'rizki.ramadhan@iais.ac.id', @pwd, 'mahasiswa', NULL),
  (6, '0102523028', 'aisyah.nurhaliza@iais.ac.id', @pwd, 'mahasiswa', NULL);

INSERT INTO dosen (id, user_id, nidn, nama, prodi_id, jabatan) VALUES
  (1, 2,    '0412345678', 'Dr. Ahmad Rahman, M.Kom.', 1, 'Lektor Kepala'),
  (2, NULL, '0415058801', 'Dr. Siti Aminah, M.T.', 1, 'Lektor'),
  (3, NULL, '0420119002', 'M. Fadli, S.Kom., M.Kom.', 1, 'Asisten Ahli'),
  (4, NULL, '0401078503', 'Ust. H. Zainal Abidin, Lc., M.Ag.', 2, 'Lektor');

INSERT INTO mahasiswa (id, user_id, nim, nama, prodi_id, angkatan, semester, dosen_pa_id,
  tempat_lahir, tanggal_lahir, jenis_kelamin, agama, kewarganegaraan, golongan_darah,
  no_hp, email_kampus, alamat_ktp, alamat_domisili, total_sks, ipk, nilai_tilawah) VALUES
  (1, 1, '0102523025', 'Hasan Yusuf Muizz', 1, 2024, 5, 1,
   'Sukabumi', '2004-11-14', 'L', 'Islam', 'Warga Negara Indonesia (WNI)', 'O',
   '+62 812-3456-7890', 'hasan.yusuf@iais.ac.id',
   'Jl. R.A. Kosasih No. 45, Cikole, Sukabumi, Jawa Barat',
   'Kost Orange Room 102, Kebayoran Baru, Jakarta Selatan', 128, 3.48, NULL),
  -- Mahasiswa kedua sengaja berdata minim untuk menguji fallback data kosong
  (2, 3, '0102523026', 'Nabila Putri', 1, 2025, 3, 1,
   NULL, NULL, 'P', NULL, NULL, NULL,
   NULL, 'nabila.putri@iais.ac.id', NULL, NULL, 0, NULL, NULL),
  (3, 5, '0102523027', 'Rizki Ramadhan', 2, 2025, 3, 4,
   'Cianjur', '2006-03-02', 'L', 'Islam', 'Warga Negara Indonesia (WNI)', NULL,
   '+62 857-2211-3344', 'rizki.ramadhan@iais.ac.id', NULL, NULL, 40, 3.62, NULL),
  (4, 6, '0102523028', 'Aisyah Nurhaliza', 1, 2026, 1, 2,
   'Sukabumi', '2008-01-20', 'P', 'Islam', 'Warga Negara Indonesia (WNI)', NULL,
   '+62 878-5566-7788', 'aisyah.nurhaliza@iais.ac.id', NULL, NULL, 0, NULL, NULL);

INSERT INTO orang_tua_wali (mahasiswa_id, nama_ayah, nama_ibu, pekerjaan, kontak_darurat) VALUES
  (1, 'Ahmad Muizz', 'Siti Rahmawati', 'PNS / Guru', '+62 815-9988-7711');

INSERT INTO dokumen_mahasiswa (mahasiswa_id, jenis, ukuran_kb, status, urutan) VALUES
  (1, 'KTP', 1229, 'terverifikasi', 1),
  (1, 'Kartu Keluarga', 2458, 'terverifikasi', 2),
  (1, 'Ijazah SMA Terakhir', 3174, 'terverifikasi', 3),
  (1, 'Akta Kelahiran', 1843, 'pending', 4),
  (1, 'Foto KTM Lama', NULL, 'belum_ada', 5);

INSERT INTO jadwal_kuliah (mahasiswa_id, kode_mk, nama_mk, sks, dosen_id, ruang, hari, jam_mulai, jam_selesai) VALUES
  -- Senin
  (1, 'SI501', 'Interaksi Manusia dan Komputer', 3, 2, 'Ruang 301', 1, '08:00', '10:30'),
  (1, 'SI502', 'Studi Al-Qur''an', 2, 4, 'Masjid Kampus', 1, '13:00', '14:40'),
  -- Selasa
  (1, 'SI503', 'Pemrograman Web Lanjut', 3, 3, 'Lab Komputer 2', 2, '08:00', '10:30'),
  (1, 'SI504', 'Manajemen Proyek SI', 3, 1, 'Ruang 402', 2, '13:00', '15:30'),
  -- Rabu
  (1, 'SI505', 'Keamanan Sistem Informasi', 3, 2, 'Ruang 305', 3, '10:30', '13:00'),
  -- Kamis
  (1, 'SI506', 'Kewirausahaan Digital', 2, 1, 'Ruang 201', 4, '08:00', '09:40'),
  (1, 'SI507', 'Data Mining', 3, 3, 'Lab Komputer 1', 4, '13:00', '15:30'),
  -- Jumat
  (1, 'SI508', 'Metodologi Penelitian', 2, 1, 'Ruang 402', 5, '08:00', '09:40'),
  (1, 'SI509', 'Pengembangan Sistem', 3, 2, 'Ruang 305', 5, '10:30', '11:30'),
  (1, 'SI510', 'Praktikum Basis Data', 1, 3, 'Lab 1', 5, '13:00', '15:00'),
  -- Sabtu
  (1, 'SI511', 'Bahasa Arab Akademik', 2, 4, 'Ruang 105', 6, '08:00', '09:40');

INSERT INTO pengumuman (judul, ringkasan, isi, kategori_id, target, penulis, tanggal_acara, published_at) VALUES
  ('Pembayaran SPP Semester Ganjil',
   'Pembayaran SPP semester ganjil 2026/2027 dibuka hingga 15 Oktober 2026.',
   'Diberitahukan kepada seluruh mahasiswa bahwa pembayaran SPP/UKT semester ganjil tahun akademik 2026/2027 dibuka mulai hari ini hingga 15 Oktober 2026. Pembayaran dapat dilakukan melalui virtual account bank mitra atau secara manual di loket Bagian Keuangan pada hari kerja pukul 08.00–15.00 WIB.\n\nMahasiswa yang belum melunasi pembayaran hingga batas waktu tidak dapat mengisi KRS. Untuk pengajuan cicilan atau keringanan, silakan menghubungi Bagian Keuangan.',
   1, 'mahasiswa', 'Bagian Keuangan', NULL, NOW() - INTERVAL 2 HOUR),
  ('Jadwal UTS Semester Ganjil',
   'UTS semester ganjil dilaksanakan 12–24 Oktober 2026. Jadwal per kelas tersedia di prodi.',
   'Ujian Tengah Semester (UTS) semester ganjil 2026/2027 akan dilaksanakan pada 12–24 Oktober 2026. Jadwal lengkap per kelas dapat dilihat di papan pengumuman program studi masing-masing.\n\nMahasiswa wajib membawa Kartu Tanda Mahasiswa (KTM) dan kartu ujian. Mahasiswa dengan kehadiran di bawah 75% tidak diperkenankan mengikuti UTS.',
   1, 'semua', 'BAAK', NULL, NOW() - INTERVAL 1 DAY),
  ('Kajian Rutin Jumat: Adab Menuntut Ilmu',
   'Kajian rutin bersama Ust. H. Zainal Abidin di Masjid Kampus setelah salat Jumat.',
   'Lembaga Dakwah Kampus mengundang seluruh sivitas akademika untuk mengikuti kajian rutin Jumat dengan tema "Adab Menuntut Ilmu" bersama Ust. H. Zainal Abidin, Lc., M.Ag. Kajian dilaksanakan di Masjid Kampus IAI Sukabumi setelah salat Jumat.',
   3, 'semua', 'Lembaga Dakwah Kampus', DATE(NOW()) + INTERVAL 7 DAY + INTERVAL 13 HOUR, NOW() - INTERVAL 2 DAY),
  ('Penyesuaian Kalender Akademik 2026/2027',
   'Terdapat penyesuaian tanggal libur semester dan masa tambah/batal KRS.',
   'Berdasarkan hasil rapat pimpinan, kalender akademik 2026/2027 mengalami penyesuaian pada masa tambah/batal KRS (diperpanjang satu minggu) dan libur akhir semester ganjil. Kalender terbaru dapat diunduh melalui laman resmi kampus.',
   1, 'semua', 'Wakil Rektor I', NULL, NOW() - INTERVAL 3 DAY),
  ('Perpustakaan Buka Hingga Pukul 20.00',
   'Mulai Oktober, layanan perpustakaan diperpanjang hingga pukul 20.00 WIB.',
   'Dalam rangka mendukung kegiatan belajar mahasiswa menjelang UTS, layanan perpustakaan IAI Sukabumi diperpanjang hingga pukul 20.00 WIB setiap Senin–Kamis mulai 1 Oktober 2026.',
   2, 'semua', 'UPT Perpustakaan', NULL, NOW() - INTERVAL 5 DAY),
  ('Seminar Nasional Transformasi Digital Pendidikan Islam',
   'Seminar nasional di Aula Utama, terbuka untuk mahasiswa dengan sertifikat.',
   'IAI Sukabumi menyelenggarakan Seminar Nasional "Transformasi Digital Pendidikan Islam" di Aula Utama. Pendaftaran gratis bagi mahasiswa IAI Sukabumi dan peserta akan mendapatkan e-sertifikat.',
   3, 'semua', 'Humas IAI Sukabumi', DATE(NOW()) + INTERVAL 14 DAY + INTERVAL 8 HOUR, NOW() - INTERVAL 6 DAY),
  ('Periode Input Nilai UTS Dibuka',
   'Dosen dapat mulai menginput nilai UTS melalui portal dosen.',
   'Periode input nilai UTS untuk dosen dibuka mulai hari ini. Mohon nilai diinput paling lambat dua minggu setelah pelaksanaan ujian.',
   1, 'dosen', 'BAAK', NULL, NOW() - INTERVAL 4 HOUR);

INSERT INTO notifikasi (user_id, judul, pesan, tipe, tautan, created_at) VALUES
  (1, 'Dokumen Akta Kelahiran Menunggu Verifikasi', 'Berkas sedang diperiksa oleh BAAK', 'dokumen', '/biodata', NOW() - INTERVAL 1 DAY),
  (1, 'Dokumen KRS Belum Lengkap', 'Upload tanda tangan dosen PA', 'peringatan', NULL, NOW() - INTERVAL 2 DAY),
  (1, 'Pendaftaran Sidang TA', 'Pendaftaran dibuka pada 20 Oktober', 'jadwal', NULL, NOW() - INTERVAL 3 DAY);

INSERT INTO aktivitas (user_id, judul, ikon, created_at) VALUES
  (1, 'Pembayaran UKT Semester 5 Ganjil', 'bayar', '2026-08-01 10:12:00'),
  (1, 'Pengunduhan KHS Semester Genap', 'unduh', NOW() - INTERVAL 1 DAY),
  (1, 'Pembaruan Biodata Mahasiswa', 'edit', NOW() - INTERVAL 2 DAY);

INSERT INTO tagihan (id, no_tagihan, mahasiswa_id, semester_ke, periode, tahun_akademik, jenis_pembayaran,
  jumlah, dibayar, status, jatuh_tempo, tanggal_bayar, metode_bayar, no_kuitansi) VALUES
  (1, 'TGH-20241-0102523025', 1, 1, 'Ganjil', '2024/2025', 'Uang Pangkal & UKT', 14500000, 14500000, 'lunas', '2024-08-31', '2024-08-10 09:21:00', 'Virtual Account', 'KWT-20241-000125'),
  (2, 'TGH-20242-0102523025', 1, 2, 'Genap',  '2024/2025', 'UKT / SPP Tetap',     8000000,  8000000, 'lunas', '2025-02-28', '2025-02-02 13:05:00', 'Virtual Account', 'KWT-20242-000342'),
  (3, 'TGH-20251-0102523025', 1, 3, 'Ganjil', '2025/2026', 'UKT / SPP Tetap',     8000000,  8000000, 'lunas', '2025-08-31', '2025-08-15 10:40:00', 'Transfer Manual', 'KWT-20251-000518'),
  (4, 'TGH-20252-0102523025', 1, 4, 'Genap',  '2025/2026', 'UKT / SPP Tetap',     8500000,  8500000, 'lunas', '2026-02-28', '2026-02-04 08:55:00', 'Virtual Account', 'KWT-20252-000207'),
  (5, 'TGH-20261-0102523025', 1, 5, 'Ganjil', '2026/2027', 'UKT / SPP Tetap',     8500000,  8500000, 'lunas', '2026-08-31', '2026-08-01 10:12:00', 'Virtual Account', 'KWT-20261-000094'),
  -- Tagihan bercicilan: dibayar/status mengikuti tagihan_termin, jatuh_tempo = termin terakhir
  (6, 'TGH-20261-0102523026', 2, 3, 'Ganjil', '2026/2027', 'UKT / SPP Tetap',     7800000,  1300000, 'cicilan', '2027-02-15', NULL, NULL, NULL),
  (7, 'TGH-20261-0102523027', 3, 3, 'Ganjil', '2026/2027', 'UKT / SPP Tetap',     7200000,  2400000, 'cicilan', '2027-02-15', NULL, NULL, NULL),
  -- Mahasiswa baru: bayar sekaligus, belum lunas (bisa di-ACC penuh atau dipecah jadi cicilan oleh Admin Keuangan)
  (8, 'TGH-20261-0102523028', 4, 1, 'Ganjil', '2026/2027', 'Uang Pangkal & UKT', 9000000,        0, 'belum_lunas', '2026-10-31', NULL, NULL, NULL);

INSERT INTO tagihan_termin (id, tagihan_id, termin_ke, jumlah, jatuh_tempo, status, tanggal_bayar, metode_bayar,
  no_kuitansi, diverifikasi_oleh, diverifikasi_at, catatan) VALUES
  (1,  6, 1, 1300000, '2026-09-15', 'lunas',       '2026-09-10 10:15:00', 'Transfer Manual', 'KWT-20261-T00001', 4, '2026-09-10 14:02:00', NULL),
  (2,  6, 2, 1300000, '2026-10-15', 'belum_bayar', NULL, NULL, NULL, NULL, NULL, NULL),
  (3,  6, 3, 1300000, '2026-11-15', 'belum_bayar', NULL, NULL, NULL, NULL, NULL, NULL),
  (4,  6, 4, 1300000, '2026-12-15', 'belum_bayar', NULL, NULL, NULL, NULL, NULL, NULL),
  (5,  6, 5, 1300000, '2027-01-15', 'belum_bayar', NULL, NULL, NULL, NULL, NULL, NULL),
  (6,  6, 6, 1300000, '2027-02-15', 'belum_bayar', NULL, NULL, NULL, NULL, NULL, NULL),
  (7,  7, 1, 1200000, '2026-09-15', 'lunas',       '2026-09-05 09:30:00', 'Tunai di Loket Keuangan', 'KWT-20261-T00007', 4, '2026-09-05 09:31:00', NULL),
  (8,  7, 2, 1200000, '2026-10-15', 'lunas',       '2026-10-12 13:45:00', 'Transfer Manual', 'KWT-20261-T00008', 4, '2026-10-13 08:20:00', NULL),
  (9,  7, 3, 1200000, '2026-11-15', 'belum_bayar', NULL, NULL, NULL, NULL, NULL, NULL),
  (10, 7, 4, 1200000, '2026-12-15', 'belum_bayar', NULL, NULL, NULL, NULL, NULL, NULL),
  (11, 7, 5, 1200000, '2027-01-15', 'belum_bayar', NULL, NULL, NULL, NULL, NULL, NULL),
  (12, 7, 6, 1200000, '2027-02-15', 'belum_bayar', NULL, NULL, NULL, NULL, NULL, NULL);

-- Jejak verifikasi (format keterangan: "<no_tagihan> | <uraian>", dibaca halaman riwayat Admin Keuangan)
INSERT INTO audit_log (user_id, aksi, keterangan, created_at) VALUES
  (4, 'tagihan_cicilan',    'TGH-20261-0102523026 | Dipecah menjadi 6 termin bulanan', '2026-08-20 10:00:00'),
  (4, 'tagihan_cicilan',    'TGH-20261-0102523027 | Dipecah menjadi 6 termin bulanan', '2026-08-20 10:05:00'),
  (4, 'tagihan_verifikasi', 'TGH-20261-0102523027 | Termin 1 (September 2026) di-ACC lunas · Tunai di Loket Keuangan', '2026-09-05 09:31:00'),
  (4, 'tagihan_verifikasi', 'TGH-20261-0102523026 | Termin 1 (September 2026) di-ACC lunas · Transfer Manual', '2026-09-10 14:02:00'),
  (4, 'tagihan_verifikasi', 'TGH-20261-0102523027 | Termin 2 (Oktober 2026) di-ACC lunas · Transfer Manual', '2026-10-13 08:20:00');

INSERT INTO notifikasi (user_id, judul, pesan, tipe, tautan, created_at) VALUES
  (3, 'Cicilan UKT Oktober 2026 Lewat Jatuh Tempo', 'Segera lakukan pembayaran termin 2', 'peringatan', '/keuangan', NOW() - INTERVAL 1 DAY);
