# PRODUCT REQUIREMENTS DOCUMENT
## SIDIK & E-Learning

**Dua Sistem Terintegrasi:** Sistem 1 — SIDIK (Akademik, Keuangan & UKT) dan Sistem 2 — E-Learning

- **Klien:** Institut Agama Islam (IAI) Sukabumi
- **Vendor Pengembang:** Muand Tech
- **Versi:** 2.0 • 22 September 2026 • Draf untuk Review Klien

> Dokumen ini bersifat rahasia dan hanya untuk kepentingan IAI Sukabumi dan Muand Tech.

---

## Informasi Dokumen

| Atribut | Keterangan |
| --- | --- |
| Nama Produk | Sistem 1: SIDIK (Sistem Informasi Akademik) • Sistem 2: E-Learning IAI Sukabumi |
| Cakupan Sistem 1 — SIDIK | Portal Mahasiswa, SIAKAD, Keuangan & Pembayaran UKT, Layanan Mahasiswa, Administrasi, SSO |
| Cakupan Sistem 2 — E-Learning | Kelas Online, Materi, Tugas, Kuis/Ujian, Presensi, Forum, Penilaian |
| Hubungan Kedua Sistem | Aplikasi, basis data, dan deployment terpisah; terhubung melalui SSO dan Integration API |
| Klien | Institut Agama Islam (IAI) Sukabumi |
| Vendor | Muand Tech |
| Versi Dokumen | 2.0 (Draf untuk review klien) |
| Tanggal | 22 September 2026 |
| Metodologi | Scrum — 4 sprint, estimasi 3 minggu per sprint, dua jalur pengembangan (SIDIK & E-Learning) |
| Sumber Sprint 1 | Ekspor board Trello "SIDIK Portal Akademik Mahasiswa" |

## Riwayat Revisi

| Versi | Tanggal | Penyusun | Keterangan |
| --- | --- | --- | --- |
| 0.1 | September 2026 | Muand Tech | Penyusunan backlog Sprint 1 di Trello |
| 1.0 | 22 September 2026 | Muand Tech | PRD awal (SIDIK dan E-Learning dibahas sebagai satu sistem) |
| 2.0 | 22 September 2026 | Muand Tech | Restrukturisasi: SIDIK dan E-Learning dipisah menjadi dua sistem dalam satu dokumen, ditambah bab integrasi |
| 2.1 | 21 Oktober 2026 | Muand Tech | Simulasi pembayaran manual sebelum payment gateway: role Admin Keuangan, cicilan UKT per bulan (termin), ACC & koreksi pembayaran, rekap per bulan (6.4.1, 7.5, 8.3, BR-SD-13–16) |

## Cara Membaca Dokumen

| Bagian | Isi | Pembaca Utama |
| --- | --- | --- |
| Bagian A — Umum | Pendahuluan, vendor, gambaran dua sistem, arsitektur, aktor | Semua pihak |
| Bagian B — Sistem 1: SIDIK | Use case, kebutuhan fungsional, alur, data, aturan bisnis, hak akses SIDIK | BAAK, Keuangan, tim SIDIK |
| Bagian C — Sistem 2: E-Learning | Use case, kebutuhan fungsional, alur, data, aturan bisnis, hak akses E-Learning | Dosen, pengelola pembelajaran, tim E-Learning |
| Bagian D — Integrasi | SSO, kontrak API, sinkronisasi data, integrasi eksternal | Tim teknis kedua sistem, TI kampus |
| Bagian E — Kualitas & Delivery | Kebutuhan non-fungsional, rencana sprint, go-live, risiko, asumsi, persetujuan | Product Owner, Project Manager |

---

# BAGIAN A — UMUM

## 1. Pendahuluan

### 1.1 Latar Belakang

Institut Agama Islam (IAI) Sukabumi membutuhkan sistem digital yang menangani seluruh siklus akademik mahasiswa: pembayaran UKT, pengisian KRS, perkuliahan daring, penilaian, hingga penerbitan KHS dan transkrip. Selama ini proses administrasi akademik, keuangan, dan pembelajaran berjalan terpisah tanpa pertukaran data yang rapi, sehingga terjadi input data berulang, verifikasi pembayaran yang lambat, dan sulitnya pimpinan memantau kondisi akademik. Klien meminta dua sistem yang berdiri sendiri namun saling terintegrasi:
- Sistem 1 — SIDIK (Sistem Informasi Akademik): sistem administrasi dan sumber data resmi (*system of record*) untuk data mahasiswa, dosen, kurikulum, kelas, KRS, nilai resmi, KHS, transkrip, serta keuangan dan pembayaran UKT.
- Sistem 2 — E-Learning: sistem pembelajaran daring (LMS) untuk aktivitas perkuliahan: materi, tugas, kuis/ujian, presensi, forum, dan penilaian komponen. Kedua sistem memiliki aplikasi, basis data, dan siklus rilis masing-masing. Pengguna cukup memiliki satu akun (Single Sign-On yang dikelola SIDIK), dan data kelas, peserta, serta nilai berpindah otomatis di antara keduanya melalui Integration API.

### 1.2 Alasan Dipisah Menjadi Dua Sistem

| Aspek | Manfaat Pemisahan |
| --- | --- |
| Beban akses | Lonjakan akses E-Learning (ujian online serentak) tidak mengganggu SIDIK saat periode KRS atau pembayaran, dan sebaliknya |
| Keamanan data | Data keuangan dan nilai resmi hanya berada di SIDIK; E-Learning tidak menyimpan data pembayaran |
| Pengembangan paralel | Tim SIDIK dan tim E-Learning dapat bekerja dan merilis secara independen |
| Pemeliharaan | Gangguan atau pembaruan di satu sistem tidak mematikan sistem lainnya |
| Fleksibilitas | E-Learning dapat diganti/ditingkatkan di masa depan tanpa mengubah SIDIK, selama kontrak API dipertahankan |

### 1.3 Tujuan Produk

Sistem 1 — SIDIK:
- Menyediakan portal tunggal bagi mahasiswa, dosen, admin, dan pimpinan dengan akses sesuai peran.
- Mendigitalkan proses akademik inti: master data, jadwal, KRS, nilai resmi, KHS, dan transkrip.
- Mengotomasi penagihan dan pembayaran UKT melalui Virtual Account/QRIS dengan verifikasi otomatis.
- Menjadi penyedia identitas (SSO) dan sumber data resmi bagi E-Learning.
- Menyiapkan data untuk pelaporan nasional (PDDikti) serta dashboard pimpinan. Sistem 2 — E-Learning:
- Menyediakan kelas daring yang terbentuk otomatis berdasarkan kelas dan KRS di SIDIK.
- Memfasilitasi distribusi materi, pengumpulan tugas, kuis/ujian online, presensi, dan diskusi.
- Menghitung nilai komponen dan mengirim nilai akhir ke SIDIK tanpa input ulang.

### 1.4 Sasaran Terukur (Success Metrics)

| Kode | Sistem | Metrik | Target (1 semester setelah go-live) |
| --- | --- | --- | --- |
| KPI‑01 | SIDIK | Mahasiswa aktif yang login minimal sekali per semester | ≥ 95% |
| KPI‑02 | SIDIK | KRS yang diisi secara online | 100% |
| KPI‑03 | SIDIK | Pembayaran UKT terverifikasi otomatis | ≥ 85% |
| KPI‑04 | SIDIK | Waktu verifikasi pembayaran | < 5 menit (otomatis), < 1 hari kerja (manual) |
| KPI‑05 | SIDIK | Nilai terpublikasi tepat waktu sesuai kalender akademik | ≥ 95% |
| KPI‑06 | E‑Learning | Kelas yang memiliki materi/tugas aktif | ≥ 80% |
| KPI‑07 | E‑Learning | Kelas yang mengirim nilai ke SIDIK melalui integrasi (tanpa input manual) | ≥ 90% |
| KPI‑08 | E‑Learning | Ujian online selesai tanpa kehilangan jawaban | ≥ 99% attempt |
| KPI‑09 | Keduanya | Ketersediaan sistem (uptime) masing-masing | ≥ 99,5% per bulan |
| KPI‑10 | Integrasi | Sinkron peserta kelas setelah KRS disetujui | < 15 menit |

### 1.5 Ruang Lingkup

Sistem 1 — SIDIK (Release 1):
- Portal: autentikasi, SSO Identity Provider, dashboard per peran, profil, navigasi,
pengumuman, notifikasi, launcher ke E-Learning.
- SIAKAD: master data akademik, tahun akademik & kalender, kelas & jadwal, KRS online +
persetujuan Dosen PA, penerimaan dan validasi nilai, KHS, IPK, transkrip, monitoring perwalian, ekspor data PDDikti.
- Keuangan & UKT: golongan dan tarif, tagihan, pembayaran VA/QRIS, pembayaran manual,
cicilan & keringanan, kuitansi, rekonsiliasi, laporan, penguncian KRS otomatis.
- Layanan Mahasiswa: pengajuan surat dan pelacakan status.
- Administrasi: pengguna, role & hak akses, audit log, konfigurasi, backup, dashboard
eksekutif.
- Integration API untuk E-Learning.
Sistem 2 — E-Learning (Release 1):
- Login melalui SSO SIDIK, dashboard pembelajaran per peran.
- Kelas daring otomatis dari SIDIK, pertemuan, materi.
- Tugas & pengumpulan, bank soal, kuis/ujian online.
- Presensi per pertemuan, forum diskusi.
- Rekap nilai komponen dan pengiriman nilai ke SIDIK.
- Administrasi E-Learning: log sinkronisasi dan konfigurasi.
Di luar lingkup Release 1 (kandidat fase berikutnya):
- Penerimaan Mahasiswa Baru (PMB) online; wisuda, alumni, dan tracer study.
- Aplikasi mobile native (Release 1 berupa web responsif yang siap PWA).
- Kelas video konferensi bawaan (E-Learning cukup menautkan Zoom/Google Meet).
- Modul kepegawaian/SDM, penggajian, dan akuntansi penuh.
- EDOM dan penjaminan mutu tingkat lanjut (dapat ditambahkan sebagai change request).

### 1.6 Definisi dan Singkatan

| Istilah | Arti |
| --- | --- |
| SIDIK | Sistem 1 — Sistem Informasi Akademik (administrasi akademik, keuangan, layanan) |
| E‑Learning | Sistem 2 — sistem pembelajaran daring (LMS) |
| SIAKAD | Modul pengelolaan data dan proses akademik di dalam SIDIK |
| System of Record | Sistem yang menjadi sumber data resmi untuk suatu data |
| UKT | Uang Kuliah Tunggal — biaya kuliah per semester |
| KRS / KHS | Kartu Rencana Studi / Kartu Hasil Studi |
| IPS / IPK | Indeks Prestasi Semester / Indeks Prestasi Kumulatif |
| BAAK | Biro Administrasi Akademik dan Kemahasiswaan |
| Dosen PA | Dosen Pembimbing Akademik (wali) |
| VA / QRIS | Virtual Account / Quick Response Code Indonesian Standard |
| SSO | Single Sign-On — satu akun untuk kedua sistem |
| IdP | Identity Provider — penyedia identitas SSO (dijalankan oleh SIDIK) |
| OAuth2 / OIDC | Standar otorisasi dan autentikasi yang dipakai untuk SSO |
| Webhook | Notifikasi otomatis antar sistem ketika sebuah event terjadi |
| RBAC | Role-Based Access Control — hak akses berbasis peran |
| PDDikti | Pangkalan Data Pendidikan Tinggi (sinkronisasi via Neo Feeder) |
| UAT | User Acceptance Test — pengujian penerimaan oleh klien |
| DoR / DoD | Definition of Ready / Definition of Done |
| P0 / P1 / P2 | Prioritas: wajib rilis / penting / dapat ditunda |
| SP | Story Point — estimasi relatif kompleksitas |

## 2. Tentang Vendor dan Organisasi Proyek

### 2.1 Profil Vendor

Muand Tech adalah vendor pengembang perangkat lunak yang ditunjuk oleh IAI Sukabumi untuk merancang, membangun, menguji, dan mengimplementasikan SIDIK terintegrasi. Muand Tech bertanggung jawab atas analisis kebutuhan, desain UI/UX, pengembangan frontend dan backend, integrasi pembayaran, pengujian, migrasi data awal, pelatihan pengguna, serta pendampingan pasca go-live (hypercare).

### 2.2 Peran dan Tanggung Jawab

| Peran | Pihak | Tanggung Jawab Utama |
| --- | --- | --- |
| Product Owner (Klien) | IAI Sukabumi (Wakil Rektor/Ketua Bidang Akademik atau yang ditunjuk) | Menetapkan prioritas, menyetujui backlog, memutuskan kebutuhan bisnis |
| Key User Akademik | BAAK IAI Sukabumi | Validasi alur akademik, penyediaan data master, UAT modul SIAKAD |
| Key User Keuangan | Bagian Keuangan IAI Sukabumi | Validasi skema UKT, cicilan, keringanan, UAT modul Keuangan |
| Key User Pembelajaran | Perwakilan dosen & mahasiswa | UAT modul E-Learning dan portal |
| Project Manager / Scrum Master | Muand Tech | Perencanaan sprint, pelaporan progres, manajemen risiko |
| UI/UX Designer | Muand Tech | Desain antarmuka, prototipe, konsistensi desain |
| Developer Frontend & Backend | Muand Tech | Implementasi fitur, integrasi API, integrasi pembayaran |
| QA Engineer | Muand Tech | Test plan, pengujian fungsional, regresi, dukungan UAT |
| DevOps | Muand Tech | Infrastruktur, deployment, keamanan, backup, monitoring |

### 2.3 Ritme Scrum

| Kegiatan | Frekuensi | Peserta |
| --- | --- | --- |
| Sprint Planning | Awal setiap sprint | Tim Muand Tech + Product Owner |
| Daily Stand‑up | Setiap hari kerja (15 menit) | Tim Muand Tech |
| Sprint Review / Demo | Akhir setiap sprint | Tim Muand Tech + Product Owner + Key User |
| Sprint Retrospective | Akhir setiap sprint | Tim Muand Tech |
| Laporan Progres | Mingguan | Project Manager → Product Owner |

## 3. Gambaran Dua Sistem

### 3.1 Arsitektur

SIDIK dan E-Learning dibangun sebagai dua aplikasi terpisah, masing-masing dengan frontend, backend, dan basis data sendiri. SIDIK menjalankan Identity Provider (SSO) dan Integration API; E-Learning menjalankan Sync Worker yang menarik data kelas/peserta dan mengirim nilai. Keduanya dapat di-deploy pada server/VM yang berbeda. Gambar 3.1 — Arsitektur Dua Sistem SIDIK & E-Learning

| Komponen | Sistem 1 — SIDIK | Sistem 2 — E-Learning |
| --- | --- | --- |
| Frontend | Next.js (React), responsif, siap PWA | Next.js (React), responsif, siap PWA |
| Backend | NestJS atau Laravel (REST API + OpenAPI) | NestJS atau Laravel (REST API + OpenAPI) |
| Basis Data | PostgreSQL — DB SIDIK | PostgreSQL — DB E-Learning (terpisah) |
| Cache & Antrean | Redis | Redis (autosave ujian, antrean sinkronisasi) |
| Penyimpanan Berkas | Dokumen layanan & kuitansi | Object storage kompatibel S3 untuk materi dan tugas |
| Autentikasi | Identity Provider OAuth2/OIDC | Client OIDC (login via SIDIK) |
| Integrasi | Integration API + webhook keluar | Sync Worker + webhook masuk |
| Domain (indikatif) | sidik.iaisukabumi.ac.id | elearning.iaisukabumi.ac.id |

Teknologi di atas adalah rekomendasi Muand Tech dan dapat disesuaikan dengan kesepakatan serta kemampuan tim TI kampus dalam pemeliharaan jangka panjang.

### 3.2 Pembagian Kepemilikan Data (System of Record)

| Data | Pemilik (Sumber Resmi) | Salinan di Sistem Lain | Arah Aliran |
| --- | --- | --- | --- |
| Akun pengguna, password, role | SIDIK | E-Learning (profil & role, tanpa password) | SIDIK → E-Learning |
| Mahasiswa, dosen, prodi | SIDIK | E-Learning (data minimum) | SIDIK → E-Learning |

| Data | Pemilik (Sumber Resmi) | Salinan di Sistem Lain | Arah Aliran |
| --- | --- | --- | --- |
| Mata kuliah, kelas, jadwal, dosen pengampu | SIDIK | E-Learning (course) | SIDIK → E-Learning |
| KRS / peserta kelas | SIDIK | E-Learning (enrollment) | SIDIK → E-Learning |
| Materi, tugas, submission, kuis, presensi, forum | E‑Learning | — | Tidak dikirim |
| Nilai komponen (tugas, kuis, UTS, UAS) | E‑Learning | — | Tidak dikirim |
| Nilai akhir per mahasiswa per kelas | E-Learning (draf) → SIDIK (resmi setelah validasi) | — | E-Learning → SIDIK |
| Nilai huruf, IPS, IPK, KHS, transkrip | SIDIK | — | — |
| Tagihan, pembayaran, kuitansi | SIDIK | — (tidak dibagikan ke E-Learning) | — |
| Rekap presensi per mahasiswa (opsional) | E‑Learning | SIDIK (untuk syarat ujian/laporan) | E-Learning → SIDIK |

### 3.3 Alur Integrasi dalam Satu Semester

*[Diagram: Gambar 3.2 — Alur Integrasi SIDIK dan E-Learning  — lihat berkas PDF asli untuk visualnya]*

### 3.4 Use Case Konteks (Level 0)

*[Diagram: Gambar 3.3 — Use Case Konteks Dua Sistem  — lihat berkas PDF asli untuk visualnya]*

### 3.5 Pemangku Kepentingan dan Aktor

| Aktor | Deskripsi | Menggunakan SIDIK | Menggunakan E-Learning |
| --- | --- | --- | --- |
| Mahasiswa | Mahasiswa aktif IAI Sukabumi | Dashboard, KRS, KHS, transkrip, bayar UKT, layanan surat | Kelas, materi, tugas, kuis, presensi, forum, nilai pembelajaran |
| Dosen | Pengampu mata kuliah | Profil, jadwal mengajar, status nilai | Kelola kelas, materi, tugas, kuis, presensi, penilaian, kirim nilai |
| Dosen PA | Dosen wali | Persetujuan KRS, monitoring perwalian | — |
| Kaprodi | Ketua Program Studi | Validasi nilai, monitoring prodi | Pantau aktivitas kelas prodinya (baca saja) |
| Admin Akademik (BAAK) | Pengelola data akademik | Master data, jadwal, publikasi nilai, pengumuman, layanan | — |
| Admin Keuangan | Pengelola pembiayaan | Tarif, tagihan, verifikasi, keringanan, laporan | — |
| Admin E-Learning | Pengelola LMS (dapat dirangkap TI) | — | Log sinkronisasi, konfigurasi, bantuan dosen |
| Pimpinan | Rektor/Wakil Rektor/Dekan | Dashboard eksekutif | Laporan aktivitas pembelajaran |
| Superadmin / IT | Tim TI kampus | Pengguna, role, client SSO, audit log, backup | Konfigurasi teknis, backup |
| Bank / Payment Gateway | Sistem eksternal | VA/QRIS, callback | — |
| PDDikti Neo Feeder | Sistem eksternal | Sinkronisasi data | — |

# BAGIAN B — SISTEM 1: SIDIK

## 4. Ringkasan Sistem SIDIK

### 4.1 Tujuan dan Batasan

SIDIK adalah pusat administrasi akademik dan keuangan IAI Sukabumi sekaligus sumber data resmi. SIDIK tidak menangani aktivitas pembelajaran (materi, tugas, kuis, presensi); aktivitas tersebut sepenuhnya berada di Sistem E-Learning. SIDIK menerima nilai akhir dari E-Learning, memvalidasi, lalu menerbitkannya sebagai nilai resmi.

### 4.2 Modul SIDIK

| Modul | Fungsi Utama |
| --- | --- |
| Portal & Akun (SSO) | Login, SSO Identity Provider, dashboard per role, profil, navigasi, launcher E-Learning |
| SIAKAD | Master data, kalender, kelas & jadwal, KRS, nilai resmi, KHS, transkrip, perwalian, PDDikti |
| Keuangan & UKT | Tarif, tagihan, pembayaran VA/QRIS & manual, cicilan/keringanan, kuitansi, rekonsiliasi, laporan |
| Layanan Mahasiswa | Pengajuan surat dan pelacakan status |
| Pengumuman & Notifikasi | Pengumuman bertarget, notifikasi in-app, email, WhatsApp |
| Administrasi & Laporan | Pengguna, role, client SSO, audit log, konfigurasi, dashboard eksekutif |
| Integration API | Penyedia data kelas & peserta, penerima nilai, webhook ke E-Learning |

### 4.3 Peta Menu SIDIK

| Menu Utama | Sub‑menu | Aktor |
| --- | --- | --- |
| Dashboard | Ringkasan identitas, pengumuman, shortcut, notifikasi, status tagihan | Semua |
| Akademik | Jadwal, KRS, KHS, Transkrip, Kalender Akademik | Mahasiswa, Dosen PA |
| E‑Learning | Launcher: membuka Sistem E-Learning via SSO (bukan fitur di dalam SIDIK) | Mahasiswa, Dosen |
| Keuangan | Tagihan, Riwayat Pembayaran, Kuitansi, Pengajuan Cicilan/Keringanan | Mahasiswa, Admin Keuangan |
| Layanan Mahasiswa | Pengajuan Surat, Lacak Status | Mahasiswa, BAAK |
| Pengumuman | Akademik, Informasi Kampus, Agenda | Semua |
| Profil | Data pribadi, akademik, kontak, ganti password | Semua |
| Administrasi | Master Data, Pengguna, Role, Client SSO, Konfigurasi, Audit Log | BAAK, Keuangan, Superadmin |
| Laporan | Dashboard eksekutif, laporan akademik & keuangan | Pimpinan, Admin |

## 5. Use Case SIDIK

### 5.1 Autentikasi & Portal Mahasiswa (Sprint 1)

*[Diagram: Gambar 5.1 — Use Case SIDIK: Autentikasi & Portal  — lihat berkas PDF asli untuk visualnya]*

### 5.2 Modul SIAKAD

*[Diagram: Gambar 5.2 — Use Case SIDIK: SIAKAD  — lihat berkas PDF asli untuk visualnya]*

### 5.3 Modul Keuangan & Pembayaran UKT

*[Diagram: Gambar 5.3 — Use Case SIDIK: Keuangan & UKT  — lihat berkas PDF asli untuk visualnya]*

### 5.4 Layanan Mahasiswa & Administrasi Sistem

*[Diagram: Gambar 5.4 — Use Case SIDIK: Layanan & Administrasi  — lihat berkas PDF asli untuk visualnya]*

### 5.5 Daftar Use Case SIDIK

| ID | Use Case | Aktor Utama | Modul | Sprint |
| --- | --- | --- | --- | --- |
| UC‑SD‑01 | Login / Logout / Kelola Session | Semua pengguna | Portal | 1 |
| UC‑SD‑02 | Lihat Dashboard & Ringkasan Identitas | Mahasiswa | Portal | 1 |
| UC‑SD‑03 | Lihat Profil | Mahasiswa | Portal | 1 |
| UC‑SD‑04 | Navigasi Menu & Halaman Coming Soon | Mahasiswa | Portal | 1 |
| UC‑SD‑05 | Lihat Pengumuman & Notifikasi | Semua pengguna | Portal | 1 |
| UC‑SD‑06 | Lupa/Ganti Password & Edit Profil | Semua pengguna | Portal | 2–3 |
| UC‑SD‑07 | Kelola Pengguna, Role & Client SSO | Superadmin | Admin | 2 |
| UC‑SD‑08 | Kelola Master Data Akademik | BAAK | SIAKAD | 2 |
| UC‑SD‑09 | Kelola Tahun Akademik & Kalender | BAAK | SIAKAD | 2 |

| ID | Use Case | Aktor Utama | Modul | Sprint |
| --- | --- | --- | --- | --- |
| UC‑SD‑10 | Kelola Kelas & Jadwal Kuliah | BAAK | SIAKAD | 2 |
| UC‑SD‑11 | Isi KRS Online | Mahasiswa | SIAKAD | 2 |
| UC‑SD‑12 | Setujui / Tolak KRS | Dosen PA | SIAKAD | 2 |
| UC‑SD‑13 | Lihat Jadwal, KHS, Transkrip | Mahasiswa | SIAKAD | 2 |
| UC‑SD‑14 | Kelola Pengumuman | BAAK | Portal | 2 |
| UC‑SD‑15 | Sediakan Data Kelas & Peserta ke E-Learning | Sistem | Integrasi | 3 |
| UC‑SD‑16 | Terima, Validasi & Publikasi Nilai | Kaprodi, BAAK | SIAKAD | 3 |
| UC‑SD‑17 | Monitoring Perwalian | Dosen PA, Kaprodi | SIAKAD | 3 |
| UC‑SD‑18 | Buka E-Learning (Launcher SSO) | Mahasiswa, Dosen | Portal | 3 |
| UC‑SD‑19 | Kelola Golongan & Tarif UKT | Admin Keuangan | Keuangan | 4 |
| UC‑SD‑20 | Generate & Terbitkan Tagihan | Admin Keuangan | Keuangan | 4 |
| UC‑SD‑21 | Bayar UKT via VA/QRIS | Mahasiswa, Payment Gateway | Keuangan | 4 |
| UC‑SD‑22 | Upload & Verifikasi Bukti Bayar Manual | Mahasiswa, Admin Keuangan | Keuangan | 4 |
| UC‑SD‑23 | Ajukan & Proses Cicilan/Keringanan | Mahasiswa, Admin Keuangan | Keuangan | 4 |
| UC‑SD‑24 | Rekonsiliasi & Laporan Keuangan | Admin Keuangan | Keuangan | 4 |
| UC‑SD‑25 | Pengajuan & Penerbitan Surat | Mahasiswa, BAAK | Layanan | 4 |
| UC‑SD‑26 | Dashboard Eksekutif | Pimpinan | Laporan | 4 |
| UC‑SD‑27 | Sinkronisasi Data PDDikti | BAAK | SIAKAD | 4 |

### 5.6 Spesifikasi Use Case Utama SIDIK

**UC-SD-01 Login / Logout / Kelola Session**

| Elemen | Uraian |
| --- | --- |
| Aktor | Mahasiswa, Dosen, Admin, Pimpinan; Layanan Autentikasi (sistem) |
| Prakondisi | Pengguna memiliki akun aktif |
| Alur Utama | 1) Pengguna membuka halaman login. 2) Mengisi NIM/NIDN/email dan password. 3) Sistem memvalidasi kredensial. 4) Sistem membuat token dan session. 5) Pengguna diarahkan ke dashboard sesuai role. |
| Alur Alternatif | Kredensial salah → pesan error; gagal 5 kali → akun dikunci 15 menit; session habis → diarahkan ulang ke login. |
| Pascakondisi | Session aktif tercatat; aktivitas login masuk audit log |

**UC-SD-11 Isi KRS Online**

| Elemen | Uraian |
| --- | --- |
| Aktor | Mahasiswa; Dosen PA |
| Prakondisi | Periode KRS aktif; tagihan UKT semester berjalan berstatus Lunas, Cicilan tahap 1 terpenuhi, atau Dispensasi |
| Alur Utama | 1) Mahasiswa membuka menu KRS. 2) Sistem menampilkan penawaran mata kuliah dan batas SKS berdasarkan IPS semester lalu. 3) Mahasiswa memilih mata kuliah dan |

| Elemen | Uraian |
| --- | --- |
|  | kelas. 4) Sistem memvalidasi prasyarat, bentrok jadwal, kuota kelas, dan batas SKS. 5) Mahasiswa mengajukan KRS. 6) Dosen PA menyetujui. 7) SIDIK mengirim event peserta ke Sistem E-Learning. |
| Alur Alternatif | Tagihan belum lunas → KRS terkunci dengan tautan ke tagihan; validasi gagal → konflik ditampilkan; Dosen PA menolak → KRS kembali ke mahasiswa dengan catatan. |
| Pascakondisi | KRS berstatus Disetujui; event peserta terkirim ke Sistem E-Learning |

**UC-SD-21 Bayar UKT via VA/QRIS**

| Elemen | Uraian |
| --- | --- |
| Aktor | Mahasiswa; Payment Gateway/Bank |
| Prakondisi | Tagihan semester telah terbit |
| Alur Utama | 1) Mahasiswa membuka menu Tagihan. 2) Memilih metode bayar. 3) Sistem meminta VA/QRIS ke payment gateway. 4) Mahasiswa membayar. 5) Payment gateway mengirim callback. 6) Sistem memverifikasi signature dan idempotensi. 7) Status tagihan menjadi Lunas, kuitansi terbit, KRS terbuka, notifikasi dikirim. |
| Alur Alternatif | VA kedaluwarsa → mahasiswa membuat ulang; callback tidak valid → ditolak dan dicatat; callback tidak diterima → ditangani job rekonsiliasi. |
| Pascakondisi | Transaksi tercatat, kuitansi tersedia, status akademik diperbarui |

**UC-SD-16 Terima, Validasi & Publikasi Nilai**

| Elemen | Uraian |
| --- | --- |
| Aktor | Sistem E-Learning (pengirim), Kaprodi/BAAK, Mahasiswa |
| Prakondisi | Periode input nilai aktif; kelas telah menerima nilai dari E-Learning |
| Alur Utama | 1) SIDIK menerima batch nilai akhir dari E-Learning. 2) Sistem memvalidasi peserta dan periode. 3) Nilai disimpan sebagai draf dan dikonversi ke nilai huruf. 4) Kaprodi/BAAK memvalidasi dan mempublikasikan. 5) Sistem menghitung IPS/IPK, mengunci nilai, dan menerbitkan KHS. 6) Status publikasi dikirim kembali ke E-Learning. |
| Alur Alternatif | Batch ditolak bila di luar periode atau peserta tidak cocok; Kaprodi mengembalikan nilai untuk revisi; koreksi pascapublikasi hanya oleh BAAK dengan alasan. |
| Pascakondisi | KHS terbit; nilai resmi terkunci di SIDIK |

## 6. Kebutuhan Fungsional SIDIK

Prioritas P0 wajib ada saat go-live, P1 penting dan ditargetkan Release 1, P2 dapat digeser ke fase berikutnya.

### 6.1 Portal, Autentikasi & Profil

| Kode | Kebutuhan | Prioritas | Sprint |
| --- | --- | --- | --- |
| FR‑POR‑01 | Pengguna dapat login menggunakan NIM/NIDN/email dan password | P0 | 1 |
| FR‑POR‑02 | Sistem memvalidasi input kosong dan menampilkan pesan error yang jelas | P0 | 1 |
| FR‑POR‑03 | Sistem mengelola session/token dengan aman dan mengakhiri session saat logout | P0 | 1 |
| FR‑POR‑04 | Dashboard mahasiswa menampilkan NIM, nama, program studi, semester, pengumuman terbaru, shortcut layanan, dan notifikasi | P0 | 1 |
| FR‑POR‑05 | Halaman profil menampilkan data pribadi, akademik, program studi, angkatan, kontak, dan foto | P0 | 1 |
| FR‑POR‑06 | Sidebar menghubungkan Dashboard, Akademik, E-Learning, Layanan Mahasiswa, Pengumuman, Profil, dan Logout dengan state menu aktif | P0 | 1 |
| FR‑POR‑07 | Fitur yang belum tersedia ditampilkan dengan halaman Coming Soon yang reusable (nama fitur, status, deskripsi, tombol kembali) | P0 | 1 |
| FR‑POR‑08 | Seluruh halaman responsif di desktop dan mobile | P1 | 1 |
| FR‑POR‑09 | Lupa password melalui tautan reset ke email terdaftar (berlaku 30 menit) | P0 | 2 |
| FR‑POR‑10 | Ganti password dengan validasi password lama dan kebijakan kekuatan password | P0 | 2 |
| FR‑POR‑11 | Mahasiswa dapat mengubah data kontak dan foto profil; perubahan data identitas melalui pengajuan ke BAAK | P1 | 3 |
| FR‑POR‑12 | Dashboard berbeda per role: Mahasiswa, Dosen, Admin, Pimpinan | P0 | 2 |
| FR‑POR‑13 | Penguncian akun sementara setelah 5 kali login gagal | P1 | 2 |
| FR‑POR‑14 | Dashboard mahasiswa menampilkan status tagihan UKT dan tenggat terdekat | P1 | 4 |
| FR‑POR‑15 | Menu E-Learning pada SIDIK berfungsi sebagai launcher yang membuka Sistem E-Learning tanpa login ulang (SSO) | P0 | 3 |

### 6.2 SSO Identity Provider

| Kode | Kebutuhan | Prioritas | Sprint |
| --- | --- | --- | --- |
| FR‑SSO‑01 | SIDIK menyediakan Identity Provider berbasis OAuth2/OIDC (Authorization Code + PKCE) | P0 | 2 |
| FR‑SSO‑02 | Superadmin dapat mendaftarkan client (E-Learning) beserta redirect URI dan scope | P0 | 2 |
| FR‑SSO‑03 | ID token memuat identitas minimum: user id, NIM/NIDN, nama, email, role | P0 | 2 |
| FR‑SSO‑04 | Single logout: logout di satu sistem mengakhiri session di sistem lain | P1 | 3 |
| FR‑SSO‑05 | Penonaktifan akun di SIDIK langsung mencabut akses ke E-Learning | P0 | 3 |

### 6.3 SIAKAD

| Kode | Kebutuhan | Prioritas | Sprint |
| --- | --- | --- | --- |
| FR‑AK‑01 | CRUD fakultas, program studi, jenjang, dan akreditasi prodi | P0 | 2 |
| FR‑AK‑02 | CRUD kurikulum dan mata kuliah (kode, nama, SKS, semester, jenis wajib/pilihan, prasyarat) | P0 | 2 |
| FR‑AK‑03 | CRUD data mahasiswa dan dosen, termasuk impor massal dari Excel/CSV | P0 | 2 |
| FR‑AK‑04 | Pengaturan tahun akademik, semester aktif, dan kalender akademik (periode KRS, perkuliahan, UTS, UAS, input nilai) | P0 | 2 |
| FR‑AK‑05 | CRUD ruang, kelas perkuliahan, dosen pengampu, dan jadwal; deteksi bentrok ruang/dosen | P0 | 2 |
| FR‑AK‑06 | Penetapan Dosen PA untuk setiap mahasiswa | P0 | 2 |
| FR‑AK‑07 | Pengisian KRS online dengan validasi prasyarat, bentrok jadwal, kuota, dan batas SKS berdasarkan IPS | P0 | 2 |
| FR‑AK‑08 | Persetujuan/penolakan KRS oleh Dosen PA dengan catatan | P0 | 2 |
| FR‑AK‑09 | Masa perubahan KRS (tambah/batal) sesuai kalender akademik | P1 | 2 |
| FR‑AK‑10 | Cetak KRS dan Kartu Ujian dalam PDF | P1 | 4 |
| FR‑AK‑11 | Mahasiswa melihat jadwal kuliah pribadi (mingguan) | P0 | 4 |
| FR‑AK‑12 | KHS per semester, IPS, IPK, dan riwayat nilai | P0 | 2 |
| FR‑AK‑13 | Transkrip nilai sementara (PDF) dengan kode verifikasi | P1 | 2 |
| FR‑AK‑14 | Konversi nilai akhir (angka dari E-Learning) ke nilai huruf dan bobot mutu yang dapat dikonfigurasi | P0 | 3 |
| FR‑AK‑15 | Validasi dan publikasi nilai oleh Kaprodi/BAAK; nilai terkunci setelah publikasi | P0 | 3 |
| FR‑AK‑16 | Koreksi nilai pascapublikasi hanya oleh BAAK dengan alasan tercatat | P1 | 3 |
| FR‑AK‑17 | Monitoring perwalian (IPK, SKS tempuh, status) untuk Dosen PA dan Kaprodi | P1 | 3 |
| FR‑AK‑18 | Status mahasiswa: aktif, cuti, non-aktif, lulus, keluar; pengajuan cuti akademik | P1 | 4 |
| FR‑AK‑19 | Ekspor data mahasiswa, KRS, nilai, dan aktivitas kuliah dalam format sinkronisasi PDDikti | P1 | 4 |
| FR‑AK‑20 | Input nilai manual oleh dosen/BAAK di SIDIK sebagai jalur cadangan bila integrasi E-Learning bermasalah | P1 | 3 |

### 6.4 Keuangan & Pembayaran UKT

| Kode | Kebutuhan | Prioritas | Sprint |
| --- | --- | --- | --- |
| FR‑KEU‑01 | Kelola golongan UKT dan tarif per prodi, angkatan, dan golongan | P0 | 4 |
| FR‑KEU‑02 | Penetapan golongan UKT per mahasiswa (impor massal atau manual) | P0 | 4 |
| FR‑KEU‑03 | Kelola jenis biaya selain UKT (mis. KKN, PPL, wisuda, her-registrasi) sebagai komponen tagihan | P1 | 4 |
| FR‑KEU‑04 | Generate tagihan semester massal untuk mahasiswa aktif; mahasiswa cuti mengikuti aturan tarif cuti | P0 | 4 |
| FR‑KEU‑05 | Pembayaran via Virtual Account multi-bank dan QRIS melalui payment gateway/bank mitra | P0 | 4 |

| Kode | Kebutuhan | Prioritas | Sprint |
| --- | --- | --- | --- |
| FR‑KEU‑06 | Penerimaan callback/webhook dengan verifikasi signature, idempotensi, dan pencatatan log | P0 | 4 |
| FR‑KEU‑07 | Upload bukti transfer manual dan verifikasi oleh Admin Keuangan | P1 | 4 |
| FR‑KEU‑08 | Skema cicilan (maksimal jumlah termin dapat dikonfigurasi) dan syarat minimal cicilan untuk membuka KRS | P1 | 4 |
| FR‑KEU‑09 | Pengajuan keringanan/dispensasi dengan unggah dokumen pendukung dan alur persetujuan | P1 | 4 |
| FR‑KEU‑10 | Kuitansi digital (PDF) dengan nomor unik dan kode verifikasi QR | P0 | 4 |
| FR‑KEU‑11 | Status pembayaran otomatis membuka/mengunci akses KRS (INT-01) | P0 | 4 |
| FR‑KEU‑12 | Pengingat tagihan otomatis (H-7, H-3, H-1 sebelum jatuh tempo) | P1 | 4 |
| FR‑KEU‑13 | Rekonsiliasi harian antara transaksi sistem dan laporan settlement payment gateway/bank | P0 | 4 |
| FR‑KEU‑14 | Laporan penerimaan per periode, prodi, golongan, metode bayar, serta daftar tunggakan; ekspor Excel/PDF | P0 | 4 |
| FR‑KEU‑15 | Denda keterlambatan bersifat opsional dan nonaktif secara default (menunggu kebijakan yayasan) | P2 | 4 |
| FR‑KEU‑16 | Rekap status pembayaran per bulan (mahasiswa × bulan) dengan filter periode, bulan, status sudah/belum bayar, dan pencarian nama/NIM | P1 | Simulasi |
| FR‑KEU‑17 | Admin Keuangan meng-ACC pembayaran per termin atau sekaligus (tanggal bayar, metode, catatan) dan dapat membatalkannya dengan alasan wajib | P0 | Simulasi |

#### 6.4.1 Simulasi Pembayaran Manual (sebelum payment gateway)

Selama payment gateway/bank mitra belum aktif (prasyarat Sprint 4), status pembayaran disimulasikan melalui verifikasi manual oleh Admin Keuangan sesuai BR-SD-08. Simulasi ini mengikuti skema UKT per semester; pembayaran "per bulan" diwujudkan sebagai cicilan bertermin (FR-KEU-08), bukan tagihan bulanan terpisah.

| Aspek | Ketentuan Simulasi |
| --- | --- |
| Aktor | Admin Keuangan (role `keuangan`), login dengan username/email, diarahkan ke Portal Admin Keuangan |
| Skema tagihan | Satu tagihan per mahasiswa per semester. Tagihan dapat dibayar sekaligus, atau dipecah Admin Keuangan menjadi 2 sampai N termin bulanan (N dikonfigurasi, default 6) |
| Pembentukan cicilan | Nominal dibagi rata dan sisa pembulatan masuk termin terakhir. Termin pertama jatuh tempo pada tanggal yang dipilih, termin berikutnya pada tanggal yang sama di bulan-bulan berikutnya (dibatasi ke akhir bulan) |
| Rekap per bulan | Tabel mahasiswa × bulan dengan status Lunas / Belum Bayar / Menunggak per termin. Filter bulan + status menjawab "siapa yang sudah/belum bayar bulan X". Ringkasan total tagihan, diterima, belum diterima, dan menunggak per periode |
| ACC (verifikasi) | Admin Keuangan mengisi tanggal bayar (tidak boleh melewati hari ini), metode bayar (daftar dikonfigurasi), dan catatan opsional. Termin menjadi Lunas, kuitansi bernomor unik terbit, dan mahasiswa mendapat notifikasi |
| Koreksi | Status Lunas dapat dibatalkan menjadi Belum Bayar dengan alasan wajib. Nomor kuitansi dicabut dan mahasiswa mendapat notifikasi (BR-SD-10) |
| Jejak audit | Pembentukan cicilan, ACC, dan koreksi tercatat di audit log beserta pelaku dan waktunya, lalu ditampilkan sebagai riwayat per tagihan (FR-ADM-03) |
| Tampilan mahasiswa | Menu Keuangan menampilkan cicilan per bulan, status, tanggal bayar, dan kuitansi per termin. Ringkasan menampilkan cicilan terdekat yang belum dibayar |
| Di luar cakupan simulasi | Unggah bukti bayar oleh mahasiswa (sisa FR-KEU-07), pengajuan cicilan/keringanan oleh mahasiswa (FR-KEU-09), VA/QRIS & callback (FR-KEU-05/06), pembukaan KRS otomatis (FR-KEU-11), serta QR verifikasi kuitansi |

### 6.5 Layanan Mahasiswa, Pengumuman & Notifikasi

| Kode | Kebutuhan | Prioritas | Sprint |
| --- | --- | --- | --- |
| FR‑LAY‑01 | Menu Layanan Mahasiswa dengan placeholder Coming Soon | P0 | 1 |
| FR‑LAY‑02 | Daftar pengumuman, detail, kategori (akademik, kampus, agenda) | P0 | 1 |
| FR‑LAY‑03 | CRUD pengumuman oleh BAAK dengan target audiens (semua, prodi, angkatan, role) dan jadwal tayang | P0 | 2 |
| FR‑LAY‑04 | Pusat notifikasi in-app dengan status dibaca/belum dibaca | P0 | 2 |
| FR‑LAY‑05 | Notifikasi email dan WhatsApp untuk event penting (tagihan, KRS, nilai) | P1 | 4 |
| FR‑LAY‑06 | Pengajuan surat (aktif kuliah, keterangan kuliah, rekomendasi, dsb.) dengan template yang dapat dikonfigurasi | P1 | 4 |
| FR‑LAY‑07 | Pelacakan status layanan (diajukan, diproses, selesai, ditolak) dan unduh surat bertanda tangan/QR verifikasi | P1 | 4 |

### 6.6 Administrasi Sistem & Pelaporan

| Kode | Kebutuhan | Prioritas | Sprint |
| --- | --- | --- | --- |
| FR‑ADM‑01 | Manajemen pengguna: tambah, nonaktifkan, reset password, impor massal | P0 | 2 |
| FR‑ADM‑02 | Role & hak akses (RBAC) dengan granularitas per menu dan aksi; satu pengguna dapat memiliki lebih dari satu role | P0 | 2 |
| FR‑ADM‑03 | Audit log untuk login, perubahan nilai, perubahan tagihan, dan aksi admin | P0 | 2 |
| FR‑ADM‑04 | Konfigurasi institusi (logo, nama, tanda tangan pejabat, parameter akademik) | P1 | 2 |
| FR‑ADM‑05 | Dashboard eksekutif: jumlah mahasiswa aktif, KRS masuk, sebaran IPK, penerimaan UKT, tunggakan | P1 | 4 |

| Kode | Kebutuhan | Prioritas | Sprint |
| --- | --- | --- | --- |
| FR‑ADM‑06 | Laporan akademik: rekap KRS, nilai, presensi, dan status mahasiswa per prodi; ekspor Excel/PDF | P1 | 4 |
| FR‑ADM‑07 | Backup basis data otomatis harian dan prosedur restore teruji | P0 | 4 |

### 6.7 Integration API (sisi SIDIK)

| Kode | Kebutuhan | Prioritas | Sprint |
| --- | --- | --- | --- |
| FR‑API‑01 | Endpoint daftar kelas, dosen pengampu, dan jadwal per tahun akademik | P0 | 3 |
| FR‑API‑02 | Endpoint daftar peserta per kelas berdasarkan KRS disetujui | P0 | 3 |
| FR‑API‑03 | Endpoint penerimaan batch nilai akhir dengan idempotency key | P0 | 3 |
| FR‑API‑04 | Webhook keluar untuk event kelas.dipublikasi, krs.disetujui, krs.diubah, nilai.dipublikasi, user.dinonaktifkan | P0 | 3 |
| FR‑API‑05 | Autentikasi service-to-service (client credentials) dan pembatasan akses per scope | P0 | 3 |
| FR‑API‑06 | Log integrasi dan antrean ulang (retry) untuk webhook yang gagal | P1 | 3 |

## 7. Alur Proses SIDIK

### 7.1 Activity Diagram — Login dan Akses Berbasis Role

*[Diagram: Gambar 7.1 — Activity Diagram Login SIDIK  — lihat berkas PDF asli untuk visualnya]*

### 7.2 Activity Diagram — Pengisian dan Persetujuan KRS

*[Diagram: Gambar 7.2 — Activity Diagram KRS  — lihat berkas PDF asli untuk visualnya]*

### 7.3 Activity Diagram — Penagihan dan Pembayaran UKT

*[Diagram: Gambar 7.3 — Activity Diagram Pembayaran UKT  — lihat berkas PDF asli untuk visualnya]*

### 7.4 Sequence Diagram — Pembayaran UKT via Virtual Account/QRIS

*[Diagram: Gambar 7.4 — Sequence Diagram Pembayaran UKT  — lihat berkas PDF asli untuk visualnya]*

### 7.5 State Diagram — Siklus Status Tagihan UKT

*[Diagram: Gambar 7.5 — State Diagram Tagihan  — lihat berkas PDF asli untuk visualnya]*

Ringkasan status yang dipakai pada simulasi pembayaran manual (6.4.1):

| Objek | Status | Transisi |
| --- | --- | --- |
| Termin cicilan | Belum Bayar → Lunas | ACC Admin Keuangan |
| Termin cicilan | Lunas → Belum Bayar | Koreksi dengan alasan wajib |
| Tagihan bercicilan | Belum Lunas → Cicilan → Lunas | Dihitung otomatis: Cicilan bila sebagian termin lunas, Lunas bila seluruh termin lunas |
| Tagihan bayar sekaligus | Belum Lunas ↔ Lunas | ACC, atau koreksi dengan alasan wajib |
| Tampilan | Menunggak | Bukan status tersimpan. Ditampilkan untuk termin/tagihan yang belum lunas dan sudah lewat jatuh tempo |

## 8. Model Data SIDIK

### 8.1 ERD Domain Akademik

*[Diagram: Gambar 8.1 — ERD SIDIK: Domain Akademik  — lihat berkas PDF asli untuk visualnya]*

### 8.2 ERD Domain Pengguna, Keuangan & Layanan

*[Diagram: Gambar 8.2 — ERD SIDIK: Pengguna, Keuangan & Layanan  — lihat berkas PDF asli untuk visualnya]*

### 8.3 Deskripsi Entitas Utama SIDIK

| Entitas | Atribut Kunci | Keterangan |
| --- | --- | --- |
| USERS | id, username, email, password_hash, status, last_login | Akun tunggal untuk kedua sistem |
| ROLES / USER_ROLES | role_id, nama_role, permission[] | RBAC; satu user dapat memiliki beberapa role |
| OAUTH_CLIENT / OAUTH_TOKEN | client_id, redirect_uri, scope, token_hash, expires_at | Registrasi E-Learning sebagai client SSO |
| MAHASISWA | nim, user_id, prodi_id, angkatan, dosen_pa_id, status, golongan_ukt | Profil akademik mahasiswa |
| DOSEN | nidn, user_id, prodi_id, jabatan | Profil dosen |
| FAKULTAS / PRODI | kode, nama, jenjang, akreditasi | Struktur akademik |
| KURIKULUM / MATA_KULIAH | kode_mk, nama, sks, semester, prasyarat | Struktur kurikulum |
| TAHUN_AKADEMIK | kode (mis. 20261), periode_krs, periode_nilai | Semester dan kalender |
| KELAS / JADWAL / RUANG | kelas_id, mk_id, dosen_id, kuota, hari, jam, ruang_id | Penawaran kelas (dikirim ke E-Learning) |
| KRS / KRS_DETAIL | krs_id, nim, ta_id, status, kelas_id | Rencana studi dan status persetujuan |
| NILAI_BATCH | batch_id, kelas_id, sumber, idempotency_key, status | Batch nilai yang diterima dari E-Learning |
| NILAI | krs_detail_id, nilai_angka, nilai_huruf, bobot, status_publikasi | Nilai resmi per mata kuliah |
| INTEGRATION_EVENT | event_id, tipe, payload, status_kirim, retry | Antrean webhook ke E-Learning |
| GOLONGAN_UKT / TARIF_UKT | golongan, prodi_id, angkatan, nominal | Skema biaya |
| TAGIHAN / PEMBAYARAN | no_tagihan, status, jatuh_tempo, metode, va_number, paid_at | Tagihan dan transaksi |
| TAGIHAN_TERMIN | tagihan_id, termin_ke, jumlah, jatuh_tempo, status, tanggal_bayar, metode, no_kuitansi, diverifikasi_oleh | Cicilan per bulan; jumlah seluruh termin = nominal tagihan |
| CALLBACK_LOG | ref_gateway, payload, signature_valid, diterima_at | Jejak callback pembayaran |
| PENGAJUAN_KERINGANAN / KUITANSI | jenis, dokumen, keputusan, no_kuitansi, kode_verifikasi | Keringanan & bukti bayar |

| Entitas | Atribut Kunci | Keterangan |
| --- | --- | --- |
| LAYANAN_SURAT | jenis_surat, nim, status, file_hasil | Layanan administrasi |
| PENGUMUMAN / NOTIFIKASI / AUDIT_LOG | judul, target, dibaca_at, aksi, data_lama, data_baru | Informasi dan jejak audit |

## 9. Aturan Bisnis SIDIK

| Kode | Aturan |
| --- | --- |
| BR‑SD‑01 | Satu mahasiswa hanya memiliki satu KRS per tahun akademik. |
| BR‑SD‑02 | KRS hanya dapat diisi jika tagihan semester berjalan berstatus Lunas, Dispensasi, atau cicilan tahap minimal telah dibayar. |
| BR‑SD‑03 | Batas SKS ditentukan oleh IPS semester sebelumnya sesuai tabel yang dapat dikonfigurasi BAAK (contoh: IPS ≥ 3,00 → maks 24 SKS; 2,50–2,99 → 21 SKS; 2,00–2,49 → 18 SKS; < 2,00 → 15 SKS). Mahasiswa semester 1 mengikuti paket. |
| BR‑SD‑04 | Mata kuliah dengan prasyarat hanya dapat diambil jika prasyarat telah lulus dengan nilai minimal yang dikonfigurasi. |
| BR‑SD‑05 | Perubahan KRS setelah disetujui hanya dalam masa tambah/batal, dan setiap perubahan dikirim ke E-Learning sebagai event. |
| BR‑SD‑06 | Nilai dari E-Learning berstatus draf sampai divalidasi Kaprodi/BAAK; hanya nilai terpublikasi yang tampil di KHS. |
| BR‑SD‑07 | Nilai terpublikasi terkunci; koreksi hanya oleh BAAK dengan alasan dan tercatat di audit log. |
| BR‑SD‑08 | Status tagihan hanya menjadi Lunas melalui callback terverifikasi, verifikasi manual Admin Keuangan, atau rekonsiliasi. |
| BR‑SD‑09 | Callback pembayaran duplikat tidak boleh menambah saldo pembayaran dua kali (idempotensi). |
| BR‑SD‑10 | Tagihan yang sudah dibayar sebagian tidak dapat dihapus, hanya dikoreksi dengan catatan koreksi. |
| BR‑SD‑11 | Denda keterlambatan nonaktif secara default dan hanya dapat diaktifkan atas keputusan pimpinan/yayasan. |
| BR‑SD‑12 | Data keuangan tidak pernah dikirim ke Sistem E-Learning. |
| BR‑SD‑13 | Cicilan hanya dapat dibentuk untuk tagihan yang belum dibayar sama sekali. Jumlah termin maksimal dikonfigurasi, dan jumlah seluruh termin sama dengan nominal tagihan. |
| BR‑SD‑14 | Status dan jumlah dibayar pada tagihan bercicilan selalu dihitung dari termin-terminnya dan tidak diubah langsung. |
| BR‑SD‑15 | Cicilan hanya dapat digabung kembali menjadi bayar sekaligus selama belum ada termin yang lunas. |
| BR‑SD‑16 | Termin atau tagihan yang belum lunas dan sudah lewat jatuh tempo ditampilkan sebagai Menunggak dan dihitung dalam angka tunggakan. |

## 10. Hak Akses SIDIK (RBAC)

Keterangan: C = Create, R = Read, U = Update, D = Delete, A = Approve/Validasi, — = tidak ada akses. "Sendiri" berarti terbatas pada data milik pengguna.

| Fitur SIDIK | Mahasiswa | Dosen | Dosen PA / Kaprodi | BAAK | Keuangan | Pimpinan | Superadmin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard & Profil | R/U sendiri | R/U sendiri | R/U sendiri | R/U | R/U | R | R/U |
| Master Data Akademik | — | R | R | C/R/U/D | R | R | C/R/U/D |
| Jadwal Kuliah | R sendiri | R sendiri | R | C/R/U/D | — | R | R |
| KRS | C/R/U sendiri | — | R/A bimbingan | R/U | R | R | R |
| Nilai Resmi & KHS | R sendiri | R kelas ampu | A (Kaprodi) | R/U/A | — | R | R |
| Tagihan & Pembayaran | R/C bayar sendiri | — | — | R | C/R/U/A | R | R |
| Keringanan UKT | C/R sendiri | — | — | — | R/A | R/A | R |
| Pengumuman | R | R | R | C/R/U/D | C/R/U | C/R | C/R/U/D |
| Layanan Surat | C/R sendiri | — | — | R/U/A | — | — | R |
| Laporan & Dashboard Eksekutif | — | — | R prodi | R | R | R | R |
| Pengguna, Role, Client SSO, Audit Log | — | — | — | — | — | R | C/R/U/D |

# BAGIAN C — SISTEM 2: E-LEARNING

## 11. Ringkasan Sistem E-Learning

### 11.1 Tujuan dan Batasan

E-Learning adalah sistem pembelajaran daring IAI Sukabumi. Seluruh kelas dan peserta berasal dari SIDIK, sehingga dosen tidak perlu membuat kelas atau mendaftarkan mahasiswa secara manual. E-Learning tidak menyimpan data keuangan, tidak menerbitkan KHS, dan tidak memiliki login sendiri; pengguna masuk melalui SSO SIDIK. Nilai yang dihasilkan E-Learning bersifat draf sampai divalidasi di SIDIK.

### 11.2 Modul E-Learning

| Modul | Fungsi Utama |
| --- | --- |
| Akses & Dashboard | Login SSO, dashboard Mahasiswa/Dosen/Kaprodi, Kelas Saya |
| Kelas & Materi | Kelas otomatis dari SIDIK, pertemuan, materi, tautan kelas virtual |
| Tugas | Pembuatan tugas, pengumpulan, penilaian, feedback |
| Kuis & Ujian | Bank soal, kuis/UTS/UAS online, penilaian otomatis & manual |
| Presensi | Presensi per pertemuan (manual atau kode/QR), rekap kehadiran |
| Forum | Diskusi per kelas/pertemuan |
| Penilaian | Bobot komponen, rekap nilai, kirim nilai ke SIDIK |
| Administrasi E-Learning | Log sinkronisasi, konfigurasi, laporan aktivitas |

### 11.3 Peta Menu E-Learning

| Menu | Sub‑menu | Aktor |
| --- | --- | --- |
| Beranda | Kelas hari ini, tenggat terdekat, pengumuman kelas, notifikasi | Mahasiswa, Dosen |
| Kelas Saya | Daftar kelas semester aktif dan arsip semester lalu | Mahasiswa, Dosen |
| Halaman Kelas | Pertemuan, Materi, Tugas, Kuis/Ujian, Presensi, Forum, Peserta, Nilai | Mahasiswa, Dosen |
| Bank Soal | Kelola soal per mata kuliah | Dosen |
| Penilaian | Bobot komponen, rekap nilai, kirim ke SIDIK, status validasi | Dosen |
| Monitoring | Aktivitas kelas per prodi | Kaprodi, Pimpinan |
| Administrasi | Log sinkronisasi, konfigurasi, pengguna tersinkron | Admin E-Learning |
| Kembali ke SIDIK | Tautan ke portal SIDIK (tanpa login ulang) | Semua |

## 12. Use Case E-Learning

### 12.1 Use Case Diagram E-Learning

*[Diagram: Gambar 12.1 — Use Case Sistem E-Learning  — lihat berkas PDF asli untuk visualnya]*

### 12.2 Daftar Use Case E-Learning

| ID | Use Case | Aktor Utama | Modul | Sprint |
| --- | --- | --- | --- | --- |
| UC‑EL‑01 | Login via SSO SIDIK | Mahasiswa, Dosen | Akses | 2 |
| UC‑EL‑02 | Lihat Dashboard & Kelas Saya | Mahasiswa, Dosen | Akses | 2 |
| UC‑EL‑03 | Sinkron Kelas & Peserta dari SIDIK | Sistem | Kelas | 3 |
| UC‑EL‑04 | Kelola & Akses Materi | Dosen, Mahasiswa | Kelas & Materi | 3 |
| UC‑EL‑05 | Buat & Kumpulkan Tugas | Dosen, Mahasiswa | Tugas | 3 |
| UC‑EL‑06 | Nilai Tugas & Beri Feedback | Dosen | Tugas | 3 |
| UC‑EL‑07 | Kelola Bank Soal, Buat & Kerjakan Kuis/Ujian | Dosen, Mahasiswa | Kuis & Ujian | 3 |
| UC‑EL‑08 | Presensi Pertemuan | Dosen, Mahasiswa | Presensi | 3 |
| UC‑EL‑09 | Rekap Nilai & Kirim ke SIDIK | Dosen | Penilaian | 3 |
| UC‑EL‑10 | Lihat Nilai Pembelajaran | Mahasiswa | Penilaian | 3 |
| UC‑EL‑11 | Diskusi Forum | Dosen, Mahasiswa | Forum | 4 |
| UC‑EL‑12 | Pantau Aktivitas Pembelajaran | Kaprodi, Pimpinan | Monitoring | 4 |
| UC‑EL‑13 | Pantau Log Sinkronisasi & Konfigurasi | Admin E-Learning | Administrasi | 3–4 |

### 12.3 Spesifikasi Use Case Utama E-Learning

**UC-EL-03 Sinkron Kelas & Peserta dari SIDIK**

| Elemen | Uraian |
| --- | --- |
| Aktor | Sistem E-Learning (Sync Worker), SIDIK Integration API |
| Prakondisi | Client service-to-service terdaftar di SIDIK; kelas semester aktif telah dipublikasikan BAAK |
| Alur Utama | 1) SIDIK mengirim webhook kelas.dipublikasi. 2) Sync Worker menarik daftar kelas. 3) E-Learning membuat/memperbarui course dan 16 pertemuan default. 4) Saat webhook krs.disetujui diterima, Sync Worker menarik peserta terbaru dan memperbarui enrollment. 5) Worker mengirim acknowledgement. |
| Alur Alternatif | Webhook gagal → sinkron terjadwal tiap 15 menit berdasarkan updated_since; mahasiswa batal KRS → enrollment dinonaktifkan (data tugas tetap tersimpan). |
| Pascakondisi | Daftar kelas dan peserta di E-Learning sama dengan SIDIK |

**UC-EL-05 Buat & Kumpulkan Tugas**

| Elemen | Uraian |
| --- | --- |
| Aktor | Dosen, Mahasiswa |
| Prakondisi | Mahasiswa terdaftar aktif di kelas |
| Alur Utama | 1) Dosen membuat tugas (deskripsi, lampiran, tenggat, bobot, tipe berkas). 2) Sistem memberi notifikasi peserta. 3) Mahasiswa mengunggah jawaban. 4) Sistem mencatat waktu dan versi. 5) Dosen menilai dan memberi feedback. 6) Nilai masuk rekap. |
| Alur Alternatif | Lewat tenggat → ditandai terlambat atau ditolak sesuai pengaturan; berkas melebihi batas ukuran atau tipe tidak sesuai → ditolak. |
| Pascakondisi | Submission dan nilai tercatat |

**UC-EL-07 Kuis/Ujian Online**

| Elemen | Uraian |
| --- | --- |
| Aktor | Dosen, Mahasiswa |
| Prakondisi | Soal tersedia di bank soal; kuis dipublikasikan |
| Alur Utama | 1) Dosen menyusun kuis dan mengatur jadwal, durasi, pengacakan, dan jumlah percobaan. 2) Mahasiswa memulai attempt; timer berjalan di server. 3) Jawaban tersimpan otomatis berkala. 4) Mahasiswa submit atau waktu habis. 5) Soal objektif dinilai otomatis; esai dinilai dosen. |
| Alur Alternatif | Koneksi terputus → attempt dapat dilanjutkan selama waktu masih tersisa; di luar jadwal → akses ditolak. |
| Pascakondisi | Nilai kuis masuk rekap kelas |

**UC-EL-09 Rekap Nilai & Kirim ke SIDIK**

| Elemen | Uraian |
| --- | --- |
| Aktor | Dosen; SIDIK Integration API |
| Prakondisi | Bobot komponen ditetapkan (total 100%); periode input nilai SIDIK aktif |
| Alur Utama | 1) Dosen memeriksa rekap nilai. 2) Menekan "Kirim Nilai ke SIDIK". 3) E-Learning mengirim batch dengan idempotency key. 4) SIDIK membalas status diterima. 5) Status validasi dan publikasi dari SIDIK ditampilkan di E-Learning. |
| Alur Alternatif | SIDIK menolak (di luar periode/peserta tidak cocok) → error per mahasiswa ditampilkan; dosen dapat mengirim ulang sebelum nilai divalidasi. |
| Pascakondisi | Nilai akhir tercatat sebagai draf di SIDIK |

## 13. Kebutuhan Fungsional E-Learning

### 13.1 Akses, Kelas & Materi

| Kode | Kebutuhan | Prioritas | Sprint |
| --- | --- | --- | --- |
| FR‑EL‑15 | Login hanya melalui SSO SIDIK (client OIDC); tidak ada registrasi mandiri | P0 | 2 |
| FR‑EL‑16 | Dashboard per role: Mahasiswa (kelas & tenggat), Dosen (kelas ampu & tugas perlu dinilai), Kaprodi (monitoring) | P0 | 2 |
| FR‑EL‑01 | Kelas E-Learning terbentuk otomatis dari kelas SIDIK; peserta tersinkron dari KRS yang disetujui | P0 | 3 |
| FR‑EL‑02 | Halaman "Kelas Saya" untuk mahasiswa dan dosen, termasuk arsip semester lalu | P0 | 3 |
| FR‑EL‑03 | Dosen mengunggah materi (PDF, PPT, DOC, tautan video, teks) per pertemuan (default 16 pertemuan) | P0 | 3 |
| FR‑EL‑17 | Dosen dapat menambahkan tautan kelas virtual (Zoom/Google Meet) per pertemuan | P1 | 3 |

### 13.2 Tugas, Kuis & Ujian

| Kode | Kebutuhan | Prioritas | Sprint |
| --- | --- | --- | --- |
| FR‑EL‑04 | Dosen membuat tugas (deskripsi, lampiran, tenggat, bobot, tipe & ukuran file) | P0 | 3 |
| FR‑EL‑05 | Mahasiswa mengumpulkan tugas; submission terlambat ditandai atau ditolak sesuai pengaturan | P0 | 3 |
| FR‑EL‑06 | Dosen menilai tugas dan memberi feedback | P0 | 3 |
| FR‑EL‑18 | Bank soal per mata kuliah yang dapat dipakai ulang lintas semester | P0 | 3 |
| FR‑EL‑07 | Kuis/ujian online: pilihan ganda, benar/salah, isian singkat, esai; durasi, jadwal buka-tutup, acak soal | P0 | 3 |
| FR‑EL‑08 | Penilaian otomatis untuk soal objektif; penilaian manual untuk esai | P0 | 3 |
| FR‑EL‑19 | Timer ujian di sisi server dan autosave jawaban berkala | P0 | 3 |

### 13.3 Presensi, Forum & Notifikasi

| Kode | Kebutuhan | Prioritas | Sprint |
| --- | --- | --- | --- |
| FR‑EL‑09 | Presensi per pertemuan oleh dosen (manual) atau oleh mahasiswa via kode/QR dengan batas waktu | P0 | 3 |
| FR‑EL‑14 | Rekap presensi yang dapat dipakai sebagai syarat ujian (mis. minimal 75%) | P1 | 3 |
| FR‑EL‑13 | Notifikasi materi baru, tugas baru, tenggat H-1, dan nilai terbit | P1 | 3 |
| FR‑EL‑10 | Forum diskusi per kelas/pertemuan | P1 | 4 |

### 13.4 Penilaian & Integrasi Nilai

| Kode | Kebutuhan | Prioritas | Sprint |
| --- | --- | --- | --- |
| FR‑EL‑11 | Rekap nilai kelas dengan bobot komponen (tugas, kuis, presensi, UTS, UAS) | P0 | 3 |
| FR‑EL‑12 | Kirim nilai akhir ke SIDIK dalam satu aksi (batch) dan tampilkan status validasi dari SIDIK | P0 | 3 |
| FR‑EL‑20 | Nilai terkunci di E-Learning setelah SIDIK mempublikasikan nilai kelas tersebut | P0 | 3 |

### 13.5 Administrasi & Laporan E-Learning

| Kode | Kebutuhan | Prioritas | Sprint |
| --- | --- | --- | --- |
| FR‑EL‑21 | Log sinkronisasi (kelas, peserta, nilai) beserta status sukses/gagal dan tombol sinkron ulang | P0 | 3 |
| FR‑EL‑22 | Konfigurasi: bobot default, batas ukuran berkas, tipe berkas, jumlah pertemuan default | P1 | 3 |
| FR‑EL‑23 | Laporan aktivitas pembelajaran per kelas/prodi (materi terunggah, tugas, kehadiran) untuk Kaprodi & pimpinan | P1 | 4 |
| FR‑EL‑24 | Audit log untuk perubahan nilai dan pengaturan kuis | P0 | 4 |

## 14. Alur Proses E-Learning

### 14.1 Activity Diagram — Tugas

*[Diagram: Gambar 14.1 — Activity Diagram Tugas E-Learning  — lihat berkas PDF asli untuk visualnya]*

### 14.2 Activity Diagram — Kuis/Ujian Online

*[Diagram: Gambar 14.2 — Activity Diagram Kuis/Ujian Online  — lihat berkas PDF asli untuk visualnya]*

## 15. Model Data E-Learning

### 15.1 ERD E-Learning

*[Diagram: Gambar 15.1 — ERD Sistem E-Learning  — lihat berkas PDF asli untuk visualnya]*

### 15.2 Deskripsi Entitas Utama E-Learning

| Entitas | Atribut Kunci | Keterangan |
| --- | --- | --- |
| EL_USER | id, sidik_user_id, nim/nidn, nama, role, status | Salinan identitas minimum dari SIDIK (tanpa password) |
| EL_COURSE | id, sidik_kelas_id, kode_mk, nama_mk, sks, tahun_akademik, status | Kelas online yang terhubung 1:1 dengan kelas SIDIK |
| EL_TEACHER / EL_ENROLLMENT | course_id, user_id, status, synced_at | Pengampu dan peserta hasil sinkron |
| EL_PERTEMUAN | course_id, pertemuan_ke, tanggal, topik, link_virtual | Struktur pertemuan |
| EL_MATERI | pertemuan_id, judul, tipe, file_url, publish_at | Materi pembelajaran |
| EL_TUGAS / EL_SUBMISSION | tenggat, bobot, izin_terlambat / file_url, submitted_at, nilai, feedback | Tugas dan pengumpulan |
| EL_BANK_SOAL / EL_SOAL | mk_kode, tipe_soal, teks, opsi, kunci, skor | Bank soal |
| EL_KUIS / EL_ATTEMPT | jadwal_buka, durasi, acak / mulai_at, jawaban, skor, status | Kuis dan percobaan |
| EL_PRESENSI | pertemuan_id, enrollment_id, status, metode, waktu | Kehadiran |
| EL_FORUM_TOPIK / EL_FORUM_POST | judul, isi, parent_id | Diskusi |
| EL_KOMPONEN_NILAI / EL_NILAI | nama_komponen, bobot / nilai_komponen | Struktur penilaian |
| EL_GRADE_SUBMISSION | course_id, idempotency_key, status (terkirim, diterima, divalidasi, dipublikasi, ditolak) | Riwayat pengiriman nilai ke SIDIK |
| EL_SYNC_LOG | tipe, event_id, status, error, waktu | Log integrasi |

## 16. Aturan Bisnis E-Learning

| Kode | Aturan |
| --- | --- |
| BR‑EL‑01 | Kelas E-Learning tidak dapat dibuat manual di luar kelas SIDIK, kecuali kelas non-SKS yang diizinkan Admin E-Learning. |
| BR‑EL‑02 | Hanya peserta dengan KRS disetujui yang dapat mengakses kelas; mahasiswa yang batal KRS kehilangan akses tetapi datanya tetap tersimpan. |
| BR‑EL‑03 | Presensi minimal untuk mengikuti UAS dapat dikonfigurasi (default 75%). |
| BR‑EL‑04 | Total bobot komponen nilai harus 100% sebelum nilai dapat dikirim ke SIDIK. |
| BR‑EL‑05 | Nilai dapat dikirim ulang ke SIDIK selama belum divalidasi; setelah dipublikasi SIDIK, nilai di E-Learning terkunci. |
| BR‑EL‑06 | Timer ujian mengacu pada waktu server; jawaban terakhir yang tersimpan otomatis dikirim ketika waktu habis. |
| BR‑EL‑07 | Materi dan submission tetap dapat diakses sebagai arsip selama minimal 2 semester setelah kelas berakhir (dapat dikonfigurasi). |
| BR‑EL‑08 | E-Learning tidak menyimpan data keuangan dan tidak menampilkan status pembayaran mahasiswa. |

## 17. Hak Akses E-Learning (RBAC)

Role di E-Learning berasal dari SIDIK melalui SSO; hak akses dievaluasi per kelas.

| Fitur E-Learning | Mahasiswa | Dosen Pengampu | Kaprodi | Pimpinan | Admin E-Learning |
| --- | --- | --- | --- | --- | --- |
| Dashboard & Kelas Saya | R kelas terdaftar | R kelas ampu | R kelas prodi | R | R |
| Materi | R | C/R/U/D | R | — | R |
| Tugas & Submission | C/R sendiri | C/R/U/D + nilai | R | — | R |
| Bank Soal & Kuis | R/kerjakan | C/R/U/D + nilai | R | — | R |
| Presensi | C (kode/QR) / R sendiri | C/R/U | R | R rekap | R |
| Forum | C/R | C/R/U/D (moderasi) | R | — | R/D |
| Rekap & Kirim Nilai | R nilai sendiri | C/R/U + kirim | R | — | R |
| Laporan Aktivitas | — | R kelas ampu | R prodi | R | R |
| Log Sinkronisasi & Konfigurasi | — | — | — | — | C/R/U |

# BAGIAN D — INTEGRASI

## 18. Integrasi SIDIK ↔ E-Learning

### 18.1 Prinsip Integrasi

- SIDIK adalah sumber kebenaran untuk identitas, kelas, peserta, dan nilai resmi; E-Learning adalah sumber kebenaran untuk aktivitas pembelajaran dan nilai komponen.
- Integrasi bersifat longgar (loosely coupled): gangguan di E-Learning tidak menghentikan KRS atau pembayaran di SIDIK, dan sebaliknya E-Learning tetap dapat dipakai dengan data sinkron terakhir.
- Setiap pertukaran data menggunakan API terdokumentasi (OpenAPI), token service-to-service, HTTPS, dan idempotency key.
- Event dikirim melalui webhook dengan mekanisme retry, serta didukung sinkron terjadwal sebagai jaring pengaman.

### 18.2 Titik Integrasi

| Kode | Arah | Data | Pemicu | Metode |
| --- | --- | --- | --- | --- |
| INT‑01 | SIDIK internal (Keuangan → SIAKAD) | Status lunas/dispensasi | Callback pembayaran / keringanan disetujui | Event internal |
| INT‑02 | SIDIK → E-Learning | Kelas, mata kuliah, dosen pengampu, jadwal | BAAK mempublikasikan kelas | Webhook + GET API |
| INT‑03 | SIDIK → E-Learning | Peserta kelas (KRS disetujui, tambah/batal) | KRS disetujui/diubah | Webhook + GET API |
| INT‑04 | E-Learning → SIDIK | Nilai akhir per mahasiswa per kelas | Dosen menekan "Kirim Nilai" | POST API |
| INT‑05 | SIDIK → E-Learning | Status validasi/publikasi nilai | Kaprodi/BAAK memvalidasi | Webhook |
| INT‑06 | SIDIK → E-Learning | Penonaktifan pengguna | Akun dinonaktifkan/status mahasiswa berubah | Webhook + single logout |
| INT‑07 | E-Learning → SIDIK (opsional) | Rekap persentase kehadiran | Akhir periode perkuliahan | POST API |
| INT‑08 | SSO | Autentikasi pengguna | Login ke E-Learning | OAuth2/OIDC |

### 18.3 Single Sign-On

*[Diagram: Gambar 18.1 — Sequence Diagram Login SSO E-Learning melalui SIDIK  — lihat berkas PDF asli untuk visualnya]*

### 18.4 Sinkronisasi Kelas dan Peserta

*[Diagram: Gambar 18.2 — Sequence Diagram Sinkronisasi Kelas & Peserta  — lihat berkas PDF asli untuk visualnya]*

### 18.5 Pengiriman Nilai E-Learning ke SIDIK

*[Diagram: Gambar 18.3 — Sequence Diagram Pengiriman Nilai  — lihat berkas PDF asli untuk visualnya]*

### 18.6 Rancangan Endpoint Integration API (indikatif)

| Metode | Endpoint | Disediakan oleh | Fungsi |
| --- | --- | --- | --- |
| GET | /oauth/authorize, POST /oauth/token | SIDIK | Alur login SSO |
| GET | /api/integrasi/users/me | SIDIK | Profil dan role pengguna yang login |
| GET | /api/integrasi/kelas?ta={kode}&updated_since= | SIDIK | Daftar kelas semester |
| GET | /api/integrasi/kelas/{id}/peserta | SIDIK | Peserta kelas |
| POST | /api/integrasi/nilai | SIDIK | Terima batch nilai akhir |
| GET | /api/integrasi/nilai/batch/{id} | SIDIK | Status batch nilai |
| POST | /api/integrasi/presensi (opsional) | SIDIK | Terima rekap kehadiran |
| POST | /api/webhooks/sidik | E‑Learning | Menerima event dari SIDIK |
| POST | /api/integrasi/ack | SIDIK | Konfirmasi event telah diproses |

Kontrak detail (skema JSON, kode error, versi API) dituangkan dalam dokumen spesifikasi API terpisah pada Sprint 2 dan dibekukan (*frozen*) sebelum Sprint 3.

### 18.7 Penanganan Kegagalan

| Kondisi | Penanganan |
| --- | --- |
| Webhook gagal dikirim | Retry otomatis dengan jeda bertahap (1, 5, 15, 60 menit), lalu tercatat sebagai gagal di log integrasi |
| E-Learning tidak tersedia | SIDIK tetap berjalan; event menunggu di antrean hingga E-Learning pulih |
| SIDIK tidak tersedia | E-Learning tetap berjalan dengan data terakhir; pengiriman nilai ditunda dan dicoba ulang |
| Data tidak cocok (peserta tidak ada) | SIDIK menolak baris terkait dengan pesan error; baris lain tetap diproses |
| Pengiriman nilai ganda | Idempotency key mencegah duplikasi |
| Integrasi nilai bermasalah menjelang tenggat | Jalur cadangan input nilai manual di SIDIK (FR-AK-20) |

## 19. Integrasi Eksternal

| Sistem | Terhubung dengan | Tujuan | Metode | Catatan |
| --- | --- | --- | --- | --- |
| Payment Gateway / Bank Mitra | SIDIK | VA/QRIS dan notifikasi pembayaran | REST API + webhook callback | Penyedia & bank mitra (mis. bank syariah) ditetapkan bersama klien sebelum Sprint 4 |
| PDDikti Neo Feeder | SIDIK | Pelaporan data akademik nasional | Web service Neo Feeder / ekspor terstruktur | Akses feeder disediakan kampus |
| Email (SMTP) | SIDIK & E-Learning | Reset password dan notifikasi | SMTP domain kampus | Domain resmi agar tidak masuk spam |
| WhatsApp API | SIDIK | Notifikasi tagihan, KRS, nilai | WhatsApp Business API resmi | Biaya per pesan ditanggung klien |
| Zoom / Google Meet | E‑Learning | Tautan kelas virtual | Tautan manual oleh dosen | Tidak ada integrasi API di Release 1 |

# BAGIAN E — KUALITAS & DELIVERY

## 20. Kebutuhan Non-Fungsional

Kebutuhan berikut berlaku untuk masing-masing sistem kecuali disebutkan lain.

| Kode | Kategori | Kebutuhan |
| --- | --- | --- |
|  |  |  |
| NFR‑01 | Kinerja | Waktu respons halaman p95 < 2 detik pada beban normal; < 4 detik pada puncak periode KRS |
| NFR‑02 | Skalabilitas | Mampu melayani minimal 1.000 pengguna bersamaan pada puncak KRS (angka final disesuaikan dengan jumlah mahasiswa aktif IAI Sukabumi) |
| NFR‑03 | Ketersediaan | Uptime ≥ 99,5% per bulan di luar jadwal maintenance yang diumumkan |
| NFR‑04 | Keamanan | HTTPS/TLS, password di-hash (bcrypt/argon2), proteksi OWASP Top 10, rate limiting login, CSRF/XSS protection |
| NFR‑05 | Keamanan Pembayaran | Tidak menyimpan data kartu; verifikasi signature callback; whitelist IP gateway; kredensial di secret manager |
| NFR‑06 | Privasi Data | Mengikuti prinsip UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi: akses minimum, audit, dan persetujuan penggunaan data |
| NFR‑07 | Audit | Aksi kritis (nilai, tagihan, role) tercatat lengkap dan tidak dapat dihapus oleh pengguna biasa |
| NFR‑08 | Backup & Pemulihan | Backup harian otomatis, retensi 30 hari; RPO ≤ 24 jam, RTO ≤ 4 jam; uji restore tiap akhir sprint 4 |
| NFR‑09 | Usability | Antarmuka Bahasa Indonesia, konsisten, dapat digunakan mahasiswa tanpa pelatihan khusus |
| NFR‑10 | Responsif & Kompatibilitas | Mendukung Chrome, Edge, Firefox, Safari versi terbaru; layar mulai 360 px |
| NFR‑11 | Aksesibilitas | Kontras warna memadai, label form jelas, dapat dinavigasi dengan keyboard (acuan WCAG 2.1 AA) |
| NFR‑12 | Maintainability | Kode terdokumentasi, API terdokumentasi OpenAPI, cakupan unit test modul kritis (auth, KRS, nilai, pembayaran) ≥ 70% |
| NFR‑13 | Observabilitas | Logging terpusat, monitoring uptime, alert error dan kegagalan callback |
| NFR‑14 | Penyimpanan Berkas | Batas unggah default 20 MB per berkas (dapat dikonfigurasi); pemindaian tipe file |
| NFR‑15 | Isolasi Sistem | SIDIK dan E-Learning memiliki basis data, kredensial, dan backup terpisah; kegagalan satu sistem tidak menghentikan sistem lain |
| NFR‑16 | Kinerja Ujian (E-Learning) | Mampu melayani ujian online serentak minimal 500 peserta dengan autosave tanpa kehilangan jawaban (angka final menyesuaikan jumlah mahasiswa) |
| NFR‑17 | Kinerja Integrasi | Sinkron peserta < 15 menit setelah KRS disetujui; respons API integrasi p95 < 1 detik |

## 21. Rencana Sprint

### 21.1 Roadmap

Pengembangan berjalan dalam dua jalur: jalur SIDIK dan jalur E-Learning. Sprint 1 fokus pada SIDIK (sesuai board Trello). Jalur E-Learning dimulai pada Sprint 2 secara paralel. Setiap sprint diestimasi 3 minggu; tanggal bersifat indikatif dan dikunci saat Sprint Planning. Gambar 21.1 — Roadmap Dua Jalur SIDIK & E-Learning

| Sprint | Jalur SIDIK | Jalur E-Learning | Hasil Demo |
| --- | --- | --- | --- |
| Sprint 1 | Fondasi Portal Mahasiswa | — | Portal SIDIK dapat diakses mahasiswa end-to-end |
| Sprint 2 | SIAKAD Inti, RBAC, SSO Identity Provider | Fondasi E-Learning & login SSO | KRS lengkap di SIDIK; login E-Learning via akun SIDIK |
| Sprint 3 | Integration API, validasi & publikasi nilai | Kelas, materi, tugas, kuis, presensi, penilaian, kirim nilai | Satu kelas berjalan dari materi di E-Learning hingga KHS di SIDIK |
| Sprint 4 | Keuangan & UKT, layanan, laporan | Forum, laporan aktivitas, hardening ujian | Simulasi satu semester: bayar → KRS → kuliah → nilai → KHS |

### 21.2 Alur Kerja Board

Disarankan menggunakan dua board Trello terpisah (SIDIK dan E-Learning) atau satu board dengan label sistem yang jelas. Kartu hanya dipindahkan ke In Progress ketika anggota tim benar-benar mulai mengerjakannya, dan hanya masuk Done jika memenuhi Definition of Done. Gambar 21.2 — Alur Kartu pada Board Definition of Ready (DoR) — item siap masuk sprint bila: user story jelas, acceptance criteria tertulis, prioritas ditetapkan, desain/data pendukung tersedia, ketergantungan antar sistem teridentifikasi, dan estimasi SP disepakati. Definition of Done (DoD) — item selesai bila: kode di-review, lolos pengujian fungsional dan responsif, tidak ada bug kritis, dokumentasi/API diperbarui, ter-deploy ke staging sistem terkait, untuk item integrasi telah diuji end-to-end di kedua sistem, dan disetujui pada UAT atau catatan perbaikan tercatat.

### 21.3 Sprint 1 — SIDIK: Fondasi Portal Mahasiswa

Sprint Goal: Mahasiswa dapat login ke SIDIK, melihat dashboard dan profil, membaca pengumuman terbaru, serta menavigasi seluruh menu utama; fitur yang belum dikembangkan tampil sebagai Coming Soon.
Sumber: item di bawah ini berasal langsung dari board Trello "SIDIK Portal Akademik Mahasiswa". Kolom status mengikuti posisi kartu pada saat ekspor. Seluruh item Sprint 1 termasuk Sistem 1 — SIDIK; Sistem E-Learning belum dikerjakan pada sprint ini. A. Sprint Backlog Sprint 1

| No | Item (Kartu Trello) | Prioritas | Label | Status di Board | SP |
| --- | --- | --- | --- | --- | --- |
| S1‑01 | Dashboard mahasiswa | P0 | — | Sprint 1 | 5 |
| S1‑02 | Profil / identitas mahasiswa | P0 | — | Sprint 1 | 3 |
| S1‑03 | Menu Akademik | P0 | — | Sprint 1 | 2 |
| S1‑04 | Menu E‑Learning | P0 | — | Sprint 1 | 2 |
| S1‑05 | Menu Layanan Mahasiswa | P0 | — | Sprint 1 | 2 |
| S1‑06 | Menu Pengumuman | P0 | — | Sprint 1 | 3 |
| S1‑07 | UI form login mahasiswa | P0 | — | Sprint 1 | 3 |
| S1‑08 | Login mahasiswa selesai | P0 | — | Sprint 1 | 3 |
| S1‑09 | Navigasi sidebar untuk semua menu utama | P0 | UI/UX | Sprint 1 | 3 |
| S1‑10 | Integrasi autentikasi dan session | P0 | Backend | Sprint 1 | 5 |
| S1‑11 | Bangun area pengumuman terbaru | P0 | — | Sprint 1 | 3 |
| S1‑12 | Tampilkan ringkasan identitas pada dashboard | P0 | — | Sprint 1 | 2 |
| S1‑13 | Template halaman Coming Soon | P0 | — | Sprint 1 | 2 |
| S1‑14 | Responsif mobile untuk portal SIDIK | P1 | — | Sprint 1 | 3 |
| S1‑15 | Template dasar halaman profil selesai | P0 | — | Sprint 1 | 2 |
| S1‑16 | Review alur login dan logout | P0 | Backend | Code Review / Testing | 2 |
| S1‑17 | Testing dashboard dan navigasi | P0 | QA | Code Review / Testing | 2 |
| S1‑18 | Validasi UAT dashboard mahasiswa | P0 | Mahasiswa | UAT | 1 |
| S1‑19 | Validasi UAT Coming Soon | P0 | P0 | UAT | 1 |
|  | Total |  |  |  | 49 |

B. Placeholder Coming Soon (bagian dari Sprint 1)

| No | Item (Kartu Trello) | Diaktifkan Penuh Pada |
| --- | --- | --- |
| S1‑CS1 | Coming Soon — KRS | Sprint 2 |
| S1‑CS2 | Coming Soon — E-Learning | Sprint 3 (diganti launcher SSO ke Sistem E-Learning) |
| S1‑CS3 | Coming Soon — Layanan Mahasiswa | Sprint 4 |
| S1‑CS4 | Coming Soon — Pengumuman & Informasi | Sprint 2 (CRUD admin) |
| S1‑CS5 | Coming Soon — Modul dosen dan admin | Sprint 2 (RBAC & dashboard per role) |

C. Detail Item Sprint 1 S1-01 Dashboard mahasiswa
- User Story: Sebagai mahasiswa, saya ingin mengakses dashboard akademik, sehingga
saya dapat melihat informasi akademik dan mengakses layanan dari satu tempat.
- Task teknis: susun widget NIM, nama, program studi, semester, pengumuman, shortcut,
dan notifikasi.
- Acceptance Criteria: ringkasan data mahasiswa tampil; pengumuman terbaru muncul;
shortcut layanan tersedia; notifikasi ditampilkan jika ada.
- Definition of Done: dashboard dapat dibuka setelah login; data sesuai user aktif; tampil
baik di desktop dan mobile. S1-02 Profil / identitas mahasiswa
- User Story: Sebagai mahasiswa, saya ingin melihat informasi profil, sehingga saya dapat
memeriksa identitas pribadi dan akademik saya.
- Task teknis: ambil dan render data pribadi, akademik, program studi, angkatan, kontak,
dan foto profil.
- Acceptance Criteria: data profil terlihat jelas; foto profil muncul bila tersedia; struktur
informasi mudah dipindai.
- Definition of Done: informasi profil tampil konsisten; sudah diuji untuk data kosong dan
data lengkap. S1-03 Menu Akademik
- User Story: Sebagai mahasiswa, saya ingin membuka menu Akademik, sehingga saya
dapat melihat fitur akademik yang tersedia atau akan datang.
- Task teknis: buat landing menu, daftar fitur, dan routing ke halaman Coming Soon.
- Acceptance Criteria: menu dapat diklik dari sidebar atau dashboard; fitur yang belum
tersedia diarahkan ke Coming Soon; nama fitur tetap jelas terlihat.
- Definition of Done: menu dapat dibuka tanpa error; tidak memberi kesan fitur sudah
berfungsi. S1-04 Menu E-Learning
- User Story: Sebagai mahasiswa, saya ingin membuka menu E-Learning, sehingga saya
dapat melihat fitur pembelajaran yang tersedia atau akan datang.
- Task teknis: buat halaman pengantar untuk mata kuliah, materi, tugas, kuis/ujian,
pengumpulan tugas, dan nilai pembelajaran. Mulai Sprint 3 menu ini menjadi launcher yang membuka Sistem E-Learning melalui SSO.
- Acceptance Criteria: menu dapat dibuka dari navigasi; setiap fitur menampilkan status
Coming Soon jika belum tersedia; desain tidak menimbulkan kesan sudah aktif.
- Definition of Done: routing menu selesai; tampilan placeholder konsisten.
S1-05 Menu Layanan Mahasiswa
- User Story: Sebagai mahasiswa, saya ingin membuka menu Layanan Mahasiswa,
sehingga saya dapat melihat layanan yang tersedia dan yang akan datang.
- Task teknis: siapkan daftar layanan, placeholder halaman, dan navigasi ke status Coming
Soon.
- Acceptance Criteria: menu layanan dapat diakses; nama layanan tampil jelas; fitur yang
belum tersedia tetap dapat diklik.
- Definition of Done: menu tersedia di portal; placeholder siap digunakan untuk sprint
berikutnya. S1-06 Menu Pengumuman
- User Story: Sebagai mahasiswa, saya ingin mengakses pengumuman dan informasi
kampus, sehingga saya selalu mendapat informasi kegiatan akademik dan kampus.
- Task teknis: sediakan tampilan daftar pengumuman, detail singkat, dan alur ke notifikasi.
- Acceptance Criteria: pengumuman akademik tampil; informasi kampus tampil; jadwal
kegiatan mudah dibaca; notifikasi dapat ditampilkan jika tersedia.
- Definition of Done: menu dapat diakses dari dashboard; informasi tampil jelas dan
ringkas.
S1-07 UI form login mahasiswa
- User Story: Sebagai mahasiswa, saya ingin login ke SIDIK, sehingga saya dapat
mengakses portal akademik dengan aman.
- Task teknis: buat field NIM/email, password, tombol masuk, pesan error, dan tautan
bantuan.
- Acceptance Criteria: form login tampil jelas; validasi input kosong berjalan; state error
mudah dipahami.
- Definition of Done: UI login selesai; sudah dicek di desktop dan mobile.
S1-08 Login mahasiswa selesai
- User Story: Sebagai mahasiswa, saya ingin login ke SIDIK, sehingga saya dapat
mengakses portal akademik dengan aman.
- Task teknis: implementasi form login, validasi, dan redirect berhasil.
- Acceptance Criteria: login berjalan dengan kredensial valid; error tampil saat login gagal;
session aman.
- Definition of Done: lolos review, testing, dan UAT; siap menjadi baseline pengembangan
berikutnya. S1-09 Navigasi sidebar untuk semua menu utama
- User Story: Sebagai mahasiswa, saya ingin menavigasi SIDIK dengan mudah, sehingga
saya dapat mengakses semua menu dengan cepat.
- Task teknis: sambungkan sidebar ke Dashboard, Akademik, E-Learning, Layanan
Mahasiswa, Pengumuman, Profil, dan Logout.
- Acceptance Criteria: semua menu utama dapat diklik; state menu aktif terlihat; navigasi
konsisten di desktop dan mobile.
- Definition of Done: sidebar stabil; rute tidak error; siap untuk review UI.
S1-10 Integrasi autentikasi dan session
- User Story: Sebagai mahasiswa, saya ingin login dan mengelola session dengan aman,
sehingga saya dapat mengakses SIDIK dengan aman.
- Task teknis: integrasi API login, simpan session/token, handle logout, dan redirect setelah
login sukses.
- Acceptance Criteria: kredensial valid menghasilkan login sukses; kredensial salah
menampilkan pesan error; logout menghapus session aktif.
- Definition of Done: integrasi berhasil; alur login dan logout stabil.
S1-11 Bangun area pengumuman terbaru
- User Story: Sebagai mahasiswa, saya ingin melihat pengumuman terbaru, sehingga saya
selalu mendapat informasi akademik dan kampus.
- Task teknis: buat card/list pengumuman dengan judul singkat, tanggal, dan ringkasan isi.
- Acceptance Criteria: pengumuman terbaru mudah terlihat; judul dan ringkasan dapat
dibaca; jika tidak ada data, tampil state kosong yang jelas.
- Definition of Done: komponen siap dipakai di dashboard; data kosong ditangani dengan
rapi. S1-12 Tampilkan ringkasan identitas pada dashboard
- User Story: Sebagai mahasiswa, saya ingin melihat ringkasan identitas di dashboard,
sehingga saya langsung mengetahui data akademik utama saya.
- Task teknis: ambil data user aktif dan render ke komponen ringkasan identitas (NIM,
nama, program studi, semester).
- Acceptance Criteria: NIM, nama mahasiswa, program studi, dan semester tampil.
- Definition of Done: data muncul dari sumber yang benar; field kosong memiliki fallback
yang jelas. S1-13 Template halaman Coming Soon
- User Story: Sebagai mahasiswa, saya ingin melihat halaman Coming Soon, sehingga
saya memahami bahwa fitur tersebut akan tersedia nanti.
- Task teknis: buat komponen reusable berisi nama fitur, status Coming Soon, deskripsi
singkat, dan tombol kembali ke dashboard.
- Acceptance Criteria: menampilkan nama fitur, status, dan fungsi singkat; ada tombol
kembali ke dashboard; tidak terlihat seperti fitur sudah aktif.
- Definition of Done: komponen dapat dipakai ulang untuk semua menu non-fungsional;
tampilan konsisten. S1-14 Responsif mobile untuk portal SIDIK
- User Story: Sebagai mahasiswa, saya ingin SIDIK nyaman digunakan di ponsel, sehingga
saya dapat mengakses portal di mana saja.
- Task teknis: sesuaikan layout dashboard, sidebar, dan kartu informasi agar responsif.
- Acceptance Criteria: layout menyesuaikan ukuran layar; navigasi tetap mudah; teks dan
kartu tidak bertumpuk.
- Definition of Done: sudah diuji pada perangkat mobile; tidak ada masalah layout utama.
S1-15 Template dasar halaman profil selesai
- User Story: Sebagai mahasiswa, saya ingin melihat profil saya, sehingga saya dapat
memeriksa identitas pribadi dan akademik.
- Task teknis: render data pribadi, akademik, program studi, angkatan, kontak, dan foto
profil sebagai pola dasar.
- Acceptance Criteria: struktur profil terbaca jelas; informasi utama tampil lengkap; layout
konsisten dengan dashboard.
- Definition of Done: lolos testing dan UAT; siap menjadi dasar fitur edit profil di Sprint 2.
S1-16 Review alur login dan logout
- Task teknis: cek validasi, penghapusan session, redirect, dan error handling.
- Acceptance Criteria: login berhasil dengan kredensial valid; logout menutup sesi; pesan
error sesuai kondisi.
- Definition of Done: lolos review kode; tidak ada bug kritis pada alur autentikasi.
S1-17 Testing dashboard dan navigasi
- Task teknis: cek tautan menu, state aktif, tampilan dashboard, dan konsistensi responsif.
- Acceptance Criteria: dashboard tampil setelah login; sidebar mengarah ke menu yang
benar; tidak ada error navigasi.
- Definition of Done: hasil testing terdokumentasi; temuan bug minor tercatat untuk
perbaikan. S1-18 Validasi UAT dashboard mahasiswa
- Task: Product Owner/perwakilan mahasiswa memeriksa dashboard, identitas, shortcut,
dan pengumuman.
- Acceptance Criteria: dashboard sesuai kebutuhan; identitas tampil benar; pengumuman
dan shortcut mudah dipahami.
- Definition of Done: UAT disetujui atau catatan perbaikan tercatat jelas.
S1-19 Validasi UAT Coming Soon
- Task: memeriksa nama fitur, status Coming Soon, deskripsi, dan tombol kembali pada
seluruh placeholder.
- Acceptance Criteria: kartu/menu tetap dapat diklik; status Coming Soon jelas; tidak ada
kesan fitur aktif; tombol kembali berfungsi.
- Definition of Done: placeholder aman dipakai untuk seluruh menu non-fungsional.

> Catatan Sprint 1: beberapa kartu bersifat saling tumpang tindih (mis. "Dashboard mahasiswa" dengan "Tampilkan ringkasan identitas pada dashboard", serta "UI form login" dengan "Login mahasiswa selesai"). Disarankan kartu induk dijadikan user story, sementara kartu turunannya dijadikan checklist/task teknis di dalam kartu induk agar progres tidak terhitung ganda.

### 21.4 Sprint 2 — SIDIK: SIAKAD Inti & SSO • E-Learning: Fondasi

Sprint Goal: BAAK dapat mengelola data akademik dan jadwal, mahasiswa dapat mengisi KRS yang disetujui Dosen PA, KHS dan transkrip tersedia, SIDIK berfungsi sebagai SSO Identity Provider, dan pengguna dapat login ke E-Learning memakai akun SIDIK.

> Ketergantungan: pembukaan KRS berdasarkan status pembayaran baru otomatis di Sprint 4. Selama Sprint 2–3, status "boleh KRS" diatur manual oleh Admin Keuangan melalui flag per mahasiswa. Status pembayaran yang menjadi dasar keputusan tersebut sudah dapat disimulasikan lewat verifikasi manual dan cicilan per bulan (6.4.1). Kontrak Integration API disusun pada sprint ini dan dibekukan sebelum Sprint 3.

A. Jalur SIDIK

| No | Item | Prioritas | Role | Kode FR | SP |
| --- | --- | --- | --- | --- | --- |
| SD‑S2‑01 | Role & hak akses (RBAC) serta manajemen pengguna | P0 | Superadmin | FR‑ADM‑01, 02 | 8 |
| SD‑S2‑02 | SSO Identity Provider (OIDC) & registrasi client E-Learning | P0 | Superadmin, Sistem | FR-SSO-01, 02, 03 | 5 |
| SD‑S2‑03 | Dashboard per role (Dosen, Admin, Pimpinan) | P0 | Semua | FR‑POR‑12 | 5 |
| SD‑S2‑04 | Lupa password & ganti password | P0 | Semua | FR-POR-09, 10, 13 | 3 |
| SD‑S2‑05 | Master fakultas, prodi, kurikulum, mata kuliah | P0 | BAAK | FR‑AK‑01, 02 | 8 |
| SD‑S2‑06 | Master mahasiswa & dosen + impor Excel | P0 | BAAK | FR‑AK‑03, 06 | 5 |
| SD‑S2‑07 | Tahun akademik & kalender akademik | P0 | BAAK | FR‑AK‑04 | 3 |
| SD‑S2‑08 | Kelas, ruang, jadwal + deteksi bentrok | P0 | BAAK | FR‑AK‑05 | 5 |
| SD‑S2‑09 | Pengisian KRS online dengan validasi | P0 | Mahasiswa | FR‑AK‑07, 09 | 8 |
| SD‑S2‑10 | Persetujuan KRS oleh Dosen PA | P0 | Dosen PA | FR‑AK‑08 | 3 |
| SD‑S2‑11 | KHS, IPS/IPK & transkrip sementara | P0 | Mahasiswa | FR‑AK‑12, 13 | 5 |
| SD‑S2‑12 | CRUD pengumuman & pusat notifikasi in-app | P0 | BAAK | FR‑LAY‑03, 04 | 5 |
| SD‑S2‑13 | Audit log & konfigurasi institusi | P0 | Superadmin | FR‑ADM‑03, 04 | 3 |
| SD‑S2‑14 | Testing, UAT, dan perbaikan bug | P0 | QA/PO | — | 5 |
|  | Subtotal SIDIK |  |  |  | 71 |

B. Jalur E-Learning

| No | Item | Prioritas | Role | Kode FR | SP |
| --- | --- | --- | --- | --- | --- |
| EL‑S2‑01 | Setup proyek, repositori, CI/CD, dan lingkungan staging E-Learning | P0 | DevOps | NFR‑15 | 3 |
| EL‑S2‑02 | Login via SSO SIDIK (client OIDC) | P0 | Mahasiswa, Dosen | FR‑EL‑15 | 5 |
| EL‑S2‑03 | Layout, navigasi, dan dashboard E-Learning per role | P0 | Mahasiswa, Dosen | FR‑EL‑16 | 3 |

| No | Item | Prioritas | Role | Kode FR | SP |
| --- | --- | --- | --- | --- | --- |
| EL‑S2‑04 | Penyusunan kontrak Integration API bersama tim SIDIK | P0 | Tim teknis | FR‑API‑01–05 | 2 |
|  | Subtotal E-Learning |  |  |  | 13 |

C. Detail Item Sprint 2 — SIDIK SD-S2-01 Role & hak akses (RBAC) serta manajemen pengguna
- User Story: Sebagai superadmin, saya ingin mengatur pengguna dan hak aksesnya,
sehingga setiap orang hanya dapat mengakses fitur sesuai perannya.
- Acceptance Criteria: superadmin dapat membuat, menonaktifkan, dan reset password
pengguna; role dapat diberi izin per menu dan aksi; satu pengguna dapat memiliki beberapa role dan berpindah role aktif; akses ke URL tanpa izin ditolak (HTTP 403) dan tercatat.
- Definition of Done: matriks RBAC SIDIK pada Bab 10 terimplementasi; lolos uji akses
negatif. SD-S2-02 SSO Identity Provider (OIDC) & registrasi client E-Learning
- User Story: Sebagai pengguna, saya ingin memakai satu akun SIDIK untuk masuk ke
E-Learning, sehingga saya tidak perlu mengingat banyak password.
- Acceptance Criteria: SIDIK menyediakan endpoint OIDC (authorize, token, userinfo,
discovery); superadmin dapat mendaftarkan client E-Learning dengan redirect URI dan scope; ID token berisi user id, NIM/NIDN, nama, email, dan role; token memiliki masa berlaku dan dapat dicabut.
- Definition of Done: alur Authorization Code + PKCE lolos uji dengan client E-Learning di
staging. SD-S2-03 Dashboard per role
- User Story: Sebagai dosen/admin/pimpinan, saya ingin dashboard yang sesuai dengan
tugas saya, sehingga saya langsung melihat hal yang perlu saya tindak lanjuti.
- Acceptance Criteria: dosen melihat kelas yang diampu dan KRS bimbingan yang
menunggu persetujuan; BAAK melihat ringkasan periode akademik; pimpinan melihat statistik ringkas; placeholder "Modul dosen dan admin" dari Sprint 1 digantikan.
- Definition of Done: redirect setelah login sesuai role aktif.
SD-S2-04 Lupa password & ganti password
- User Story: Sebagai pengguna, saya ingin mereset dan mengganti password, sehingga
saya tetap dapat mengakses akun dengan aman.
- Acceptance Criteria: tautan reset dikirim ke email terdaftar dan kedaluwarsa dalam 30
menit; password baru memenuhi kebijakan (minimal 8 karakter, kombinasi huruf dan angka); semua session lama berakhir setelah password berubah; akun terkunci sementara setelah 5 kali gagal login.
- Definition of Done: alur diuji untuk email valid, tidak terdaftar, dan token kedaluwarsa.
SD-S2-05 Master fakultas, prodi, kurikulum, mata kuliah
- User Story: Sebagai BAAK, saya ingin mengelola struktur akademik, sehingga penawaran
mata kuliah sesuai kurikulum yang berlaku.
- Acceptance Criteria: CRUD fakultas, prodi, kurikulum, dan mata kuliah; mata kuliah
memiliki SKS, semester, jenis, dan prasyarat; kurikulum dapat ditetapkan per angkatan; data yang sudah dipakai tidak dapat dihapus, hanya dinonaktifkan.
- Definition of Done: data master awal IAI Sukabumi berhasil dimasukkan.
SD-S2-06 Master mahasiswa & dosen + impor Excel
- User Story: Sebagai BAAK, saya ingin mengimpor data mahasiswa dan dosen secara
massal, sehingga migrasi data cepat dan akun otomatis terbentuk.
- Acceptance Criteria: impor dari template Excel dengan laporan baris gagal; akun login
otomatis dibuat; Dosen PA dapat ditetapkan massal.
- Definition of Done: uji impor dengan data sampel ≥ 500 baris tanpa error.
SD-S2-07 Tahun akademik & kalender akademik
- User Story: Sebagai BAAK, saya ingin mengatur semester aktif dan kalender, sehingga
fitur KRS dan nilai terbuka/tertutup sesuai jadwal.
- Acceptance Criteria: hanya satu semester aktif; periode KRS, tambah/batal, perkuliahan,
UTS, UAS, dan input nilai dapat diatur; kalender tampil di portal mahasiswa.
- Definition of Done: fitur yang bergantung periode menolak akses di luar periode.
SD-S2-08 Kelas, ruang, jadwal + deteksi bentrok
- User Story: Sebagai BAAK, saya ingin menyusun jadwal kuliah tanpa bentrok, sehingga
perkuliahan berjalan tertib.
- Acceptance Criteria: kelas memiliki mata kuliah, dosen, kuota, hari, jam, dan ruang;
sistem menolak bentrok ruang atau dosen pada waktu yang sama; jadwal dapat diimpor dari Excel.
- Definition of Done: uji bentrok ruang dan dosen lolos.
SD-S2-09 Pengisian KRS online dengan validasi
- User Story: Sebagai mahasiswa, saya ingin mengisi KRS secara online, sehingga saya
dapat merencanakan studi tanpa datang ke kampus.
- Acceptance Criteria: penawaran mata kuliah sesuai kurikulum; batas SKS mengikuti IPS
(BR-SD-03); validasi prasyarat, bentrok jadwal, dan kuota berjalan real-time; KRS terkunci jika flag "boleh KRS" belum aktif; kuota dikunci saat KRS diajukan untuk mencegah rebutan kursi.
- Definition of Done: uji beban dasar simulasi pengisian KRS bersamaan; tidak ada kuota
terlampaui. SD-S2-10 Persetujuan KRS oleh Dosen PA
- User Story: Sebagai Dosen PA, saya ingin meninjau dan menyetujui KRS mahasiswa
bimbingan, sehingga rencana studi mereka terarah.
- Acceptance Criteria: daftar KRS menunggu persetujuan; setujui atau tolak dengan
catatan; persetujuan massal; mahasiswa mendapat notifikasi.
- Definition of Done: status KRS berubah sesuai aksi dan tercatat.
SD-S2-11 KHS, IPS/IPK & transkrip sementara
- User Story: Sebagai mahasiswa, saya ingin melihat KHS dan transkrip, sehingga saya
mengetahui capaian akademik saya.
- Acceptance Criteria: KHS per semester dengan IPS; IPK kumulatif; transkrip sementara
dapat diunduh; data nilai historis hasil migrasi tampil benar.
- Definition of Done: perhitungan IPS/IPK diverifikasi terhadap sampel data BAAK.
SD-S2-12 CRUD pengumuman & pusat notifikasi in-app
- User Story: Sebagai BAAK, saya ingin menerbitkan pengumuman ke kelompok tertentu,
sehingga informasi sampai ke mahasiswa yang tepat.
- Acceptance Criteria: pengumuman memiliki kategori, target audiens, lampiran, dan
jadwal tayang; pengumuman tampil di dashboard dan menu Pengumuman; ikon notifikasi menunjukkan jumlah belum dibaca.
- Definition of Done: placeholder "Pengumuman & Informasi" dari Sprint 1 digantikan fitur
aktif. SD-S2-13 Audit log & konfigurasi institusi
- User Story: Sebagai superadmin, saya ingin melacak aktivitas penting dan mengatur
identitas institusi, sehingga sistem dapat diaudit dan dokumen resmi memakai identitas yang benar.
- Acceptance Criteria: audit log mencatat pelaku, aksi, data sebelum/sesudah, IP, dan
waktu; dapat difilter; logo, nama, dan pejabat penandatangan dapat diatur.
- Definition of Done: log tidak dapat diubah dari antarmuka.
D. Detail Item Sprint 2 — E-Learning EL-S2-01 Setup proyek & lingkungan E-Learning
- Acceptance Criteria: repositori terpisah dari SIDIK; pipeline CI/CD berjalan; basis data
dan object storage staging E-Learning tersedia; konfigurasi rahasia (secret) terpisah dari SIDIK.
- Definition of Done: aplikasi kosong ter-deploy di domain staging E-Learning.
EL-S2-02 Login via SSO SIDIK
- User Story: Sebagai mahasiswa/dosen, saya ingin masuk ke E-Learning dengan akun
SIDIK, sehingga saya tidak perlu membuat akun baru.
- Acceptance Criteria: tombol "Masuk dengan akun SIDIK" mengarahkan ke SIDIK; setelah
login pengguna kembali ke E-Learning; profil dan role tersimpan di E-Learning tanpa password; akun nonaktif di SIDIK tidak dapat masuk.
- Definition of Done: diuji untuk role mahasiswa, dosen, dan kaprodi.
EL-S2-03 Layout, navigasi & dashboard E-Learning
- Acceptance Criteria: identitas visual konsisten dengan SIDIK namun jelas sebagai sistem
berbeda; menu Beranda, Kelas Saya, dan Kembali ke SIDIK tersedia; dashboard menampilkan state kosong yang jelas sebelum kelas tersinkron; responsif di mobile.
- Definition of Done: lolos review UI dan uji responsif.
EL-S2-04 Kontrak Integration API
- Acceptance Criteria: dokumen OpenAPI untuk endpoint kelas, peserta, nilai, dan
webhook disepakati tim SIDIK dan E-Learning; contoh payload dan kode error tersedia; mock server tersedia untuk pengembangan paralel.
- Definition of Done: kontrak dibekukan (versi v1) sebelum Sprint 3 dimulai.

### 21.5 Sprint 3 — E-Learning: Pembelajaran Inti • SIDIK: Integrasi & Nilai

Sprint Goal: setiap kelas SIDIK otomatis memiliki kelas E-Learning beserta pesertanya; dosen mengelola materi, tugas, kuis, dan presensi; nilai dikirim dari E-Learning ke SIDIK, divalidasi, lalu terbit sebagai KHS. A. Jalur E-Learning

| No | Item | Prioritas | Role | Kode FR | SP |
| --- | --- | --- | --- | --- | --- |
| EL‑S3‑01 | Sinkron kelas & peserta dari SIDIK + log sinkronisasi | P0 | Sistem, Admin EL | FR-EL-01, 02, 21 | 5 |
| EL‑S3‑02 | Pertemuan & materi | P0 | Dosen, Mahasiswa | FR‑EL‑03, 17 | 5 |
| EL‑S3‑03 | Tugas & pengumpulan tugas | P0 | Dosen, Mahasiswa | FR‑EL‑04, 05 | 8 |
| EL‑S3‑04 | Penilaian tugas & feedback | P0 | Dosen | FR‑EL‑06 | 3 |

| No | Item | Prioritas | Role | Kode FR | SP |
| --- | --- | --- | --- | --- | --- |
| EL‑S3‑05 | Bank soal, kuis & ujian online | P0 | Dosen, Mahasiswa | FR-EL-07, 08, 18, 19 | 13 |
| EL‑S3‑06 | Presensi pertemuan (manual & kode/QR) | P0 | Dosen, Mahasiswa | FR‑EL‑09, 14 | 5 |
| EL‑S3‑07 | Rekap nilai kelas & bobot komponen | P0 | Dosen | FR‑EL‑11, 22 | 5 |
| EL‑S3‑08 | Kirim nilai ke SIDIK & status validasi | P0 | Dosen, Sistem | FR‑EL‑12, 20 | 3 |
| EL‑S3‑09 | Notifikasi aktivitas pembelajaran | P1 | Sistem | FR‑EL‑13 | 2 |
| EL‑S3‑10 | Testing, UAT, dan perbaikan bug | P0 | QA/PO | — | 5 |
|  | Subtotal E-Learning |  |  |  | 54 |

B. Jalur SIDIK

| No | Item | Prioritas | Role | Kode FR | SP |
| --- | --- | --- | --- | --- | --- |
| SD‑S3‑01 | Integration API kelas & peserta + webhook keluar | P0 | Sistem | FR-API-01, 02, 04, 05, 06 | 5 |
| SD‑S3‑02 | Penerimaan batch nilai & konversi nilai huruf | P0 | Sistem | FR-API-03, FR-AK-14 | 3 |
| SD‑S3‑03 | Validasi & publikasi nilai, koreksi, input nilai cadangan | P0 | Kaprodi, BAAK | FR-AK-15, 16, 20 | 5 |
| SD‑S3‑04 | Monitoring perwalian | P1 | Dosen PA, Kaprodi | FR‑AK‑17 | 3 |
| SD‑S3‑05 | Edit profil & pengajuan perubahan data | P1 | Mahasiswa | FR‑POR‑11 | 3 |
| SD‑S3‑06 | Launcher E-Learning & single logout | P0 | Mahasiswa, Dosen | FR-POR-15, FR-SSO-04, 05 | 2 |
| SD‑S3‑07 | Testing integrasi end-to-end & perbaikan bug | P0 | QA/PO | — | 2 |
|  | Subtotal SIDIK |  |  |  | 23 |

C. Detail Item Sprint 3 — E-Learning EL-S3-01 Sinkron kelas & peserta dari SIDIK
- User Story: Sebagai dosen, saya ingin kelas online saya otomatis tersedia beserta
pesertanya, sehingga saya tidak perlu mendaftarkan mahasiswa secara manual.
- Acceptance Criteria: setiap kelas SIAKAD semester aktif memiliki satu kelas E-Learning;
peserta bertambah/berkurang otomatis mengikuti KRS yang disetujui dan tambah/batal; placeholder "Coming Soon — E-Learning" digantikan.
- Definition of Done: jumlah peserta di E-Learning sama dengan data KRS untuk seluruh
kelas uji.
- Tambahan: Admin E-Learning dapat melihat log sinkronisasi dan menjalankan sinkron
ulang per kelas. EL-S3-02 Pertemuan & materi
- User Story: Sebagai dosen, saya ingin mengunggah materi per pertemuan, sehingga
mahasiswa dapat belajar sesuai urutan perkuliahan.
- Acceptance Criteria: 16 slot pertemuan (dapat diubah); dukungan PDF, PPT, DOC,
gambar, tautan video, dan teks; materi dapat dijadwalkan terbit; mahasiswa dapat melihat/mengunduh.
- Definition of Done: batas ukuran berkas dan validasi tipe berjalan.
- Tambahan: dosen dapat menambahkan tautan kelas virtual (Zoom/Google Meet) per
pertemuan. EL-S3-03 Tugas & pengumpulan tugas
- User Story: Sebagai mahasiswa, saya ingin mengumpulkan tugas secara online sebelum
tenggat, sehingga tugas saya tercatat dan dapat dinilai.
- Acceptance Criteria: dosen mengatur tenggat, bobot, tipe berkas, dan izin terlambat;
mahasiswa dapat mengunggah ulang sebelum tenggat; submission terlambat ditandai; bukti waktu kirim tersimpan.
- Definition of Done: diuji untuk kondisi tepat waktu, terlambat, dan setelah tenggat ditutup.
EL-S3-04 Penilaian tugas & feedback
- Acceptance Criteria: dosen melihat daftar submission, mengunduh massal, memberi nilai
dan komentar; mahasiswa menerima notifikasi nilai.
- Definition of Done: nilai tugas masuk ke rekap nilai kelas.
EL-S3-05 Bank soal, kuis & ujian online
- User Story: Sebagai dosen, saya ingin membuat kuis dan ujian online, sehingga evaluasi
dapat dilakukan tanpa kertas.
- Acceptance Criteria: tipe soal pilihan ganda, benar/salah, isian singkat, dan esai; bank
soal per mata kuliah; pengaturan jadwal buka-tutup, durasi, acak soal dan opsi, jumlah percobaan; jawaban tersimpan otomatis berkala; waktu habis mengirim jawaban otomatis; soal objektif dinilai otomatis.
- Definition of Done: uji ujian dengan koneksi terputus-sambung tidak menghilangkan
jawaban tersimpan. EL-S3-06 Presensi pertemuan
- User Story: Sebagai dosen, saya ingin mencatat presensi setiap pertemuan, sehingga
kehadiran mahasiswa terdokumentasi dan dapat menjadi syarat ujian.
- Acceptance Criteria: dosen membuka sesi presensi dengan kode/QR berbatas waktu
atau mengisi manual; status hadir, izin, sakit, alpa; rekap persentase kehadiran per mahasiswa; indikator mahasiswa di bawah batas minimal (BR-EL-03).
- Definition of Done: rekap presensi sesuai data uji.
EL-S3-07 Rekap nilai kelas & bobot komponen
- User Story: Sebagai dosen, saya ingin nilai akhir dihitung otomatis dari bobot komponen,
sehingga saya tidak perlu menghitung manual.
- Acceptance Criteria: dosen menetapkan bobot tugas, kuis, presensi, UTS, dan UAS (total
100%); nilai UTS/UAS dapat diinput atau diambil dari ujian online; nilai akhir terhitung otomatis; ekspor Excel.
- Definition of Done: hasil hitung sama dengan perhitungan manual pada data uji.
EL-S3-08 Kirim nilai ke SIDIK & status validasi
- User Story: Sebagai dosen, saya ingin mengirim nilai akhir ke SIDIK dengan satu klik,
sehingga saya tidak perlu input ulang nilai di SIDIK.
- Acceptance Criteria: tombol "Kirim Nilai ke SIDIK" aktif bila bobot 100% dan periode input
nilai terbuka; pengiriman memakai idempotency key; status (terkirim, diterima, divalidasi, dipublikasi, ditolak) tampil per kelas; error per mahasiswa dari SIDIK ditampilkan; nilai terkunci setelah dipublikasi.
- Definition of Done: integrasi INT-04 dan INT-05 lolos uji end-to-end.
EL-S3-09 Notifikasi aktivitas pembelajaran
- Acceptance Criteria: notifikasi in-app untuk materi baru, tugas baru, pengingat tenggat
H-1, dan nilai terbit.
- Definition of Done: notifikasi terkirim sesuai target peserta kelas.
D. Detail Item Sprint 3 — SIDIK SD-S3-01 Integration API kelas & peserta + webhook
- User Story: Sebagai sistem E-Learning, saya membutuhkan data kelas dan peserta dari
SIDIK, sehingga kelas online selalu sesuai dengan KRS.
- Acceptance Criteria: endpoint kelas dan peserta sesuai kontrak v1; mendukung filter
updated_since dan paginasi; webhook terkirim untuk event kelas.dipublikasi, krs.disetujui, krs.diubah, dan user.dinonaktifkan; webhook gagal di-retry dan tercatat.
- Definition of Done: jumlah kelas dan peserta di E-Learning sama dengan SIDIK pada
data uji. SD-S3-02 Penerimaan batch nilai & konversi nilai huruf
- Acceptance Criteria: endpoint menerima batch nilai per kelas; validasi periode dan
kecocokan peserta; nilai disimpan sebagai draf dan dikonversi ke huruf sesuai tabel konfigurasi; pengiriman ulang dengan idempotency key yang sama tidak menduplikasi data.
- Definition of Done: uji batch sukses, sebagian gagal, dan duplikat lolos.
SD-S3-03 Validasi & publikasi nilai, koreksi, input nilai cadangan
- User Story: Sebagai Kaprodi/BAAK, saya ingin memvalidasi nilai sebelum terbit, sehingga
nilai yang diterima mahasiswa sudah benar.
- Acceptance Criteria: daftar kelas dengan status nilai (belum masuk, draf, divalidasi,
terpublikasi); validasi dan publikasi per kelas atau massal; setelah publikasi KHS mahasiswa terbarui dan nilai terkunci; koreksi nilai oleh BAAK wajib menyertakan alasan.
- Definition of Done: KHS terbit dengan IPS/IPK yang benar.
- Tambahan: BAAK/dosen dapat menginput nilai manual di SIDIK bila integrasi bermasalah;
status publikasi dikirim balik ke E-Learning. SD-S3-04 Monitoring perwalian
- Acceptance Criteria: Dosen PA melihat IPK, SKS tempuh, status KRS, dan kehadiran
mahasiswa bimbingan; Kaprodi melihat rekap per angkatan; penanda mahasiswa berisiko (IPK < 2,00 atau kehadiran rendah).
- Definition of Done: data sesuai dengan SIAKAD.
SD-S3-05 Edit profil & pengajuan perubahan data
- User Story: Sebagai mahasiswa, saya ingin memperbarui kontak dan foto, sehingga data
saya selalu terkini.
- Acceptance Criteria: nomor HP, email pribadi, alamat, dan foto dapat diubah langsung;
perubahan nama, tanggal lahir, atau NIK diajukan ke BAAK dengan dokumen pendukung.
- Definition of Done: perubahan tercatat di audit log.
SD-S3-06 Launcher E-Learning & single logout
- Acceptance Criteria: menu E-Learning di SIDIK membuka Sistem E-Learning tanpa login
ulang (menggantikan placeholder Coming Soon Sprint 1); logout di salah satu sistem mengakhiri session di sistem lain; penonaktifan akun di SIDIK langsung memblokir akses E-Learning.
- Definition of Done: diuji bolak-balik antar kedua sistem pada desktop dan mobile.

### 21.6 Sprint 4 — SIDIK: Keuangan & UKT • E-Learning: Penyempurnaan • Go-Live

Sprint Goal: tagihan UKT terbit dan dapat dibayar melalui VA/QRIS dengan verifikasi otomatis yang membuka KRS; layanan surat, laporan, dan dashboard eksekutif tersedia; E-Learning dilengkapi forum dan laporan aktivitas; kedua sistem siap go-live.

> Prasyarat dari klien sebelum Sprint 4: keputusan penyedia payment gateway atau bank mitra, dokumen legalitas untuk pendaftaran merchant, tabel golongan & tarif UKT per prodi/angkatan, serta kebijakan cicilan dan keringanan. Aktivasi merchant umumnya memerlukan waktu beberapa minggu, sehingga pengajuan dimulai paralel sejak Sprint 2.

A. Jalur SIDIK

| No | Item | Prioritas | Role | Kode FR | SP |
| --- | --- | --- | --- | --- | --- |
| SD‑S4‑01 | Golongan & tarif UKT, jenis biaya | P0 | Admin Keuangan | FR-KEU-01, 02, 03 | 5 |
| SD‑S4‑02 | Generate & terbitkan tagihan semester | P0 | Admin Keuangan | FR‑KEU‑04 | 5 |
| SD‑S4‑03 | Menu Tagihan mahasiswa & riwayat pembayaran | P0 | Mahasiswa | FR‑POR‑14 | 3 |
| SD‑S4‑04 | Integrasi payment gateway: VA & QRIS | P0 | Sistem | FR‑KEU‑05 | 8 |
| SD‑S4‑05 | Callback, idempotensi & buka KRS otomatis | P0 | Sistem | FR‑KEU‑06, 11 | 5 |
| SD‑S4‑06 | Kuitansi digital | P0 | Mahasiswa | FR‑KEU‑10 | 2 |
| SD‑S4‑07 | Pembayaran manual & verifikasi | P1 | Mahasiswa, Keuangan | FR‑KEU‑07 | 3 |
| SD‑S4‑08 | Cicilan & keringanan/dispensasi | P1 | Mahasiswa, Keuangan | FR‑KEU‑08, 09 | 5 |
| SD‑S4‑09 | Pengingat tagihan & notifikasi email/WhatsApp | P1 | Sistem | FR-KEU-12, FR-LAY-05 | 3 |
| SD‑S4‑10 | Rekonsiliasi harian & laporan keuangan | P0 | Admin Keuangan | FR‑KEU‑13, 14 | 5 |
| SD‑S4‑11 | Layanan surat mahasiswa | P1 | Mahasiswa, BAAK | FR‑LAY‑06, 07 | 5 |
| SD‑S4‑12 | Status mahasiswa & cuti akademik | P1 | BAAK | FR‑AK‑18 | 3 |
| SD‑S4‑13 | Dashboard eksekutif & laporan akademik | P1 | Pimpinan | FR‑ADM‑05, 06 | 5 |
| SD‑S4‑14 | Ekspor/sinkronisasi data PDDikti | P1 | BAAK | FR‑AK‑19 | 5 |
| SD‑S4‑15 | Jadwal kuliah pribadi & cetak KRS/Kartu Ujian | P1 | Mahasiswa | FR‑AK‑10, 11 | 3 |
|  | Subtotal SIDIK |  |  |  | 65 |

B. Jalur E-Learning

| No | Item | Prioritas | Role | Kode FR | SP |
| --- | --- | --- | --- | --- | --- |
| EL‑S4‑01 | Forum diskusi kelas | P1 | Dosen, Mahasiswa | FR‑EL‑10 | 3 |
| EL‑S4‑02 | Laporan aktivitas pembelajaran & audit log | P1 | Kaprodi, Pimpinan | FR‑EL‑23, 24 | 3 |
| EL‑S4‑03 | Uji beban ujian online & optimasi | P0 | QA/DevOps | NFR‑16 | 3 |
|  | Subtotal E-Learning |  |  |  | 9 |

C. Bersama (Kedua Sistem)

| No | Item | Prioritas | Role | Kode | SP |
| --- | --- | --- | --- | --- | --- |
| BR‑S4‑01 | Hardening keamanan, uji beban, backup & restore kedua sistem | P0 | DevOps/QA | NFR-01–08, NFR-15, FR-ADM-07 | 5 |

| No | Item | Prioritas | Role | Kode | SP |
| --- | --- | --- | --- | --- | --- |
| BR‑S4‑02 | UAT menyeluruh, migrasi data, pelatihan & go-live kedua sistem | P0 | Semua | — | 5 |
|  | Subtotal Bersama |  |  |  | 10 |

D. Detail Item Sprint 4 — SIDIK SD-S4-01 Golongan & tarif UKT, jenis biaya
- User Story: Sebagai Admin Keuangan, saya ingin mengatur golongan dan tarif UKT,
sehingga tagihan setiap mahasiswa sesuai ketentuan.
- Acceptance Criteria: golongan dan nominal per prodi dan angkatan; penetapan golongan
per mahasiswa via impor atau manual; jenis biaya tambahan (KKN, PPL, dll.) dapat dikonfigurasi; riwayat perubahan tarif tersimpan.
- Definition of Done: tarif aktual IAI Sukabumi termuat dan diverifikasi bagian keuangan.
SD-S4-02 Generate & terbitkan tagihan semester
- Acceptance Criteria: generate massal per semester untuk mahasiswa aktif; pratinjau
sebelum terbit; tagihan memiliki nomor unik dan jatuh tempo; mahasiswa cuti mengikuti tarif cuti; tagihan Draf dapat dikoreksi, tagihan Terbit hanya dapat dibatalkan dengan alasan.
- Definition of Done: jumlah tagihan sesuai jumlah mahasiswa aktif pada data uji.
SD-S4-03 Menu Tagihan mahasiswa
- User Story: Sebagai mahasiswa, saya ingin melihat tagihan dan riwayat pembayaran,
sehingga saya tahu kewajiban dan status pembayaran saya.
- Acceptance Criteria: rincian komponen biaya, status, jatuh tempo, dan riwayat transaksi;
status tagihan tampil di dashboard.
- Definition of Done: tampilan responsif dan data sesuai tagihan.
SD-S4-04 Integrasi payment gateway: VA & QRIS
- User Story: Sebagai mahasiswa, saya ingin membayar UKT melalui VA atau QRIS,
sehingga pembayaran bisa dilakukan kapan saja tanpa antre.
- Acceptance Criteria: VA multi-bank dan QRIS dibuat sesuai nominal tagihan; instruksi
pembayaran per bank tampil; VA memiliki masa berlaku dan dapat dibuat ulang; mode sandbox dan production dipisahkan.
- Definition of Done: uji transaksi sukses di sandbox dan minimal satu transaksi riil nominal
kecil di production. SD-S4-05 Callback, idempotensi & buka KRS otomatis
- Acceptance Criteria: endpoint callback memverifikasi signature; callback duplikat tidak
mengubah saldo (BR-SD-09); tagihan lunas memicu pembukaan akses KRS (INT-01) dan notifikasi; seluruh callback tercatat dengan payload; kegagalan pemrosesan memicu alert.
- Definition of Done: uji callback sukses, gagal, duplikat, dan signature salah.
SD-S4-06 Kuitansi digital
- Acceptance Criteria: kuitansi PDF dengan nomor unik, rincian, dan QR verifikasi yang
dapat dicek keasliannya melalui halaman publik.
- Definition of Done: kuitansi terbit otomatis setelah lunas.
SD-S4-07 Pembayaran manual & verifikasi
- Acceptance Criteria: mahasiswa mengunggah bukti transfer beserta tanggal dan nominal;
Admin Keuangan menyetujui atau menolak dengan alasan; hasil verifikasi memperbarui status tagihan dan dicatat di audit log.
- Definition of Done: alur manual tidak dapat menghasilkan lunas ganda.
- Catatan: ACC/tolak oleh Admin Keuangan, audit log, dan pencegahan lunas ganda sudah tersedia lewat simulasi 6.4.1. Sprint 4 menambahkan unggahan bukti transfer oleh mahasiswa sebagai pemicu verifikasi.
SD-S4-08 Cicilan & keringanan/dispensasi
- User Story: Sebagai mahasiswa, saya ingin mengajukan cicilan atau keringanan UKT,
sehingga saya tetap dapat berkuliah ketika mengalami kendala biaya.
- Acceptance Criteria: pengajuan dengan alasan dan dokumen pendukung; Admin
Keuangan/pimpinan memproses; cicilan membentuk termin dengan jatuh tempo masing-masing; syarat minimal termin untuk membuka KRS dapat dikonfigurasi; dispensasi menerbitkan nominal baru.
- Definition of Done: status tagihan mengikuti state diagram Gambar 7.5.
- Catatan: pembentukan termin bulanan oleh Admin Keuangan dan status per termin sudah tersedia lewat simulasi 6.4.1 (BR-SD-13 sampai 16). Sprint 4 menambahkan pengajuan cicilan/keringanan oleh mahasiswa, alur persetujuan, dispensasi, dan syarat minimal termin untuk membuka KRS.
SD-S4-09 Pengingat tagihan & notifikasi email/WhatsApp
- Acceptance Criteria: pengingat otomatis H-7, H-3, H-1; notifikasi tagihan terbit dan lunas
via email dan WhatsApp; pengguna dapat melihat riwayat notifikasi.
- Definition of Done: job terjadwal berjalan dan tercatat.
SD-S4-10 Rekonsiliasi harian & laporan keuangan
- Acceptance Criteria: job harian mencocokkan transaksi sistem dengan laporan
settlement; selisih ditandai untuk ditindaklanjuti; laporan penerimaan, tunggakan, dan rekap per prodi/golongan/metode dapat diekspor Excel/PDF.
- Definition of Done: laporan diverifikasi bagian keuangan dengan data uji.
SD-S4-11 Layanan surat mahasiswa
- User Story: Sebagai mahasiswa, saya ingin mengajukan surat keterangan secara online,
sehingga saya tidak perlu datang ke kampus untuk mengurus administrasi.
- Acceptance Criteria: jenis surat dan template dapat dikonfigurasi BAAK; status
pengajuan dapat dilacak; surat terbit dalam PDF dengan QR verifikasi; placeholder "Coming Soon — Layanan Mahasiswa" digantikan.
- Definition of Done: minimal jenis surat Aktif Kuliah berjalan end-to-end.
SD-S4-12 Status mahasiswa & cuti akademik
- Acceptance Criteria: status aktif, cuti, non-aktif, lulus, keluar; pengajuan cuti oleh
mahasiswa dengan persetujuan; status memengaruhi tagihan dan akses KRS.
- Definition of Done: perubahan status tercatat dengan tanggal efektif.
SD-S4-13 Dashboard eksekutif & laporan akademik
- User Story: Sebagai pimpinan, saya ingin melihat ringkasan kondisi akademik dan
keuangan, sehingga saya dapat mengambil keputusan berbasis data.
- Acceptance Criteria: grafik mahasiswa aktif per prodi, progres KRS, sebaran IPK,
persentase pembayaran, dan tunggakan; filter semester dan prodi; ekspor laporan.
- Definition of Done: angka dashboard sama dengan laporan detail.
SD-S4-14 Ekspor/sinkronisasi data PDDikti
- Acceptance Criteria: data mahasiswa, KRS, nilai, dan aktivitas kuliah dapat
diekspor/sinkron sesuai format Neo Feeder; log hasil sinkron dan error per data.
- Definition of Done: uji sinkron pada lingkungan feeder kampus (bila akses tersedia).
SD-S4-15 Jadwal kuliah pribadi & cetak KRS/Kartu Ujian
- User Story: Sebagai mahasiswa, saya ingin melihat jadwal mingguan dan mencetak KRS,
sehingga saya memiliki bukti rencana studi.
- Acceptance Criteria: jadwal mingguan dari KRS yang disetujui; PDF KRS dan Kartu Ujian
dengan kop institusi dan kode QR verifikasi.
- Definition of Done: PDF terbaca rapi di ukuran A4.
E. Detail Item Sprint 4 — E-Learning EL-S4-01 Forum diskusi kelas
- Acceptance Criteria: topik diskusi per kelas atau per pertemuan; balasan berjenjang;
dosen dapat menyematkan atau menutup topik.
- Definition of Done: notifikasi balasan berjalan.
EL-S4-02 Laporan aktivitas pembelajaran & audit log
- User Story: Sebagai Kaprodi, saya ingin melihat keaktifan kelas di prodi saya, sehingga
saya dapat menindaklanjuti kelas yang kurang aktif.
- Acceptance Criteria: laporan per kelas berisi jumlah materi, tugas, kuis, dan persentase
kehadiran; filter per prodi dan semester; ekspor Excel; audit log perubahan nilai dan pengaturan kuis dapat dilihat Admin E-Learning.
- Definition of Done: angka laporan sesuai data kelas uji.
EL-S4-03 Uji beban ujian online & optimasi
- Acceptance Criteria: simulasi ujian serentak sesuai NFR-16 tanpa jawaban hilang; waktu
simpan jawaban p95 < 1 detik; hasil uji dan perbaikan terdokumentasi.
- Definition of Done: laporan uji beban diserahkan ke klien.
F. Detail Item Sprint 4 — Bersama BR-S4-01 Hardening keamanan, uji beban, backup & restore kedua sistem
- Acceptance Criteria: pemindaian kerentanan dan perbaikan temuan tinggi; uji beban
periode KRS sesuai NFR-02; backup otomatis aktif dan uji restore berhasil; monitoring dan alert aktif.
- Definition of Done: laporan hasil uji keamanan dan beban diserahkan ke klien.
BR-S4-02 UAT menyeluruh, migrasi data, pelatihan & go-live kedua sistem
- Acceptance Criteria: skenario UAT end-to-end satu semester lulus; migrasi data master,
mahasiswa, nilai historis, dan saldo tagihan tervalidasi; pelatihan untuk BAAK, keuangan, dosen, dan perwakilan mahasiswa; panduan pengguna tersedia; berita acara serah terima ditandatangani.
- Definition of Done: sistem berjalan di production dan memasuki masa hypercare.

### 21.7 Ringkasan Kapasitas

| Sprint | SIDIK (SP) | E‑Learning (SP) | Bersama (SP) | Total SP |
| --- | --- | --- | --- | --- |
| Sprint 1 | 49 | — | — | 49 |
| Sprint 2 | 71 | 13 | — | 84 |
| Sprint 3 | 23 | 54 | — | 77 |
| Sprint 4 | 65 | 9 | 10 | 84 |

> Catatan kapasitas: pembagian dua jalur mengasumsikan ada developer yang didedikasikan untuk E-Learning mulai Sprint 2, sementara tim lain fokus di SIDIK. Bila hanya satu tim kecil yang mengerjakan keduanya, total 77–84 SP per sprint kemungkinan besar tidak tercapai. Dalam kondisi itu, item P1 (forum, laporan aktivitas, monitoring perwalian, layanan surat, dashboard eksekutif, sinkron PDDikti, cetak KRS) dipindahkan ke Sprint 5 (stabilisasi) atas kesepakatan Product Owner, tanpa mengorbankan item P0.

## 22. Kriteria Penerimaan dan Go-Live

| Kriteria | Keterangan |
| --- | --- |
| Fungsional | Seluruh item P0 kedua sistem lulus UAT; tidak ada bug Critical/High yang terbuka |
| Integrasi | SSO, INT-02 s.d. INT-06 lulus uji end-to-end; minimal satu transaksi pembayaran riil berhasil |
| Data | Data master, historis nilai, dan saldo tagihan hasil migrasi disetujui BAAK dan Keuangan |
| Non‑fungsional | Uji beban dan keamanan masing-masing sistem memenuhi NFR |
| Dokumentasi | Panduan pengguna per role (SIDIK dan E-Learning), spesifikasi API, dokumen deployment & runbook masing-masing sistem |
| Pelatihan | Pelatihan untuk BAAK, Keuangan, Dosen (fokus E-Learning), Admin E-Learning, dan perwakilan mahasiswa |
| Pasca Go‑Live | Masa hypercare dan garansi perbaikan bug sesuai kontrak dengan Muand Tech |

## 23. Risiko dan Mitigasi

| No | Risiko | Dampa k | Kemungkinan | Mitigasi |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
| R‑01 | Data master dan data historis dari kampus tidak lengkap atau tidak rapi | Tinggi | Tinggi | Template impor sejak Sprint 2, sesi pembersihan data bersama BAAK |
| R‑02 | Aktivasi merchant payment gateway/bank terlambat | Tinggi | Sedang | Mulai pengajuan sejak Sprint 2; siapkan jalur pembayaran manual sebagai cadangan |
| R‑03 | Lonjakan akses saat periode KRS | Tinggi | Tinggi | Uji beban, cache, antrean, penjadwalan KRS per angkatan |
| R‑04 | Perubahan kebutuhan di tengah sprint | Sedang | Tinggi | Change request melalui Product Owner, masuk backlog sprint berikutnya |
| R‑05 | Ketersediaan key user untuk UAT terbatas | Sedang | Sedang | Jadwal UAT ditetapkan di awal; UAT per sprint, bukan hanya di akhir |
| R‑06 | Kebocoran data pribadi | Tinggi | Rendah | RBAC ketat, enkripsi, audit log, uji keamanan |
| R‑07 | Adopsi dosen terhadap E-Learning rendah | Sedang | Sedang | Pelatihan, panduan singkat, pendampingan awal semester |
| R‑08 | Beban Sprint 2–4 melebihi kapasitas tim | Sedang | Sedang | Prioritas P0/P1 jelas; opsi Sprint 5 stabilisasi |
| R‑09 | Kontrak API berubah setelah pengembangan berjalan, sehingga kedua sistem tidak sinkron | Tinggi | Sedang | Kontrak dibekukan sebelum Sprint 3; perubahan melalui versi API baru |
| R‑10 | Data kelas/peserta di E-Learning tidak sama dengan SIDIK | Sedang | Sedang | Webhook + sinkron terjadwal, log sinkronisasi, tombol sinkron ulang |
| R‑11 | Kegagalan SSO membuat pengguna tidak dapat masuk ke E-Learning | Tinggi | Rendah | Monitoring IdP, redundansi, prosedur darurat terdokumentasi |

## 24. Asumsi dan Hal yang Perlu Dikonfirmasi Klien

Asumsi:
- IAI Sukabumi menyediakan data master, data mahasiswa aktif, data dosen, kurikulum, dan tarif UKT dalam format digital.
- Infrastruktur server untuk dua sistem (minimal dua VM/lingkungan terpisah atau kontainer terisolasi) dan dua subdomain disediakan atau dibiayai klien sesuai kesepakatan.
- Biaya transaksi payment gateway dan pesan WhatsApp ditanggung klien.
- Satu akun SIDIK digunakan untuk kedua sistem melalui SSO.
- Kelas virtual (video konferensi) menggunakan layanan pihak ketiga yang sudah dimiliki kampus. Perlu dikonfirmasi sebelum Sprint 2:
- Jumlah mahasiswa aktif, dosen, dan program studi (untuk sizing server dan uji beban kedua sistem).
- Skema biaya yang berlaku: istilah dan struktur UKT/SPP, golongan, serta komponen biaya lain.
- Aturan akademik: tabel batas SKS, konversi nilai huruf, syarat presensi, masa tambah/batal.
- Apakah kampus sudah memakai LMS lain (mis. Moodle/Google Classroom) yang perlu dimigrasikan atau dihentikan.
- Apakah dosen boleh membuat kelas non-SKS (pelatihan, BTQ, tahfidz) di E-Learning.
- Kebutuhan pelaporan eksternal selain PDDikti (mis. sistem pelaporan Kementerian Agama) dan ketersediaan akses feeder.
- Pilihan payment gateway atau bank mitra, termasuk preferensi bank syariah.
- Kebijakan denda keterlambatan (default: tidak diterapkan).
- Persyaratan non-akademik khas institusi (mis. BTQ, tahfidz, KKN, PPL) sebagai syarat KRS atau kelulusan.
- Kebutuhan migrasi dari sistem lama dan rentang data historis yang dimigrasikan.

## 25. Persetujuan Dokumen

Dengan menandatangani dokumen ini, para pihak menyetujui isi PRD sebagai acuan pengembangan Sistem SIDIK dan Sistem E-Learning Release 1. Perubahan setelah persetujuan dikelola melalui mekanisme change request.

| Peran | Nama | Instansi | Tanda Tangan | Tanggal |
| --- | --- | --- | --- | --- |
| Product Owner |  | IAI Sukabumi |  |  |
| Perwakilan BAAK |  | IAI Sukabumi |  |  |
| Perwakilan Keuangan |  | IAI Sukabumi |  |  |
| Project Manager |  | Muand Tech |  |  |
| Perwakilan Vendor |  | Muand Tech |  |  |
