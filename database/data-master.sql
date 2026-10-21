-- =====================================================================
-- SIDIK — 2/3 Data master aplikasi (WAJIB)
-- Identitas institusi, teks portal, daftar fitur, menu, dan kategori pengumuman.
-- Seluruh nilai di sini dapat diubah langsung di database tanpa mengubah kode.
-- =====================================================================

SET time_zone = '+07:00';

INSERT INTO pengaturan (kunci, nilai, keterangan) VALUES
  ('nama_aplikasi',          'SIDIK', 'Nama singkat aplikasi'),
  ('judul_portal',           'Sistem Akademik', 'Judul di header portal'),
  ('deskripsi_aplikasi',     'Sistem Informasi Akademik Terpadu Institut Agama Islam Sukabumi', 'Deskripsi meta halaman'),
  ('nama_institusi',         'Institut Agama Islam Sukabumi', 'Nama resmi institusi'),
  ('singkatan_institusi',    'IAI Sukabumi', 'Nama singkat institusi'),
  ('logo',                   '/logo-iais.png', 'Path logo di folder public'),
  ('footer_teks',            'Sistem Akademik Terpadu', 'Teks footer halaman login (diikuti © tahun & nama institusi)'),
  ('login_subjudul',         'Portal Akademik Mahasiswa', 'Subjudul kartu login'),
  ('login_contoh_username',  'Contoh: 0102523025', 'Placeholder kolom NIM / Username'),
  ('login_tombol',           'Masuk ke StudentDesk', 'Label tombol login'),
  ('login_bantuan_lupa_password',
   'Reset password mandiri lewat email akan tersedia pada Sprint 2. Sementara ini, silakan hubungi BAAK dengan membawa KTM untuk mengatur ulang password Anda.',
   'Teks bantuan saat tautan Lupa Password diklik'),
  ('unit_layanan_akun',      'BAAK', 'Unit yang dihubungi untuk masalah akun/data mahasiswa'),
  ('coming_soon_deskripsi',
   'Fitur ini sedang kami siapkan untuk sprint berikutnya agar pengalaman pengguna tetap stabil dan terarah.',
   'Deskripsi umum pada halaman Coming Soon'),
  ('coming_soon_catatan',    'Tersedia di Sprint 1: Biodata dan Tagihan & Keuangan', 'Catatan di bagian bawah halaman Coming Soon'),
  ('kuitansi_penerbit',      'Bagian Keuangan', 'Unit penerbit kuitansi'),
  ('kuitansi_catatan',       'Kuitansi ini diterbitkan secara elektronik oleh SIDIK dan sah tanpa tanda tangan.', 'Catatan kaki kuitansi'),
  ('cicilan_maks_termin',    '6', 'Jumlah termin maksimal saat Admin Keuangan memecah tagihan menjadi cicilan bulanan (FR-KEU-08)'),
  ('metode_bayar_manual',    'Transfer Manual,Tunai di Loket Keuangan,Virtual Account', 'Pilihan metode bayar saat verifikasi manual, dipisah koma'),
  ('sesi_durasi_jam',        '8', 'Masa berlaku session tanpa "Ingat Saya" (jam)'),
  ('sesi_ingat_saya_hari',   '30', 'Masa berlaku session dengan "Ingat Saya" (hari)');

INSERT INTO fitur (slug, nama, deskripsi, status, rute, rencana_sprint) VALUES
  -- Fitur yang sudah tersedia di Sprint 1
  ('dashboard',   'Dashboard', 'Ringkasan identitas, agenda, pengumuman, dan aktivitas mahasiswa.', 'tersedia', '/dashboard', 1),
  ('biodata',     'Biodata Mahasiswa', 'Data pribadi, akademik, kontak, orang tua/wali, dan dokumen.', 'tersedia', '/biodata', 1),
  ('keuangan',    'Tagihan & Pembayaran', 'Rincian tagihan per semester dan riwayat pembayaran.', 'tersedia', '/keuangan', 1),
  ('pengumuman',  'Pengumuman & Informasi', 'Pengumuman akademik, informasi kampus, dan agenda kegiatan.', 'tersedia', '/pengumuman', 1),
  -- Fitur Coming Soon
  ('ringkasan-akademik',    'Ringkasan Akademik', 'Rekap IPK, IPS per semester, dan progres SKS menuju kelulusan.', 'segera', NULL, 2),
  ('ajukan-perubahan-data', 'Ajukan Perubahan Data', 'Pengajuan perubahan data identitas yang diverifikasi oleh BAAK.', 'segera', NULL, 3),
  ('ganti-password',        'Ganti Password', 'Mengganti password akun dengan validasi password lama dan kebijakan kekuatan password.', 'segera', NULL, 2),
  ('konfirmasi-pembayaran', 'Konfirmasi Pembayaran Manual', 'Unggah bukti transfer untuk diverifikasi Admin Keuangan.', 'segera', NULL, 4),
  ('keringanan-ukt',        'Cicilan & Keringanan UKT', 'Pengajuan cicilan atau keringanan UKT beserta dokumen pendukung.', 'segera', NULL, 4),
  ('jadwal-kuliah',         'Jadwal Kuliah', 'Jadwal perkuliahan mingguan berdasarkan KRS yang disetujui.', 'segera', NULL, 2),
  ('jadwal-kuliah-prodi',   'Jadwal Kuliah Prodi', 'Jadwal seluruh kelas yang ditawarkan program studi pada semester berjalan.', 'segera', NULL, 2),
  ('isi-krs',               'Isi KRS', 'Pengisian Kartu Rencana Studi online dengan validasi prasyarat, bentrok jadwal, dan batas SKS.', 'segera', NULL, 2),
  ('kalender-akademik',     'Kalender Akademik', 'Kalender kegiatan akademik: periode KRS, perkuliahan, ujian, dan libur.', 'segera', NULL, 2),
  ('e-learning',            'E-Learning', 'Mata kuliah, materi, tugas, kuis/ujian, dan nilai pembelajaran. Nantinya dibuka langsung ke Sistem E-Learning tanpa login ulang (SSO).', 'segera', NULL, 3),
  ('nilai',                 'Nilai', 'Nilai resmi per mata kuliah yang telah divalidasi dan dipublikasikan.', 'segera', NULL, 2),
  ('khs',                   'Kartu Hasil Studi (KHS)', 'Hasil studi per semester beserta IPS dan IPK.', 'segera', NULL, 2),
  ('transkrip',             'Transkrip Nilai', 'Transkrip akademik kumulatif seluruh mata kuliah yang telah ditempuh.', 'segera', NULL, 2),
  ('permintaan-surat',      'Permintaan Surat', 'Pengajuan surat keterangan aktif kuliah, rekomendasi, dan surat administrasi lainnya.', 'segera', NULL, 4),
  ('lacak-surat',           'Lacak Status Surat', 'Memantau status pengajuan surat hingga siap diunduh.', 'segera', NULL, 4),
  ('chat-online',           'Chat Online', 'Layanan percakapan langsung dengan bagian akademik dan keuangan.', 'segera', NULL, NULL),
  ('pusat-download',        'Pusat Download', 'Kumpulan formulir, panduan, dan dokumen resmi kampus.', 'segera', NULL, NULL),
  ('kkn',                   'KKN', 'Pendaftaran dan informasi Kuliah Kerja Nyata.', 'segera', NULL, NULL),
  ('bimbingan-ta',          'Bimbingan TA', 'Catatan dan jadwal bimbingan tugas akhir bersama dosen pembimbing.', 'segera', NULL, NULL),
  ('sidang-proposal',       'Pendaftaran Sidang Proposal', 'Pendaftaran seminar/sidang proposal tugas akhir.', 'segera', NULL, NULL),
  ('sidang-skripsi',        'Pendaftaran Sidang Skripsi', 'Pendaftaran sidang akhir skripsi/tugas akhir.', 'segera', NULL, NULL),
  ('cetak-ktm',             'Pengajuan Cetak KTM', 'Pengajuan pencetakan Kartu Tanda Mahasiswa baru atau pengganti.', 'segera', NULL, NULL),
  ('email-iais',            'Akun Email IAIS', 'Aktivasi dan pengelolaan akun email kampus @iais.ac.id.', 'segera', NULL, NULL),
  ('unduh-dokumen',         'Unduh Dokumen', 'Unduh dokumen akademik seperti KRS, KHS, dan kartu ujian.', 'segera', NULL, 2),
  ('modul-dosen-admin',     'Modul Dosen & Admin', 'Dashboard dosen (agenda mengajar, persetujuan KRS, bimbingan) serta modul administrasi yang hadir bersama RBAC.', 'segera', NULL, 2);

-- Menu atas (bar ikon di bawah header)
INSERT INTO menu (id, grup, parent_id, label, ikon, fitur_slug, urutan) VALUES
  (1, 'menu_atas', NULL, 'Dashboard',           'SquareDot',     'dashboard',           1),
  (2, 'menu_atas', NULL, 'Nilai',               'Columns3',      'nilai',               2),
  (3, 'menu_atas', NULL, 'Permintaan Surat',    'Mail',          'permintaan-surat',    3),
  (4, 'menu_atas', NULL, 'Jadwal Kuliah Prodi', 'CalendarDays',  'jadwal-kuliah-prodi', 4),
  (5, 'menu_atas', NULL, 'Isi KRS',             'PencilLine',    'isi-krs',             5),
  (6, 'menu_atas', NULL, 'Chat Online',         'MessageSquare', 'chat-online',         6),
  (7, 'menu_atas', NULL, 'Pusat Download',      'Download',      'pusat-download',      7),
  (8, 'menu_atas', NULL, 'KKN',                 'Users',         'kkn',                 8),
  (9, 'menu_atas', NULL, 'Bimbingan TA',        'BookOpen',      'bimbingan-ta',        9);

-- Sidebar (item induk tanpa fitur_slug = grup submenu)
INSERT INTO menu (id, grup, parent_id, label, ikon, fitur_slug, urutan) VALUES
  (20, 'sidebar', NULL, 'Halaman Utama',        'House',         'dashboard',             1),
  (21, 'sidebar', NULL, 'Ringkasan Akademik',   'ChartColumn',   'ringkasan-akademik',    2),
  (22, 'sidebar', NULL, 'Biodata',              'UserRound',     NULL,                    3),
  (23, 'sidebar', 22,   'Data Pribadi',         NULL,            'biodata',               1),
  (24, 'sidebar', 22,   'Ajukan Perubahan Data', NULL,           'ajukan-perubahan-data', 2),
  (25, 'sidebar', 22,   'Ganti Password',       NULL,            'ganti-password',        3),
  (26, 'sidebar', NULL, 'Keuangan',             'Wallet',        NULL,                    4),
  (27, 'sidebar', 26,   'Tagihan & Pembayaran', NULL,            'keuangan',              1),
  (28, 'sidebar', 26,   'Konfirmasi Pembayaran', NULL,           'konfirmasi-pembayaran', 2),
  (29, 'sidebar', 26,   'Cicilan & Keringanan', NULL,            'keringanan-ukt',        3),
  (30, 'sidebar', NULL, 'Perkuliahan',          'GraduationCap', NULL,                    5),
  (31, 'sidebar', 30,   'Jadwal Kuliah',        NULL,            'jadwal-kuliah',         1),
  (32, 'sidebar', 30,   'Isi KRS',              NULL,            'isi-krs',               2),
  (33, 'sidebar', 30,   'Kalender Akademik',    NULL,            'kalender-akademik',     3),
  (34, 'sidebar', 30,   'E-Learning',           NULL,            'e-learning',            4),
  (35, 'sidebar', NULL, 'Nilai',                'ClipboardList', NULL,                    6),
  (36, 'sidebar', 35,   'Kartu Hasil Studi',    NULL,            'khs',                   1),
  (37, 'sidebar', 35,   'Transkrip Nilai',      NULL,            'transkrip',             2),
  (38, 'sidebar', NULL, 'Layanan',              'FileText',      NULL,                    7),
  (39, 'sidebar', 38,   'Pengajuan Surat',      NULL,            'permintaan-surat',      1),
  (40, 'sidebar', 38,   'Lacak Status Surat',   NULL,            'lacak-surat',           2),
  (41, 'sidebar', NULL, 'Pengumuman',           'Megaphone',     'pengumuman',            8),
  (42, 'sidebar', NULL, 'Pendaftaran Sidang',   'Presentation',  NULL,                    9),
  (43, 'sidebar', 42,   'Sidang Proposal',      NULL,            'sidang-proposal',       1),
  (44, 'sidebar', 42,   'Sidang Skripsi',       NULL,            'sidang-skripsi',        2);

-- Menu pengguna (dropdown nama di header) dan tombol aksi per halaman
INSERT INTO menu (grup, label, ikon, fitur_slug, varian, urutan) VALUES
  ('menu_pengguna',  'Profil Saya',                  'UserRound', 'biodata',               NULL,      1),
  ('menu_pengguna',  'Ganti Password',               'KeyRound',  'ganti-password',        NULL,      2),
  ('aksi_dashboard', 'Pengajuan Cetak KTM',          NULL,        'cetak-ktm',             'primary', 1),
  ('aksi_dashboard', 'Akun Email IAIS',              NULL,        'email-iais',            'plain',   2),
  ('aksi_cepat',     'Cetak KTM',                    NULL,        'cetak-ktm',             'soft',    1),
  ('aksi_cepat',     'Isi KRS',                      NULL,        'isi-krs',               'soft',    2),
  ('aksi_cepat',     'Buka Email',                   NULL,        'email-iais',            'soft',    3),
  ('aksi_cepat',     'Unduh Dokumen',                NULL,        'unduh-dokumen',         'soft',    4),
  ('aksi_cepat',     'Cek Tagihan',                  NULL,        'keuangan',              'soft',    5),
  ('aksi_cepat',     'Lihat Biodata',                NULL,        'biodata',               'soft',    6),
  ('aksi_cepat',     'E-Learning',                   NULL,        'e-learning',            'soft',    7),
  ('aksi_biodata',   'Ajukan Perubahan Data',        NULL,        'ajukan-perubahan-data', 'outline', 1),
  ('aksi_keuangan',  'Konfirmasi Pembayaran Manual', NULL,        'konfirmasi-pembayaran', 'primary', 1);

INSERT INTO kategori_pengumuman (id, kode, nama, urutan) VALUES
  (1, 'akademik', 'Akademik', 1),
  (2, 'kampus', 'Informasi Kampus', 2),
  (3, 'agenda', 'Agenda', 3);
