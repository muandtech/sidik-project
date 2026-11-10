# Audit Kode SIDIK — 10 November 2026

| Atribut | Keterangan |
| --- | --- |
| Acuan | `docs/ENGINEERING_GUIDE.md` (§2 kode, §3 keamanan, §4 kapasitas, §5 kasus, §6 testing), PRD v2.1 |
| Cakupan | Seluruh `src/`, `database/schema.sql`, `next.config.ts` (commit `c7a2b7c`, Sprint 1) |
| Metode | Review manual seluruh lapisan data/aksi/sesi + verifikasi langsung pada server lokal |
| Hasil cepat | `npx tsc --noEmit` ✅ lulus · `npm run lint` ✅ lulus · test otomatis ❌ belum ada |

**Ringkasan:** fondasinya rapi. Query sudah berparameter, kepemilikan data dicek, dan transaksi keuangan memakai
lock dan audit log. Masalah terbesar ada di **login**: CAPTCHA bisa dibaca bot dan dipakai ulang, dan
tidak ada rate limiting. Akibatnya, password akun dengan NIM berurutan bisa ditebak tanpa batas.

| Tingkat | Jumlah |
| --- | --- |
| 🔴 Tinggi | 3 (✅ semua diperbaiki) |
| 🟠 Sedang | 9 (✅ S2–S7 diperbaiki, S9 sebagian; S1 & S8 menunggu keputusan kampus) |
| 🟡 Rendah | 8 (✅ R4, R7; R6 sebagian) |

## Status perbaikan

| Temuan | Status | Perubahan |
| --- | --- | --- |
| T1 CAPTCHA terbaca mesin | ✅ 2026-11-10 | `src/lib/captcha-glyph.ts`: karakter digambar sebagai path SVG; charset huruf kapital + angka tanpa karakter yang mudah tertukar; jawaban tidak peka huruf besar/kecil |
| T2 Replay CAPTCHA | ✅ 2026-11-10 | `src/lib/captcha.ts`: token bernonce, dicatat di tabel `captcha_terpakai`, hangus setelah satu percobaan |
| T3 Rate limiting login | ✅ 2026-11-10 | `src/lib/batas-login.ts` + tabel `login_gagal` + pengaturan `login_*`; dipakai di `src/app/actions/auth.ts` |
| S2 IP dari header | ✅ 2026-11-10 | `ipDariHeader()` di `src/lib/session.ts`; header proxy hanya dipercaya bila `TRUST_PROXY=true` |
| S3 Security header | ✅ 2026-11-10 | `next.config.ts`: CSP (`frame-ancestors 'none'`, `form-action 'self'`, `object-src 'none'`), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS (produksi), tanpa `X-Powered-By`. Script masih `'unsafe-inline'` (nonce = langkah berikutnya) |
| S4 Paginasi rekap | ✅ 2026-11-10 | `getRekapTagihan` di `src/lib/keuangan.ts`: filter status/bulan/nama di SQL + `LIMIT/OFFSET` 50 baris; ringkasan & tunggakan dihitung `getRingkasanPeriode` di DB; index `idx_tagihan_periode` |
| S5 Audit terstruktur | ✅ 2026-11-10 | Kolom `entitas`, `entitas_id`, `data_lama`, `data_baru`, `alasan` + index; `catatAudit(..., detail)`; riwayat tagihan via index; migrasi `0002` (termasuk backfill data lama) |
| S6 Audit terlindungi | ✅ sebagian | Trigger menolak UPDATE/DELETE `audit_log`. Akun DB khusus non-root untuk produksi: contoh `GRANT` di Guide §3.9, dijalankan saat deploy |
| S7 Action keuangan | ✅ 2026-11-10 | Transaksi dipindah ke `src/lib/keuangan-aksi.ts`; `src/app/actions/keuangan.ts` 398 → ±100 baris; tipe memakai `Tagihan`/`Termin` |
| S9 Test | 🟡 sebagian | Vitest + DB `sidik_test`; 50 test: login (T1–T3, S2), keuangan BR-SD-08/10/13/14/15/16, ACC ganda bersamaan, RBAC action, audit, rekap. Modul akademik belum ada |
| R4 Role ditolak = 500 | ✅ 2026-11-10 | Action keuangan mengembalikan `{ error }` |
| R6 Index | 🟡 sebagian | `tagihan (tahun_akademik, periode)`, `audit_log (aksi, created_at)`. `pengumuman` belum |
| R7 Non-null assertion | ✅ 2026-11-10 | Termin dicari ulang setelah kunci; bila hilang → pesan "Termin tidak ditemukan." |
| S1 Status akademik | ⏸ menunggu kampus | Kebijakan cuti/nonaktif/lulus (ditolak atau read-only) belum ada di PRD |
| S8 Tagihan per semester | ⏸ menunggu kampus | PRD 6.4.1 saat ini memang menulis "Satu tagihan per mahasiswa per semester", jadi constraint sesuai PRD. Ubah PRD dulu bila Keuangan butuh tagihan lain (KKN, wisuda) |

Verifikasi: `npm test` (50 lulus), `tsc`, `lint`, `build` lulus; uji end-to-end di server dev: login
(replay ditolak, akun terkunci setelah 5 gagal walau password benar, akun lain tetap bisa masuk), header
keamanan terkirim, rekap Admin Keuangan + paginasi + filter, riwayat tagihan dari audit terstruktur.

---

## 🔴 Tinggi — perbaiki sebelum ada data asli

### T1. Kode CAPTCHA dapat dibaca mesin — *terverifikasi*
- **Lokasi:** [src/lib/captcha.ts:56](../../src/lib/captcha.ts) (`renderCaptchaSvg`)
- **Masalah:** setiap karakter dikirim sebagai elemen `<text>` di dalam SVG. Bot cukup mengambil teksnya,
  tanpa OCR.
- **Bukti:** `curl -s http://localhost:3000/api/captcha | grep -oE '>[A-Za-z0-9]</text>'` langsung
  menghasilkan kode yang benar (`GAPSB`).
- **Acuan:** Guide §3.1, NFR-04.
- **Perbaikan:** render karakter sebagai `<path>` (outline glyph) atau gambar raster (PNG), bukan teks. Atau
  ganti CAPTCHA dengan rate limiting + lockout (T3), yang memang kontrol utamanya.

### T2. Token CAPTCHA dapat dipakai ulang (replay)
- **Lokasi:** [src/lib/captcha.ts:31-40](../../src/lib/captcha.ts), [src/app/actions/auth.ts:44-46](../../src/app/actions/auth.ts)
- **Masalah:** verifikasi hanya memeriksa tanda tangan HMAC dan masa berlaku 5 menit. `cookieStore.delete()`
  hanya meminta browser menghapus cookie. Penyerang yang menyimpan nilai cookie + jawabannya bisa
  mengirim ulang pasangan yang sama untuk percobaan login tanpa batas selama 5 menit. Komentar "CAPTCHA
  hanya berlaku untuk satu kali percobaan" tidak benar di sisi server.
- **Perbaikan:** sertakan nonce acak di token dan catat nonce yang sudah dipakai (tabel/Redis dengan TTL 5 menit),
  lalu tolak nonce yang sama.

### T3. Tidak ada rate limiting / lockout login
- **Lokasi:** [src/app/actions/auth.ts:29](../../src/app/actions/auth.ts) (`login`)
- **Masalah:** jumlah percobaan gagal per akun dan per IP tidak dibatasi. Dengan T1 + T2, CAPTCHA tidak
  menghalangi apa pun. NIM berurutan (`0102523025`, `…026`) membuat daftar akun mudah ditebak, dan password
  awal mahasiswa di kampus sering berpola (tanggal lahir, NIM).
- **Acuan:** NFR-04, Guide §3.1.
- **Perbaikan:** catat percobaan gagal di DB (`login_attempt`: identifier, ip, waktu). Contoh aturan: 5 gagal
  dalam 15 menit → akun dikunci 15 menit, dan batas per IP lebih longgar. Penyimpanan di DB/Redis, bukan
  memori, karena aplikasi akan berjalan di beberapa instance (Guide §4.2 A).

---

## 🟠 Sedang

### S1. Status akademik mahasiswa tidak diperiksa saat login/sesi
- **Lokasi:** [src/lib/session.ts](../../src/lib/session.ts) (`getSessionUser`) — hanya memeriksa `users.status`.
- **Masalah:** mahasiswa `cuti`, `nonaktif`, atau `lulus` (kolom `mahasiswa.status_akademik`) mendapat akses
  penuh yang sama dengan mahasiswa aktif.
- **Acuan:** Guide §5.1. Kebijakan detailnya **perlu konfirmasi kampus** (read-only atau ditolak).

### S2. IP klien diambil dari `X-Forwarded-For` tanpa syarat
- **Lokasi:** [src/lib/session.ts](../../src/lib/session.ts) (`getClientInfo`)
- **Masalah:** header ini bisa diisi bebas oleh klien bila aplikasi tidak berada di belakang proxy tepercaya.
  Akibatnya IP di `audit_log` bisa dipalsukan, dan rate limit per IP (T3) nanti bisa dilewati.
- **Perbaikan:** hanya percayai header ini bila ada konfigurasi `TRUSTED_PROXY`, dan ambil IP dari hop proxy
  terakhir yang tepercaya.

### S3. Belum ada security header
- **Lokasi:** [next.config.ts](../../next.config.ts)
- **Masalah:** tidak ada `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`,
  `Referrer-Policy`, maupun `frame-ancestors`. Halaman login bisa di-iframe (clickjacking).
- **Acuan:** Guide §3.9.

### S4. Rekap Admin Keuangan memuat seluruh mahasiswa tanpa paginasi
- **Lokasi:** [src/lib/keuangan.ts:44](../../src/lib/keuangan.ts) (`getRekapTagihan`), [src/app/admin-keuangan/page.tsx:47](../../src/app/admin-keuangan/page.tsx)
- **Masalah:** setiap kali halaman dibuka, semua tagihan dalam satu periode ikut dimuat (±3.000 baris) beserta
  seluruh termin dan subquery `COUNT(*)` per baris, lalu difilter di aplikasi. Dengan data asli, halaman akan
  lambat dan berat.
- **Acuan:** Guide §4.2 B (paginasi wajib).
- **Perbaikan:** pindahkan filter status/bulan ke SQL, tambahkan `LIMIT/OFFSET` + pencarian NIM/nama, dan
  sediakan index `tagihan (tahun_akademik, periode)`.

### S5. Riwayat tagihan dibaca dari `audit_log` dengan `LIKE` tanpa index
- **Lokasi:** [src/lib/keuangan.ts](../../src/lib/keuangan.ts) (`getRiwayatTagihan`), skema `audit_log`
- **Masalah:**
  1. Query `aksi LIKE 'tagihan\_%' AND keterangan LIKE CONCAT(?, ' |%')` melakukan full scan. Padahal
     `audit_log` bertambah setiap ada login (±3.000 mahasiswa), jadi query ini makin lambat seiring waktu.
  2. Relasi ke tagihan disimpan sebagai teks di `keterangan VARCHAR(255)` yang dipotong, bukan kolom yang
     terstruktur.
  3. Belum ada nilai **sebelum/sesudah** seperti yang diminta Guide §3.6 dan BR-SD-07/10.
- **Perbaikan:** tambahkan kolom `entitas`, `entitas_id`, `data_lama JSON`, `data_baru JSON`, `alasan` + index
  `(entitas, entitas_id, created_at)`.

### S6. Audit log belum terlindungi & aplikasi memakai akun DB `root`
- **Lokasi:** `.env.local`, [src/lib/db.ts](../../src/lib/db.ts)
- **Masalah:** aplikasi terhubung sebagai `root` tanpa password (bawaan development). Akun ini bisa
  `UPDATE/DELETE` audit log.
- **Acuan:** NFR-07, Guide §3.6 dan §3.9. Untuk staging/produksi: buat user DB khusus tanpa hak `UPDATE/DELETE`
  di `audit_log`.

### S7. Server Action keuangan berisi SQL & aturan bisnis (398 baris)
- **Lokasi:** [src/app/actions/keuangan.ts](../../src/app/actions/keuangan.ts)
- **Masalah:** melanggar Guide §2.1 (SQL hanya di `src/lib`, action tipis). Tipe `TagihanRow`/`TerminRow`
  juga didefinisikan ulang padahal sudah ada `Tagihan`/`Termin` di `src/lib/data.ts` (Guide §2.3). Logikanya
  sendiri benar (memakai `FOR UPDATE`, transaksi, audit dalam transaksi). Yang perlu diperbaiki hanya
  lokasinya, supaya bisa dites dan dipakai ulang oleh payment gateway di Sprint 4.
- **Perbaikan:** pindahkan isi transaksi ke `src/lib/keuangan.ts` (mis. `verifikasiTermin(conn, …)`), lalu
  action cukup memanggilnya.

### S8. Satu mahasiswa hanya boleh punya satu tagihan per semester
- **Lokasi:** skema `tagihan` — `UNIQUE KEY uq_tagihan_semester (mahasiswa_id, semester_ke)`
- **Masalah:** kampus biasanya punya beberapa tagihan dalam satu semester (UKT + KKN/PPL, wisuda, semester
  pendek). Constraint ini akan menolaknya.
- **Tindakan:** **konfirmasi ke Keuangan** (PRD §24 "skema biaya"). Bila memang ada lebih dari satu jenis
  tagihan, ubah constraint menjadi `(mahasiswa_id, tahun_akademik, periode, jenis_pembayaran)`.

### S9. Belum ada test otomatis
- **Acuan:** NFR-12 (≥ 70% modul kritis), Guide §6.
- **Prioritas test pertama:** login (T1–T3 setelah diperbaiki), BR-SD-13/14/15 (cicilan), test concurrency
  ACC ganda, dan matriks akses (mahasiswa vs keuangan, IDOR kuitansi).

---

## 🟡 Rendah

| # | Temuan | Lokasi | Perbaikan |
| --- | --- | --- | --- |
| R1 | `connectionLimit: 10` ditulis langsung di kode; bila env kosong, aplikasi diam-diam memakai `root`/password kosong | [src/lib/db.ts:13](../../src/lib/db.ts) | `DB_POOL_SIZE` dari env; di produksi gagal start bila kredensial tidak diisi |
| R2 | Session kedaluwarsa tidak pernah dihapus; belum ada "keluar dari semua perangkat" | [src/lib/session.ts](../../src/lib/session.ts) | Job pembersihan berkala; fungsi cabut semua session user |
| R3 | Tidak ada `error.tsx`; error tak terduga tampil sebagai halaman error bawaan | `src/app/` | Tambah `error.tsx` & `global-error.tsx` berbahasa Indonesia (Guide §2.6) |
| R4 | `requireKeuangan` melempar `Error` biasa → halaman 500, bukan pesan rapi | [src/app/actions/keuangan.ts:40](../../src/app/actions/keuangan.ts) | Kembalikan `{ error }` atau redirect |
| R5 | Daftar pengumuman tanpa batas/paginasi | [src/app/(portal)/pengumuman/page.tsx:16](../../src/app/(portal)/pengumuman/page.tsx) | Paginasi (Guide §4.2 B) |
| R6 | Index yang belum ada: `tagihan (tahun_akademik, periode)`, `audit_log (aksi, created_at)`, `pengumuman (target, published_at)` | `database/schema.sql` | Tambahkan lewat migrasi |
| R7 | Non-null assertion `!` pada hasil `.find()` | [src/app/actions/keuangan.ts](../../src/app/actions/keuangan.ts) (`accTermin`, `batalkanTermin`) | Tangani `undefined` secara eksplisit |
| R8 | `/api/captcha` tanpa pembatasan request | [src/app/api/captcha/route.ts](../../src/app/api/captcha/route.ts) | Ikut rate limit per IP |

---

## ✅ Yang sudah sesuai panduan

- **SQL injection:** semua query memakai parameter `?`. Interpolasi `${...}` hanya untuk potongan SQL konstan
  (`TAGIHAN_COLUMNS`, `TERMIN_SELECT`), bukan input pengguna.
- **Anti-IDOR:** kuitansi & termin hanya muncul bila milik mahasiswa yang login (`getTagihan(id, mhs.id)`,
  `getTerminMilik`); pengumuman difilter sesuai target role.
- **Otorisasi berlapis:** setiap halaman memanggil `requireUser(role)`; setiap Server Action keuangan memeriksa
  ulang role (dengan komentar alasannya).
- **Integritas keuangan:** transaksi + `SELECT … FOR UPDATE` mencegah ACC ganda; status tagihan bercicilan
  dihitung dari termin (BR-SD-14); cicilan hanya untuk tagihan belum dibayar (BR-SD-13); gabung hanya bila belum ada
  termin lunas (BR-SD-15); koreksi wajib alasan (BR-SD-10); audit dicatat dalam transaksi yang sama.
- **Sesi:** token acak 256-bit, disimpan sebagai hash SHA-256, cookie `httpOnly`/`SameSite=Lax`/`Secure`;
  mencegah enumerasi akun dengan dummy hash.
- **Data & waktu:** uang `DECIMAL`, waktu WIB konsisten, tanggal bayar tidak boleh di masa depan.
- **Kerapian:** TypeScript strict tanpa `any`/`@ts-ignore`, tanpa `dangerouslySetInnerHTML`, tanpa
  `console.log`; konfigurasi dari tabel `pengaturan`/`menu`/`fitur`; `.env*` di-ignore git.

---

## Urutan perbaikan yang disarankan

1. **T1 + T2 + T3** (login), disertai test. Ini satu paket kecil dan berisiko paling tinggi.
2. **S3** security header dan **S2** IP tepercaya.
3. **Siapkan kerangka test (S9)** sebelum refactor **S7**, supaya pemindahan logika keuangan terlindungi test.
4. **S4, S5, R6** (paginasi, audit terstruktur, index) sebelum data 3.000 mahasiswa diimpor.
5. Bawa **S1** (kebijakan status akademik) dan **S8** (jenis tagihan per semester) ke rapat dengan kampus.
