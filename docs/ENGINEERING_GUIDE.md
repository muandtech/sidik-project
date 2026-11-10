# Engineering Guide — SIDIK & E-Learning IAI Sukabumi

Panduan teknis wajib untuk **semua kontributor**, baik manusia maupun AI coding agent.
Dokumen ini menerjemahkan PRD (`PRD_SIDIK_ELearning_IAI_Sukabumi.md`) dan *Blueprint Student Desk & E-Learning*
menjadi aturan kerja sehari-hari: cara menulis kode, standar keamanan, kebutuhan kapasitas, kasus khas
perkuliahan yang wajib ditangani, dan strategi pengujian.

| Atribut | Keterangan |
| --- | --- |
| Sumber kebutuhan | `PRD_SIDIK_ELearning_IAI_Sukabumi.md` (v2.1) — **sumber kebenaran fungsional** |
| Target skala | ±3.000 mahasiswa aktif + dosen + staf; uji beban 300–500 VU normal, spike 1.000 VU |
| Stack saat ini | Next.js 16 (App Router, Server Actions) + MySQL 8 / MariaDB, TypeScript strict |
| Status | Dokumen hidup — perbarui bila ada keputusan teknis baru (lihat §9) |

**Urutan prioritas bila ada pertentangan:** PRD (aturan bisnis & RBAC) → dokumen ini (cara implementasi) →
kebiasaan pribadi. Bila PRD sendiri ambigu atau bertentangan, **jangan menebak** — catat pertanyaannya dan
tanyakan ke Product Owner.

---

## Daftar Isi

1. [Peta PRD: bagian mana dibaca untuk tugas apa](#1-peta-prd)
2. [Standar kode & arsitektur](#2-standar-kode--arsitektur)
3. [Keamanan](#3-keamanan)
4. [Kapasitas: menghadapi ±3.000 pengguna aktif](#4-kapasitas-menghadapi-3000-pengguna-aktif)
5. [Kasus khas perkuliahan yang wajib ditangani](#5-kasus-khas-perkuliahan)
6. [Strategi pengujian](#6-strategi-pengujian)
7. [Definition of Done](#7-definition-of-done)
8. [Operasional: backup, migrasi, rilis, monitoring](#8-operasional)
9. [Keputusan teknis yang masih terbuka](#9-keputusan-teknis-yang-masih-terbuka)

---

## 1. Peta PRD

PRD berisi ±1.600 baris. Jangan membaca seluruhnya setiap kali, tetapi **wajib** membaca bagian yang relevan
sebelum menulis kode.

| Sedang mengerjakan… | Baca bagian PRD |
| --- | --- |
| Apa pun (wajib, sekali per sesi) | §3.1 Arsitektur, §3.2 Kepemilikan Data, §20 Non-Fungsional |
| Login, session, profil, dashboard | §5.1, §6.1, §6.2 (SSO), §7.1, §21.3 (backlog Sprint 1) |
| KRS, jadwal, nilai, KHS, transkrip | §5.2, §6.3, §7.2, §8.1, §9 (BR-SD-01…07) |
| Tagihan, cicilan, pembayaran, kuitansi | §5.3, §6.4 + §6.4.1, §7.3–7.5, §8.2, §9 (BR-SD-08…16) |
| Pengumuman, notifikasi, layanan surat | §5.4, §6.5 |
| Admin, laporan, audit | §6.6, §10 |
| Hak akses role apa pun | §10 (RBAC SIDIK), §17 (RBAC E-Learning) — **matriks ini mengikat** |
| Kelas, materi, tugas, kuis, ujian, presensi | §12, §13, §14, §15, §16 (BR-EL-01…08) |
| Integrasi SIDIK ↔ E-Learning, API, webhook | §18 (termasuk §18.7 penanganan kegagalan), §19 |
| Rencana sprint & kriteria terima | §21 (sprint terkait), §22 |

Kode aturan bisnis (`BR-SD-xx`, `BR-EL-xx`) dan kebutuhan (`FR-…`, `NFR-xx`) **dikutip** di komentar kode dan
di pesan commit, agar setiap aturan dapat dilacak ke implementasinya:

```ts
// BR-SD-14: status & jumlah dibayar tagihan bercicilan selalu dihitung dari termin, tidak diubah langsung.
```

---

## 2. Standar Kode & Arsitektur

### 2.1 Struktur dan lapisan

Ikuti pola yang sudah ada di repo. Setiap lapisan punya satu tanggung jawab:

```
src/app/(portal)/<fitur>/page.tsx   UI halaman (Server Component) — tampilkan data, tanpa SQL
src/app/actions/<domain>.ts         Server Action ("use server") — tipis: auth → validasi → panggil lib → revalidate
src/lib/<domain>.ts                 Data Access Layer ("server-only") — query SQL, aturan bisnis, transaksi
src/lib/db.ts                       Pool koneksi, query(), queryOne(), withTransaction()
src/lib/session.ts                  Session & requireUser(role)
src/lib/audit.ts                    catatAudit()
src/components/<domain>/            Komponen UI per domain; komponen umum di src/components/ui.tsx
database/schema.sql                 Struktur tabel (sumber kebenaran skema)
database/migrations/                (wajib mulai Sprint 2) perubahan skema bertahap — lihat §8.2
```

Aturan lapisan:

- **SQL hanya boleh ada di `src/lib/`.** Halaman dan komponen tidak pernah menulis SQL.
- **Aturan bisnis hanya di `src/lib/`**, bukan di komponen. UI boleh mengulang validasi demi UX, tetapi
  keputusan final selalu di server.
- **Server Action tipis.** Isinya: `requireUser`/cek role → validasi input → panggil fungsi `lib` →
  `revalidatePath`/`redirect`. Logika lebih dari ±30 baris dipindah ke `lib`.
- Setiap modul `src/lib/*` yang menyentuh database diawali `import "server-only";`.
- Satu modul domain per berkas (`krs.ts`, `nilai.ts`, `keuangan.ts`). Berkas >400 baris dipecah per sub-domain.

### 2.2 Penamaan dan bahasa

- **Istilah domain memakai Bahasa Indonesia** sesuai PRD dan skema: `tagihan`, `termin`, `mahasiswa`,
  `getTagihan`, `catatAudit`. Istilah teknis tetap Inggris: `session`, `pool`, `handler`, `props`.
- Nama tabel/kolom: `snake_case`, tunggal (`tagihan`, `jadwal_kuliah`). Variabel/fungsi TS: `camelCase`.
  Komponen React: `PascalCase`. Berkas: `kebab-case.tsx`.
- Teks antarmuka: Bahasa Indonesia baku, konsisten dengan istilah kampus (NFR-09).

### 2.3 TypeScript

- `strict` tetap aktif. **Dilarang** `any`, `@ts-ignore`, dan `as` untuk membungkam error. Gunakan `unknown`
  lalu persempit (narrowing).
- Setiap hasil query diberi tipe eksplisit: `query<TagihanRow>(...)`.
- Tipe domain dipakai ulang dari `lib`, tidak didefinisikan ganda di komponen.
- Status/enum didefinisikan sebagai union type yang sama persis dengan `ENUM` di skema.

### 2.4 Database

- **Selalu query berparameter** (`?`). Dilarang menyusun SQL dengan template string berisi input pengguna.
  Nama kolom/arah sort yang dinamis wajib melewati *whitelist*.
- Operasi yang mengubah lebih dari satu baris/tabel → `withTransaction()`. Audit log ikut dalam transaksi
  (`catatAudit(..., conn)`).
- Setiap foreign key dan kolom yang sering difilter (`mahasiswa_id`, `status`, `periode`, `tahun_akademik`)
  **wajib diberi index**.
- Uang disimpan sebagai `DECIMAL(15,2)` atau `BIGINT` rupiah — **tidak pernah** `FLOAT`.
- Waktu disimpan sebagai `DATETIME` dalam WIB (sesuai `db.ts`: `timezone: "+07:00"`). Waktu pembanding
  (deadline, timer ujian, jatuh tempo) **selalu waktu server/DB** (`NOW()`), bukan waktu browser.
- Data penting tidak dihapus permanen: gunakan status (`nonaktif`, `batal`, `dihapus_pada`) — lihat
  BR-SD-10, BR-EL-02.
- Nominal/aturan yang bisa berubah (tarif, batas SKS, bobot nilai) **disalin (snapshot)** ke transaksi saat
  transaksi dibuat, supaya perubahan konfigurasi tidak mengubah histori.

### 2.5 Tidak ada data yang ditulis langsung di kode

Prinsip yang sudah berlaku di repo (lihat README): menu, fitur, label institusi, durasi session, batas termin,
dll. diambil dari tabel `pengaturan`, `fitur`, `menu`. Fitur baru mengikuti pola ini. Aturan akademik yang
"dapat dikonfigurasi BAAK" menurut PRD (tabel batas SKS, konversi nilai huruf, minimal presensi) **wajib
dari database**, bukan konstanta.

### 2.6 Penanganan error

- Error yang diharapkan (validasi, kuota penuh, tagihan belum lunas) **dikembalikan sebagai state**
  (`{ errors, message }`), bukan dilempar.
- Error tak terduga dilempar → ditangkap `error.tsx`, dicatat di log server; pengguna melihat pesan umum
  tanpa detail teknis (stack trace, SQL, nama tabel).
- Pesan ke pengguna jelas dan menyebut langkah selanjutnya ("Kuota kelas penuh. Pilih kelas paralel lain atau
  hubungi Prodi.").

### 2.7 Kerapian & maintainability

- Fungsi kecil dengan satu tugas; nama menjelaskan maksud (`hitungBatasSks`, bukan `calc2`).
- Komentar menjelaskan **mengapa**, bukan apa. Aturan bisnis selalu disertai kode BR/FR-nya.
- Jangan duplikasi: cek `src/lib` dan `src/components` sebelum membuat helper baru.
- Jangan menambah dependency tanpa alasan kuat. Bila perlu, pilih library yang aktif dipelihara dan
  sebutkan alasannya di PR.
- Jangan refactor bagian yang tidak terkait dengan tugas dalam perubahan yang sama.
- Setiap fitur baru: perbarui tabel cakupan di `README.md` dan, bila ada aturan baru, catat di §9 dokumen ini.

---

## 3. Keamanan

Acuan: OWASP ASVS Level 2 dan OWASP Top 10, NFR-04…07, serta UU No. 27/2022 tentang Pelindungan Data Pribadi.
**Keamanan adalah syarat sejak desain, bukan pekerjaan menjelang rilis.**

### 3.1 Autentikasi

| Kontrol | Status repo | Aturan |
| --- | --- | --- |
| Hash password bcrypt (cost ≥ 10) | ✅ ada | Pertahankan; pertimbangkan Argon2id bila pindah stack |
| Anti-enumerasi akun (dummy hash) | ✅ ada | Pesan gagal login selalu sama untuk "user tidak ada" dan "password salah" |
| CAPTCHA sekali pakai | ✅ ada | — |
| Session token acak, disimpan sebagai hash SHA-256, cookie `httpOnly` + `SameSite=Lax` + `Secure` (prod) | ✅ ada | Token sensitif tidak pernah disimpan di `localStorage` |
| **Rate limiting & lockout login** (NFR-04) | ✅ ada (`src/lib/batas-login.ts`) | Per akun **dan** per IP (default 5 gagal akun / 100 gagal IP per 15 menit, diatur di `pengaturan`). Counter di DB, **bukan memori proses**, karena aplikasi akan berjalan di beberapa instance. Batas IP sengaja longgar karena mahasiswa di Wi-Fi kampus berbagi satu IP publik |
| CAPTCHA tidak terbaca mesin & sekali pakai | ✅ ada | Digambar sebagai path SVG (bukan `<text>`); nonce dicatat di `captcha_terpakai` |
| **Reset password** token sekali pakai | ❌ belum | Token acak, disimpan sebagai hash, berlaku ≤ 30 menit, hangus setelah dipakai; semua session lain dicabut setelah reset |
| **MFA** untuk Superadmin, Keuangan, BAAK | ❌ belum | TOTP minimal untuk role berhak istimewa |
| Rotasi session | — | Buat token baru saat login dan saat role/password berubah; sediakan "keluar dari semua perangkat" |
| Session kedaluwarsa | ✅ ada | Session idle dan absolut berakhir; job pembersihan session kedaluwarsa |

### 3.2 Otorisasi (RBAC + kepemilikan objek)

**Matriks PRD §10 dan §17 adalah spesifikasi otorisasi.** Setiap baris matriks harus punya pemeriksaan di server.

Aturan yang tidak boleh dilanggar:

1. **Setiap halaman terproteksi** memanggil `requireUser(role)` di server. `src/proxy.ts` hanya pemeriksaan
   optimis (ada cookie atau tidak), **bukan** mekanisme keamanan.
2. **Setiap Server Action adalah endpoint publik.** Siapa pun bisa memanggilnya langsung dengan request POST.
   Karena itu setiap action **wajib** memeriksa ulang session dan role di awal fungsi, walaupun tombolnya hanya
   tampil untuk role tertentu.
3. **Pemeriksaan kepemilikan objek (anti-IDOR).** Query data milik pengguna selalu menyertakan pemiliknya:
   ```ts
   // ✅ benar — tagihan hanya ditemukan bila milik mahasiswa yang login
   getTagihan(Number(id), mhs.id)
   // ❌ salah — siapa pun bisa mengganti id di URL
   getTagihan(Number(id))
   ```
   Pola yang sama berlaku untuk: KRS, KHS, submission tugas, jawaban ujian, dokumen, surat, presensi.
4. **Dosen** hanya dapat mengakses kelas yang ia ampu dan mahasiswa bimbingannya. **Kaprodi** hanya prodinya.
   Cakupan ini difilter di query, bukan di UI.
5. Menyembunyikan menu/tombol **bukan** kontrol akses; itu hanya UX.
6. Role baru (Superadmin, BAAK, Kaprodi, Dosen PA, Pimpinan, Admin E-Learning) ditambahkan sesuai PRD §10.
   Satu pengguna bisa punya lebih dari satu peran (dosen yang juga Kaprodi) — rancang tabel peran
   many-to-many, bukan satu kolom `role`, sebelum modul Kaprodi dibangun.

### 3.3 Validasi input & output

- Semua input dari `FormData`, `params`, `searchParams`, header, dan body API **divalidasi di server**
  (tipe, panjang, format, rentang). Angka dicek `Number.isInteger`, ID dicek > 0, string dipotong panjangnya.
- Disarankan memakai satu skema validasi (mis. Zod) per action agar konsisten.
- **XSS:** React sudah meng-escape output. **Dilarang** `dangerouslySetInnerHTML`, kecuali untuk konten
  rich-text (isi pengumuman/materi) yang **sudah disanitasi di server** dengan allowlist tag.
- Data yang dikirim ke Client Component hanya field yang dibutuhkan. Jangan kirim objek baris DB utuh
  (berisi `password_hash`, NIK, dll.).

### 3.4 CSRF & origin

- Server Actions di Next.js hanya menerima `POST` dan membandingkan header `Origin` dengan `Host`. Di
  produksi di belakang reverse proxy, atur `serverActions.allowedOrigins` di `next.config.ts` bila domain
  berbeda.
- **Route Handler** (`src/app/api/**`) yang mengubah data **tidak** mendapat perlindungan ini otomatis:
  wajib memeriksa session, origin, dan metode sendiri. Webhook (pembayaran, sinkron E-Learning)
  diverifikasi dengan **signature HMAC + timestamp + whitelist IP**, bukan cookie.

### 3.5 Berkas unggahan (tugas, dokumen, bukti bayar, materi)

- Validasi **ekstensi + MIME sebenarnya (magic bytes) + ukuran** (default 20 MB, NFR-14, dapat dikonfigurasi).
- Nama berkas di storage **dibuat ulang oleh server** (UUID); nama asli disimpan hanya sebagai metadata.
- Simpan di lokasi **non-publik** (object storage privat atau folder di luar `public/`). Unduhan melalui route
  yang memeriksa hak akses lalu memberi *signed URL* berumur pendek.
- Jangan pernah menyajikan HTML/SVG unggahan pengguna inline (risiko XSS) — kirim dengan
  `Content-Disposition: attachment`.
- Pertimbangkan pemindaian antivirus (ClamAV) untuk unggahan publik antar-pengguna.

### 3.6 Audit log (NFR-07)

- Wajib dicatat: login/logout/gagal login, perubahan nilai, perubahan tagihan/pembayaran, perubahan
  role/hak akses, perubahan data & status mahasiswa, persetujuan KRS, perubahan jadwal, konfigurasi ujian,
  ekspor data, penghapusan.
- Untuk perubahan data, catat **nilai sebelum dan sesudah** serta **alasan** (wajib untuk koreksi nilai,
  BR-SD-07, dan koreksi pembayaran, BR-SD-10).
- Tabel `audit_log` bersifat **append-only**: trigger `audit_log_tolak_ubah`/`audit_log_tolak_hapus` menolak
  UPDATE/DELETE (✅ 2026-11-10). Akun DB aplikasi di produksi tidak punya hak `TRIGGER`/`ALTER`/`DROP`,
  sehingga tidak bisa melepas trigger tersebut (lihat §3.9).
- Catat lewat `catatAudit(userId, aksi, keterangan, conn, { entitas, entitasId, dataLama, dataBaru, alasan })`.
  Riwayat per objek dibaca lewat index `(entitas, entitas_id)`, bukan `LIKE` pada `keterangan`.
- Jangan mencatat password, token, atau isi CAPTCHA di log mana pun.

### 3.7 Data pribadi (UU PDP No. 27/2022, NFR-06)

- Prinsip minimal: tampilkan hanya data yang diperlukan peran tersebut. NIK, nomor KK, dan data orang tua
  disamarkan di daftar/tabel (`3202********0001`) dan hanya tampil penuh di halaman detail bagi yang berhak.
- Ekspor data massal (Excel/CSV) hanya untuk peran berwenang dan selalu tercatat di audit log.
- Data demo (`data-demo.sql`) **tidak boleh** berisi data mahasiswa asli. Data produksi **tidak boleh**
  disalin ke laptop pengembang.
- Data keuangan **tidak pernah** dikirim ke E-Learning (BR-SD-12, BR-EL-08).

### 3.8 Pembayaran (NFR-05, BR-SD-08/09)

- Status `lunas` hanya berubah lewat: callback gateway yang **signature-nya terverifikasi**, verifikasi
  manual Admin Keuangan, atau rekonsiliasi.
- Callback **idempoten**: simpan ID transaksi gateway dengan `UNIQUE` constraint; callback ganda tidak
  menambah saldo dua kali.
- Nominal yang dibayar dibandingkan dengan nominal tagihan di server; bayar kurang/lebih ditandai untuk
  ditinjau, tidak otomatis dianggap lunas.
- Aplikasi tidak pernah menyimpan data kartu.

### 3.9 Infrastruktur & konfigurasi

- HTTPS di semua lingkungan publik; aktifkan HSTS.
- Header keamanan: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `frame-ancestors 'none'` (kecuali halaman cetak yang memang perlu). ✅ 2026-11-10 di `next.config.ts`.
  CSP masih memakai `'unsafe-inline'` untuk script; peningkatan berikutnya adalah CSP bernonce lewat `src/proxy.ts`.
- Port database **tidak** dibuka ke internet. Akun DB aplikasi **bukan** `root`; hanya hak yang dibutuhkan
  (least privilege). Contoh untuk staging/produksi (dijalankan DBA; migrasi & `CREATE TRIGGER` tetap memakai
  akun admin terpisah):
  ```sql
  CREATE USER 'sidik_app'@'10.0.0.%' IDENTIFIED BY '<dari secret manager>';
  GRANT SELECT, INSERT, UPDATE, DELETE ON sidik_db.* TO 'sidik_app'@'10.0.0.%';
  -- Tanpa TRIGGER/ALTER/DROP: aplikasi tidak bisa melepas trigger append-only audit_log.
  ```
- Secret (`AUTH_SECRET`, kredensial DB, kunci gateway) hanya di environment/secret manager. `.env*` tidak
  pernah di-commit (kecuali `.env.example` tanpa nilai).
- `npm audit` dan pembaruan dependency rutin minimal tiap sprint; patch keamanan kritis segera.

---

## 4. Kapasitas: menghadapi ±3.000 pengguna aktif

### 4.1 Memahami angka 3.000

3.000 mahasiswa terdaftar **tidak berarti** 3.000 request per detik. Yang menentukan adalah **pola puncak**.
Perkiraan kasar (wajib divalidasi dengan load test, §6.5):

| Skenario puncak | Asumsi | Perkiraan beban |
| --- | --- | --- |
| Pembukaan KRS | 60% mahasiswa (1.800) masuk dalam 30 menit pertama, ±20 request/orang | rata-rata ±20 req/detik, **puncak 3–5× → 60–100 req/detik**, ±1.000 sesi bersamaan (NFR-02) |
| Ujian online serentak (UTS/UAS) | 500 peserta mulai bersamaan, autosave tiap 15–30 detik | **lonjakan 500 request dalam ±1 menit di awal & akhir**, ±20–35 tulis/detik selama ujian (NFR-16) |
| Deadline tugas | 40 mahasiswa × puluhan kelas, mengunggah di 10 menit terakhir | beban **bandwidth & disk** (berkas s.d. 20 MB), bukan CPU |
| Pengumuman nilai/KHS | Semua mahasiswa membuka KHS dalam 1 jam | beban **baca** tinggi, cocok untuk cache |
| Jam masuk kuliah | Login + presensi QR dalam 10 menit | lonjakan login (bcrypt itu mahal secara CPU) |

Target respons (NFR-01): p95 < 2 detik normal, < 4 detik saat puncak KRS; target internal API p95 < 500 ms
untuk endpoint ringan.

### 4.2 Yang wajib ada di sistem

**A. Aplikasi stateless dan dapat dijalankan lebih dari satu instance**
- Tidak ada state penting di memori proses (session sudah di DB ✅). Rate limiter, antrean, dan cache bersama
  harus di DB atau Redis, bukan variabel global.
- Jalankan ≥ 2 instance aplikasi di belakang Nginx/Caddy (PM2 cluster atau Docker), sehingga satu instance mati
  tidak menghentikan layanan.

**B. Database yang disiapkan untuk beban**
- **Connection pool**: `connectionLimit` di `src/lib/db.ts` saat ini 10 dan ditulis langsung di kode. Jadikan
  variabel environment (`DB_POOL_SIZE`), lalu hitung: `instance × pool ≤ max_connections MySQL − cadangan admin`.
- Index pada semua FK dan kolom filter; cek setiap query baru dengan `EXPLAIN`. Aktifkan *slow query log*
  (> 500 ms) di staging/produksi.
- Hindari N+1 query: ambil data daftar dengan `JOIN`/`IN (...)`, bukan query per baris dalam loop.
- **Paginasi wajib** untuk semua daftar yang bisa tumbuh (mahasiswa, tagihan, audit log, pengumuman,
  submission). Jangan pernah `SELECT *` tanpa `LIMIT` untuk data pengguna.
- Lookup session dilakukan di setiap request, jadi pastikan `sessions.token_hash` ber-index unik dan session
  kedaluwarsa dibersihkan berkala.

**C. Cache untuk data yang jarang berubah**
- `pengaturan`, `menu`, `fitur`, `kategori_pengumuman`, data master (prodi, mata kuliah, periode aktif): cache
  di server dengan TTL beberapa menit dan invalidasi saat admin mengubahnya.
- Dalam satu request, gunakan `cache()` dari React agar query yang sama tidak diulang (pola ini sudah dipakai
  di `session.ts`).
- **Data privat per pengguna tidak boleh di-cache** di CDN/proxy bersama.

**D. Penanganan "perebutan" — KRS dan kuota kelas**
- Kuota kelas dikurangi secara **atomik** di database, bukan "baca lalu tulis" di aplikasi:
  ```sql
  UPDATE kelas SET terisi = terisi + 1 WHERE id = ? AND terisi < kuota;
  -- affectedRows = 0 → kuota penuh, tolak dengan pesan jelas
  ```
- `UNIQUE (krs_id, kelas_id)` dan `UNIQUE (mahasiswa_id, tahun_akademik, periode)` (BR-SD-01) mencegah
  duplikasi akibat klik ganda atau dua tab.
- Seluruh pengajuan KRS dalam satu transaksi: validasi batas SKS, prasyarat, bentrok jadwal, kuota, dan
  status tagihan (BR-SD-02…04), lalu simpan.
- Mitigasi R-03 PRD: **jadwal pengisian KRS per angkatan/prodi** (mis. angkatan tua hari pertama). Ini cara
  paling murah dan efektif untuk meratakan lonjakan.
- Opsional bila load test menunjukkan perlu: halaman antrean (*waiting room*) saat KRS dibuka.

**E. Ujian online (BR-EL-06, NFR-16, Blueprint §9.1)**
- Timer dihitung dari `waktu_mulai` dan `durasi` yang tersimpan di server; browser hanya menampilkan sisa waktu
  yang dikirim server.
- Autosave per jawaban dengan **upsert** (`UNIQUE (attempt_id, soal_id)`), di-*debounce* di klien dan
  menampilkan status "Tersimpan pukul 10.42".
- Satu attempt aktif per peserta; submit **idempoten** (submit kedua tidak membuat attempt baru).
- Job server menutup attempt yang waktunya habis dan memakai jawaban terakhir yang tersimpan.
- Soal di-cache per ujian (sama untuk semua peserta); acak urutan di server dengan seed per attempt.
- Load test khusus untuk 1 menit pertama dan 1 menit terakhir ujian.

**F. Berkas besar di luar database**
- Berkas disimpan di object storage (S3-compatible, mis. MinIO) atau disk terpisah; DB hanya menyimpan metadata.
- Batas ukuran diperiksa sebelum berkas dibaca utuh ke memori; untuk berkas besar, gunakan unggah langsung ke
  storage dengan *presigned URL*.
- Materi video **tidak di-hosting sendiri** pada tahap awal; gunakan tautan (YouTube unlisted/Drive) agar
  bandwidth server tidak habis.

**G. Pekerjaan berat di latar belakang (queue/worker)**
- Kirim email/WhatsApp, ekspor laporan Excel/PDF, sinkron kelas ke E-Learning, rekap nilai massal, penutupan
  ujian otomatis, dan pembersihan session dijalankan sebagai job, **bukan** di dalam request pengguna.
- Job wajib idempoten dan punya retry bertahap (PRD §18.7: 1, 5, 15, 60 menit) serta catatan kegagalan.

**H. Aset statis & frontend**
- Gambar dioptimasi (`next/image`), font self-hosted, aset statis di-cache panjang / CDN.
- Halaman berat dipecah dengan `Suspense` agar bagian cepat tampil lebih dulu.

**I. Observabilitas (NFR-13)**
- Endpoint health check (`/api/health`: cek DB) untuk monitor uptime dan load balancer.
- Log terstruktur (JSON) berisi request id, user id, durasi, dan status; **tanpa** data sensitif.
- Error tracking (Sentry atau setara) dan alert untuk: error rate > 1%, p95 melewati target, callback
  pembayaran gagal, antrean menumpuk, disk > 80%.

### 4.3 Titik awal infrastruktur (divalidasi load test)

Untuk ±3.000 mahasiswa, titik awal yang wajar adalah **2 instance aplikasi (2–4 vCPU, 4–8 GB RAM)**,
**1 server DB terpisah (4 vCPU, 8 GB RAM, SSD)**, Redis kecil, dan object storage. Ini **bukan** spesifikasi
final: angka akhir ditentukan dari hasil load test (§6.5) sesuai prinsip *measure before scaling*.

---

## 5. Kasus Khas Perkuliahan

Daftar ini berisi situasi nyata yang sering muncul di kampus. Setiap fitur yang menyentuh domain terkait
**wajib** menjelaskan bagaimana kasus-kasus ini ditangani, lalu mengujinya (§6). Bila perilaku yang benar
belum ditentukan PRD, tandai sebagai pertanyaan ke kampus — **jangan menebak aturan akademik**.

### 5.1 Akun & status mahasiswa

| Kasus | Perilaku yang diharapkan |
| --- | --- |
| Mahasiswa **cuti** | Bisa login dan melihat data (read-only); tidak bisa mengisi KRS; tagihan sesuai kebijakan cuti |
| Mahasiswa **non-aktif / DO / mengundurkan diri** | Login ditolak atau read-only sesuai kebijakan; data tetap tersimpan |
| Mahasiswa **lulus / alumni** | Akses terbatas (transkrip, surat keterangan); tidak muncul di daftar aktif |
| **Pindah prodi** | Riwayat nilai prodi lama tetap ada; konversi/pengakuan mata kuliah tercatat |
| **Lupa password & email tidak aktif** | Reset melalui BAAK dengan verifikasi identitas, tercatat di audit log |
| **Satu akun dipakai bersama** / login di banyak perangkat | Daftar session aktif dapat dilihat dan dicabut; untuk ujian hanya satu perangkat aktif |
| **Dosen PA berganti** di tengah semester | Persetujuan KRS yang tertunda berpindah ke PA baru; riwayat persetujuan lama tetap |
| Dosen yang juga **Kaprodi** | Mendapat gabungan hak akses kedua peran (lihat §3.2 butir 6) |

### 5.2 KRS & jadwal

| Kasus | Perilaku yang diharapkan |
| --- | --- |
| **Kelas penuh** saat disubmit | Ditolak secara atomik (§4.2 D); tampilkan kelas paralel yang masih tersedia |
| **Klik ganda / dua tab** submit | Hanya satu KRS tersimpan (unique constraint); submit kedua mengembalikan hasil yang sama |
| **Jadwal bentrok** antar mata kuliah | Ditolak dengan menyebut mata kuliah yang bentrok |
| **Melebihi batas SKS** (BR-SD-03) | Ditolak; batas dihitung dari IPS semester lalu memakai tabel konfigurasi BAAK |
| **Prasyarat belum lulus** (BR-SD-04) | Ditolak, kecuali nilai semester lalu belum dipublikasi → kebijakan harus dikonfirmasi kampus |
| **Belum lunas** saat KRS dibuka (BR-SD-02) | Diblokir dengan pesan dan tautan ke tagihan; dispensasi dari Keuangan membuka blokir |
| Sudah bayar, tetapi **verifikasi manual belum selesai** menjelang batas KRS | Tampilkan status "menunggu verifikasi"; Keuangan punya antrean verifikasi yang diurutkan |
| **Mengulang mata kuliah** | Diperbolehkan; aturan nilai yang dipakai di IPK (terbaik/terakhir) diambil dari konfigurasi |
| **Masa tambah/batal** (BR-SD-05) | Perubahan hanya dalam periode; setiap perubahan dikirim ke E-Learning sebagai event |
| **Dosen PA tidak menyetujui** sebelum batas waktu | Pengingat otomatis; eskalasi ke Kaprodi/BAAK sesuai kebijakan |
| **Semester pendek / antara** | Periode terpisah dengan aturan SKS sendiri |
| **Mahasiswa semester 1** | KRS paket (BR-SD-03) |
| **Ruang atau dosen bentrok** saat BAAK menyusun jadwal | Validasi saat menyimpan jadwal |
| **Perubahan jadwal / kuliah pengganti** | Mahasiswa peserta dan dosen menerima notifikasi; riwayat perubahan tercatat |
| **Pergantian semester/tahun akademik** | Satu sumber "periode aktif" di konfigurasi; data periode lalu menjadi read-only |

### 5.3 Nilai, KHS, transkrip

| Kasus | Perilaku yang diharapkan |
| --- | --- |
| **Dosen terlambat input nilai** | Nilai tampil "belum tersedia", bukan 0 atau E; pengingat ke dosen; jalur input manual di SIDIK (FR-AK-20) |
| **Bobot komponen ≠ 100%** (BR-EL-04) | Nilai tidak dapat dikirim ke SIDIK |
| **Koreksi nilai setelah dipublikasi** (BR-SD-07) | Hanya BAAK, wajib alasan; nilai sebelum/sesudah tercatat; IPS/IPK dihitung ulang |
| **Nilai tunda / tidak lengkap (T/K)** | Status khusus yang tidak dihitung ke IPK sampai diselesaikan |
| **Pembulatan IPK** | Satu fungsi dengan aturan pembulatan yang terdokumentasi; dipakai di semua tempat (KHS, transkrip, laporan) |
| **Mahasiswa batal KRS setelah ada nilai komponen** | Akses kelas dicabut, data tetap tersimpan (BR-EL-02) |
| Nilai **dikirim ganda** dari E-Learning | Idempotency key mencegah duplikasi (PRD §18.7) |

### 5.4 Presensi

| Kasus | Perilaku yang diharapkan |
| --- | --- |
| **"Titip absen"** — kode/QR dibagikan lewat WhatsApp | Kode berganti tiap 30–60 detik dan berlaku singkat; opsional cek lokasi atau jaringan kampus |
| **Dosen lupa membuka presensi** | Dosen dapat membuka presensi susulan dengan alasan; tercatat di audit log |
| **Izin / sakit** | Pengajuan dengan bukti; status berbeda dari "alpa" |
| **Presensi < minimal** untuk UAS (BR-EL-03, default 75%) | Peringatan dini ke mahasiswa saat mendekati batas; status syarat UAS terlihat oleh dosen |
| **Kuliah pengganti / pertemuan dibatalkan** | Tidak dihitung sebagai alpa; jumlah pertemuan efektif disesuaikan |

### 5.5 Tugas

| Kasus | Perilaku yang diharapkan |
| --- | --- |
| Unggah **pukul 23:59:58** dengan koneksi lambat | Acuannya waktu server saat request **mulai diterima**; aturannya didokumentasikan dan ditampilkan |
| **Lewat deadline** | Ditolak, atau diterima bertanda "terlambat" sesuai pengaturan dosen |
| **Mengganti berkas** sebelum deadline | Simpan versi; yang dinilai adalah versi terakhir sebelum deadline |
| **Berkas rusak / format salah / terlalu besar** | Ditolak dengan pesan jelas **sebelum** unggahan selesai sejauh memungkinkan |
| **Perpanjangan deadline** untuk satu mahasiswa (sakit) | Pengecualian per mahasiswa, tercatat |
| **Tugas kelompok** | Satu submission mewakili kelompok; nilai dapat dibedakan per anggota |
| **Server lambat menjelang deadline** | Load test skenario deadline; dosen dapat memperpanjang deadline massal bila terjadi gangguan |

### 5.6 Kuis & ujian online

| Kasus | Perilaku yang diharapkan |
| --- | --- |
| **Listrik mati / koneksi putus** | Peserta dapat melanjutkan dengan jawaban yang sudah ter-autosave; sisa waktu dihitung dari waktu server, waktu tetap berjalan |
| **Membuka ujian di dua perangkat/tab** | Hanya satu attempt aktif; perangkat lain melihat peringatan |
| **Waktu habis saat peserta offline** | Server otomatis mengumpulkan jawaban terakhir yang tersimpan (BR-EL-06) |
| **Klik "Kumpulkan" berkali-kali** | Submit idempoten |
| **Jam perangkat peserta salah** | Tidak berpengaruh, karena semua perhitungan memakai waktu server |
| **Ujian susulan** | Dosen membuat jadwal/attempt khusus per mahasiswa |
| **Soal ternyata salah** | Dosen dapat menganulir/mengganti kunci; nilai dihitung ulang dan tercatat |
| **Kebutuhan khusus** (tambahan waktu untuk peserta tertentu) | Pengaturan waktu per peserta |
| **Server gangguan saat ujian** | Prosedur darurat: perpanjangan waktu massal oleh dosen/admin, tercatat |

### 5.7 Keuangan & UKT

| Kasus | Perilaku yang diharapkan |
| --- | --- |
| **Callback pembayaran ganda** (BR-SD-09) | Saldo tidak bertambah dua kali |
| **Bayar kurang / lebih** | Ditandai untuk ditinjau Keuangan; tidak otomatis lunas |
| **Transfer manual dengan bukti** | Antrean verifikasi Admin Keuangan; ACC/tolak dengan alasan |
| **Tarif berubah** setelah tagihan terbit | Tagihan yang sudah terbit memakai nominal snapshot; tidak ikut berubah |
| **Cicilan menunggak** (BR-SD-16) | Ditampilkan sebagai menunggak; efeknya ke KRS mengikuti BR-SD-02 |
| **Beasiswa / keringanan UKT** | Alur pengajuan → persetujuan → potongan tagihan, tercatat |
| **Salah input pembayaran oleh admin** | Tidak dihapus; dikoreksi dengan alasan (BR-SD-10) |
| **Refund / kelebihan bayar** | Dicatat sebagai transaksi terpisah, bukan mengubah transaksi lama |
| **Klik "Bayar" berkali-kali** | Satu VA/QRIS aktif per tagihan; request ganda mengembalikan VA yang sama |

### 5.8 Umum

- **Zona waktu:** semua tanggal ditampilkan dan dihitung dalam WIB.
- **Hari libur nasional / jadwal kampus:** jatuh tempo dan deadline yang jatuh pada hari libur mengikuti
  kebijakan yang dikonfigurasi.
- **Data kosong** (mahasiswa baru, belum ada nilai/tagihan): setiap halaman punya *empty state* yang jelas
  (akun demo `0102523026` dipakai untuk menguji ini).
- **E-Learning tidak tersedia:** SIDIK tetap berjalan; event menunggu di antrean (PRD §18.7, NFR-15).

---

## 6. Strategi Pengujian

> **Status repo:** kerangka test Vitest sudah tersedia (`npm test`, folder `tests/`, database `sidik_test`
> dibuat ulang otomatis). Cakupan saat ini: CAPTCHA, rate limiting login, IP proxy. Modul keuangan, KRS,
> dan nilai belum punya test.

### 6.1 Piramida pengujian

| Lapisan | Tujuan | Alat yang disarankan | Cakupan |
| --- | --- | --- | --- |
| Unit | Aturan bisnis murni (hitung batas SKS, IPS/IPK, status tagihan dari termin, bentrok jadwal) | Vitest | Semua fungsi aturan bisnis di `src/lib` |
| Integrasi | Fungsi `lib` + MySQL sungguhan: transaksi, constraint, concurrency | Vitest + database `sidik_test` | Semua query yang mengubah data |
| Otorisasi | Matriks RBAC PRD §10/§17 dan anti-IDOR | Vitest/Playwright | Setiap halaman & action × setiap role |
| End-to-end | Alur kritis lewat browser | Playwright | Login, KRS, bayar/ACC, unggah tugas, ujian |
| Beban | NFR-01/02/16 | Grafana k6 | Skenario §6.5 |
| Keamanan | OWASP Top 10 | OWASP ZAP (baseline scan) + checklist manual | Setiap akhir sprint |
| Pemulihan | Backup benar-benar bisa di-restore | Skrip restore ke server staging | Tiap akhir sprint 4 dan sebelum go-live |

**Target cakupan (NFR-12):** ≥ 70% untuk modul kritis: auth, KRS, nilai, pembayaran.

### 6.2 Aturan test

- Test integrasi memakai database **terpisah** (`sidik_test`), dibuat ulang dari `database/schema.sql` +
  `data-master.sql` + fixture khusus test. **Tidak pernah** dijalankan terhadap database development atau
  produksi.
- Setiap aturan bisnis (`BR-xx`) punya minimal satu test yang namanya menyebut kodenya:
  `it("BR-SD-13: cicilan hanya untuk tagihan yang belum dibayar sama sekali", ...)`.
- Setiap bug yang diperbaiki **wajib** disertai test yang gagal sebelum perbaikan (*regression test*).
- Setiap kasus di §5 yang diimplementasikan punya test.
- Test concurrency untuk kuota KRS dan callback pembayaran: jalankan N request paralel, lalu pastikan tidak
  ada kuota minus dan tidak ada saldo ganda.
- Test tidak bergantung pada urutan eksekusi atau jam saat ini; waktu dikendalikan (fake timers / waktu
  diinjeksi).

### 6.3 Test otorisasi (wajib untuk setiap fitur baru)

Untuk setiap halaman dan Server Action baru, uji minimal:

1. Tanpa login → diarahkan ke `/login` / ditolak.
2. Login dengan role yang **tidak** berhak → ditolak (403/redirect), termasuk pemanggilan action langsung.
3. Login sebagai mahasiswa A, akses objek milik mahasiswa B dengan mengganti ID → **404**, bukan data B.
4. Dosen mengakses kelas yang tidak diampu → ditolak.
5. Input di luar batas (ID negatif, string sangat panjang, angka desimal, tipe salah) → ditolak dengan rapi.

### 6.4 Smoke test setelah deploy

Login tiap role → dashboard terbuka → satu halaman per modul utama terbuka → logout. Harus lulus sebelum
rilis diumumkan.

### 6.5 Skenario load test (k6)

Data uji mendekati produksi: ±3.000 mahasiswa, ±100 dosen, ±150 kelas, tagihan 2 semester.

| Skenario | Profil beban | Kriteria lulus |
| --- | --- | --- |
| Normal harian | 300–500 VU, 30 menit, campuran dashboard/jadwal/pengumuman | p95 < 2 detik, error < 1% |
| Pembukaan KRS | Naik 0 → 1.000 VU dalam 5 menit, login + isi KRS | p95 < 4 detik, error < 1%, **tidak ada kuota minus/KRS ganda** |
| Ujian serentak | 500 VU mulai dalam 1 menit, autosave tiap 15 detik, submit dalam 1 menit | **0 jawaban hilang**, tidak ada attempt ganda |
| Deadline tugas | 200 VU unggah berkas 2–20 MB dalam 10 menit | Semua unggahan sukses atau gagal dengan pesan jelas; tidak ada berkas korup |
| Pengumuman nilai | 1.000 VU membuka KHS | p95 < 2 detik |
| Endurance | 300 VU selama 2–4 jam | Tidak ada kebocoran memori atau koneksi DB |

Catat p50/p95/p99, throughput, error rate, CPU/RAM/IO server aplikasi dan DB, jumlah koneksi DB, serta slow query.
Kriteria lulus **disepakati sebelum** test dijalankan.

---

## 7. Definition of Done

Sebuah perubahan dianggap **selesai** hanya jika semua butir berikut terpenuhi:

- [ ] Bagian PRD yang relevan sudah dibaca; kode BR/FR yang diimplementasikan disebut di kode/commit.
- [ ] Mengikuti lapisan §2.1: SQL hanya di `src/lib`, action tipis, `server-only` dipasang.
- [ ] Setiap halaman/action baru memeriksa session + role + kepemilikan objek (§3.2).
- [ ] Input divalidasi di server; error yang diharapkan dikembalikan sebagai pesan yang jelas.
- [ ] Perubahan data penting tercatat di `audit_log` (§3.6), dalam transaksi yang sama.
- [ ] Query baru sudah diberi index yang diperlukan; daftar dipaginasi.
- [ ] Kasus terkait di §5 sudah ditangani atau dicatat sebagai pertanyaan terbuka.
- [ ] `npm run lint` bersih dan `npx tsc --noEmit` tanpa error.
- [ ] `npm run build` berhasil.
- [ ] Test ditambahkan/diperbarui dan lulus (setelah kerangka test tersedia).
- [ ] Perubahan skema ditulis sebagai berkas migrasi baru (§8.2), dan `schema.sql` diperbarui.
- [ ] Tampilan dicek di lebar 360 px dan desktop; ada state loading, kosong, dan error.
- [ ] `README.md` (tabel cakupan) diperbarui bila fitur baru ditambahkan.
- [ ] Tidak ada secret, data pribadi asli, `console.log` debug, atau kode mati yang ikut ter-commit.

---

## 8. Operasional

### 8.1 Backup & pemulihan

- PRD NFR-08: backup harian otomatis, retensi 30 hari, RPO ≤ 24 jam, RTO ≤ 4 jam. Blueprint mencontohkan RPO
  15 menit / RTO 2 jam — **target final perlu disepakati dengan kampus** (lihat §9).
- Untuk RPO di bawah 24 jam: aktifkan binary log MySQL agar dapat dipulihkan ke titik waktu tertentu
  (*point-in-time recovery*).
- Backup dienkripsi, disimpan di lokasi/akun terpisah dari server utama, dan **restore diuji** secara berkala;
  hasilnya didokumentasikan.
- Backup berkas unggahan (object storage) diperlakukan sama pentingnya dengan backup DB.

### 8.2 Migrasi skema

- `npm run db:setup` **menghapus tabel** dan hanya untuk development. Jangan pernah dijalankan di produksi.
- Mulai Sprint 2, setiap perubahan skema ditulis sebagai berkas bernomor di `database/migrations/`
  (`0001_tambah_tabel_krs.sql`), dijalankan berurutan, dan tidak pernah diubah setelah dijalankan di
  staging/produksi.
- Migrasi yang mengubah data besar diuji dulu di salinan data staging (yang sudah dianonimkan).

### 8.3 Lingkungan & rilis

- Tiga lingkungan: **development** (laptop, data demo) → **staging** (mirip produksi, data anonim) →
  **production**.
- Rilis ke produksi di luar jam sibuk akademik; **dilarang** rilis saat periode KRS dibuka atau ujian berlangsung.
- Setiap rilis punya catatan perubahan dan rencana rollback.

### 8.4 SOP insiden

Tentukan sejak awal: siapa yang memutuskan, siapa yang menghubungi kampus, cara mengumumkan gangguan ke
mahasiswa, dan langkah pemulihan. Simpan runbook di `docs/`.

---

## 9. Keputusan Teknis yang Masih Terbuka

Implementasi saat ini berbeda dari rekomendasi PRD §3.1 di beberapa titik. Sampai ada keputusan resmi,
**ikuti stack yang sudah ada di repo** dan jangan mengganti stack secara sepihak.

| Topik | PRD / Blueprint | Kondisi repo | Status |
| --- | --- | --- | --- |
| Database | PostgreSQL | MySQL 8 / MariaDB | Perlu keputusan tim |
| Backend | NestJS/Laravel, REST + OpenAPI | Next.js Server Actions (fullstack) | Perlu keputusan; Integration API (§18) tetap butuh REST + OpenAPI |
| Pemisahan sistem | SIDIK & E-Learning: aplikasi & DB terpisah (NFR-15) | Baru SIDIK | E-Learning dibangun sebagai aplikasi terpisah |
| Model role | 7+ peran (§10), satu orang bisa banyak peran | Satu kolom `role` (4 nilai) | Harus diubah sebelum modul Kaprodi/BAAK |
| Rate limit store | — | Tabel `login_gagal` (MySQL) | ✅ 2026-11-10; pindah ke Redis bila load test menunjukkan perlu |
| Target RPO/RTO | PRD 24 jam/4 jam vs Blueprint 15 menit/2 jam | — | Perlu persetujuan kampus |
| Kerangka test | NFR-12 ≥ 70% modul kritis | Vitest 4 + DB `sidik_test` | ✅ 2026-11-10; cakupan modul kritis belum tercapai |

Setiap keputusan yang diambil dicatat di tabel ini (tanggal, keputusan, PIC), lalu aturan terkait di dokumen
ini diperbarui.
