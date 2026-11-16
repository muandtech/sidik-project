# SIDIK — Sistem Informasi Akademik IAI Sukabumi

Implementasi `PRD_SIDIK_ELearning_IAI_Sukabumi.md`: **Sprint 1** (portal mahasiswa) selesai, simulasi pembayaran manual
(PRD 6.4.1), dan **Sprint 2 fase 1** (multi-role RBAC, KRS + persetujuan Dosen PA, KHS/transkrip, jadwal, dashboard per role).
Dibangun dengan Next.js 16 (App Router) + MySQL/MariaDB.

## Menjalankan

1. Nyalakan **MySQL** dari XAMPP Control Panel.
2. Salin konfigurasi (sudah tersedia `.env.local` untuk development lokal):
   ```bash
   cp .env.example .env.local   # lalu isi AUTH_SECRET
   ```
3. Buat tabel + data master aplikasi (**menghapus tabel SIDIK lama jika ada**):
   ```bash
   npm install
   npm run db:setup   # database/schema.sql + database/data-master.sql
   npm run db:demo    # opsional: database/data-demo.sql (data simulasi untuk uji coba)
   ```
   `data-demo.sql` dibuat oleh `npm run db:demo:buat` dari `scripts/demo/inti.sql` (akun demo, ditulis tangan) +
   simulasi otomatis (`scripts/buat-data-demo.mjs`): 6 prodi di 4 fakultas, ±190 mahasiswa angkatan 2023–2026,
   riwayat nilai 6 semester, 600 kelas dengan jadwal tanpa bentrok, tagihan, dan KRS dengan status beragam.
   Ubah `inti.sql` atau generator, jangan `data-demo.sql` secara langsung.
   Lewat phpMyAdmin: buat database `sidik_db`, lalu Import `schema.sql` → `data-master.sql` → (opsional) `data-demo.sql`.
4. Jalankan aplikasi:
   ```bash
   npm run dev      # http://localhost:3000
   ```

### Database yang sudah berjalan (migrasi)

Bila database sudah dibuat sebelum suatu perubahan skema, jalankan berkas migrasi baru tanpa menghapus data:

```bash
node --env-file-if-exists=.env.local scripts/db.mjs migrations/0001_keamanan_login
node --env-file-if-exists=.env.local scripts/db.mjs migrations/0002_audit_terstruktur
node --env-file-if-exists=.env.local scripts/db.mjs migrations/0003_sprint2_rbac_siakad   # baca peringatan di berkasnya
```

Tabel `audit_log` bersifat append-only (trigger menolak `UPDATE`/`DELETE`). Untuk mengosongkannya di
development, jalankan ulang `npm run db:setup`.

### Test

```bash
npm test          # sekali jalan
npm run test:watch
```

Cakupan saat ini: login (CAPTCHA, rate limiting, IP, aturan status akademik, multi-role), keuangan (cicilan,
ACC/koreksi, ACC ganda bersamaan, hak akses action, audit log, rekap + paginasi, izin KRS), dan KRS (batas SKS dari IPS,
prasyarat, bentrok, paket semester 1, rebutan kuota bersamaan, persetujuan/penolakan Dosen PA, IPS/IPK). Test integrasi memakai database **terpisah** `sidik_test` (dibuat ulang otomatis dari `schema.sql` +
`data-master.sql` setiap kali test dijalankan) dengan koneksi MySQL dari `.env.local`. MySQL harus menyala.
Nama database bisa diganti lewat `DB_TEST_NAME`, tetapi wajib berakhiran `_test`.

### Akun demo (hanya bila `data-demo.sql` diimport; password semua: `password123`)

| Login | Role | Skenario untuk dicoba |
| --- | --- | --- |
| `0102523025` | Mahasiswa SI smt 5 | KRS sudah disetujui → jadwal tampil di dashboard & Jadwal Kuliah |
| `0102523026` | Mahasiswa SI smt 3 | KRS diajukan, menunggu Dosen PA; cicilan Oktober menunggak |
| `0102523027` | Mahasiswa PAI smt 3 | Boleh KRS dan belum mengisi → **coba isi & ajukan KRS** |
| `0102523028` | Mahasiswa baru SI smt 1 | Belum bayar → KRS terkunci sampai Keuangan membuka izin (paket semester 1) |
| `0102523029` | Mahasiswa SI smt 5 | IPS rendah → batas 15 SKS; sebagian mata kuliah terkunci prasyarat |
| `0102523030` / `0102523031` | Mahasiswa cuti / nonaktif | Boleh login, hanya melihat; tidak bisa KRS |
| `0102519032` / `0102523033` | Mahasiswa lulus / keluar | Login ditolak |
| `0412345678` | Dosen + Kaprodi SI | Dosen PA (setujui/tolak KRS); ganti role ke Kaprodi untuk ringkasan prodi |
| `0415058801`, `0401078503` | Dosen | `0401078503` adalah Dosen PA mahasiswa `0102523027` |
| `keuangan` | Admin Keuangan | Rekap & ACC pembayaran, **Izin KRS** |
| `baak` | Admin Akademik | Kalender & ringkasan KRS seluruh prodi |
| `pimpinan` | Pimpinan | Statistik per fakultas, audit log (baca) |
| `superadmin` | Superadmin | Pengguna per role, audit log |

Mahasiswa & dosen simulasi lain: username = NIM/NIDN (lihat tabel `users`), password sama.

**Aturan status akademik** (keputusan kampus 2026-11-16): aktif = penuh; cuti & nonaktif = boleh login, lihat saja, tidak
bisa KRS; lulus & keluar = login ditolak. Periode isi KRS semester aktif di data demo dibuat selalu terbuka di sekitar
tanggal import supaya alur KRS bisa dicoba kapan saja.

CAPTCHA tidak peka huruf besar/kecil dan hanya berlaku untuk satu percobaan. Setelah 5 kali gagal dalam 15 menit
akun dikunci sementara (atur di tabel `pengaturan`: `login_maks_gagal_akun`, `login_maks_gagal_ip`,
`login_jendela_menit`); untuk membuka kunci saat development: `DELETE FROM login_gagal;`. Untuk produksi, jangan import `data-demo.sql`; isi tabel dengan data asli kampus
(password disimpan sebagai hash bcrypt).

## Semua data dari database

Tidak ada data yang ditulis langsung di kode. Selain data mahasiswa, dosen, tagihan, pengumuman, dll.,
konfigurasi portal juga disimpan di database:

| Tabel | Isi | Contoh perubahan tanpa mengubah kode |
| --- | --- | --- |
| `pengaturan` | Nama aplikasi & institusi, logo, teks login, footer, teks Coming Soon, kuitansi, durasi session | Ganti `judul_portal`, `logo`, `sesi_durasi_jam` |
| `fitur` | Daftar fitur, deskripsi, status `tersedia`/`segera`, rute, rencana sprint | Aktifkan fitur baru: `status='tersedia'`, isi `rute` → semua menu yang menautnya pindah dari Coming Soon ke halaman asli |
| `menu` | Menu atas, sidebar (beserta submenu), menu pengguna, tombol aksi dashboard/biodata/keuangan, Quick Actions | Ubah label/urutan/ikon, sembunyikan dengan `aktif=0` |
| `kategori_pengumuman` | Tab filter pengumuman | Tambah kategori baru |
| `pengaturan` (keuangan) | `cicilan_maks_termin`, `metode_bayar_manual` | Ubah batas termin cicilan atau daftar metode bayar saat ACC |

Yang tetap di kode hanyalah teks antarmuka (judul kolom, label field, pesan validasi), nama ikon yang boleh dipakai
(`src/components/portal/menu-icon.tsx`), dan pengaturan teknis (nama cookie, panjang CAPTCHA).

## Cakupan Sprint 1

| Backlog | Implementasi |
| --- | --- |
| S1-07/08/10/16 Login, session, logout | `/login`, server action `src/app/actions/auth.ts`, session di tabel `sessions` (token acak, disimpan sebagai hash SHA-256, cookie httpOnly), CAPTCHA bergambar garis dengan token HMAC sekali pakai (`captcha_terpakai`), rate limiting login per akun & IP (`login_gagal`, `src/lib/batas-login.ts`), "Ingat Saya" (durasi diatur di tabel `pengaturan`), audit login/logout di `audit_log` |
| S1-01/12 Dashboard & ringkasan identitas | `/dashboard` — NIM, nama, prodi, semester, dosen PA, agenda hari ini, tindakan penting (notifikasi), pengumuman terbaru, aktivitas, shortcut |
| S1-02/15 Profil | `/biodata` — data pribadi, akademik, kontak, orang tua/wali, dokumen, foto (fallback inisial) |
| S1-06/11 Pengumuman | `/pengumuman` (filter Akademik / Informasi Kampus / Agenda) dan `/pengumuman/[id]` |
| S1-09 Navigasi | Sidebar dengan submenu + menu atas + menu pengguna, state aktif, tombol Keluar |
| S1-13 + S1-CS1..5 Coming Soon | Template reusable `src/components/coming-soon.tsx`, rute `/coming-soon/[slug]`, isi dari tabel `fitur` |
| S1-14 Responsif | Drawer sidebar di mobile, menu atas dapat digeser, diuji hingga lebar 360 px |
| Tagihan & Keuangan (sesuai desain UI) | `/keuangan` + cicilan per bulan, kuitansi siap cetak `/keuangan/kuitansi/[id]` dan per termin `/keuangan/kuitansi/termin/[id]` |
| SD-S2-01 RBAC (sebagian) | Tabel `user_roles` (satu pengguna banyak role), ganti role aktif, 403 + audit `akses_ditolak` (`requireUser` di `src/lib/session.ts`), menu staf per role dari tabel `menu` |
| SD-S2-03 Dashboard per role | `/staf`: dosen, kaprodi, BAAK, pimpinan, superadmin |
| SD-S2-04 (sebagian) | Ganti password `/ganti-password`, `/staf/ganti-password` (session lain diakhiri). Lupa password via email belum |
| SD-S2-09/10 KRS & persetujuan | `/krs` (`src/lib/krs.ts`), `/staf/perwalian`; izin KRS manual oleh Keuangan `/admin-keuangan/izin-krs` |
| SD-S2-11 KHS & transkrip | `/khs`, `/transkrip` (siap cetak), IPS/IPK dihitung dari nilai terpublikasi (`src/lib/akademik.ts`) |
| SD-S2-13 (sebagian) | Audit log hanya-baca `/staf/audit` (pimpinan, superadmin) |
| Jadwal & kalender | `/jadwal`, `/jadwal/prodi`, `/kalender`, `/staf/kelas` |
| Simulasi pembayaran manual (PRD 6.4.1) | `/admin-keuangan`: rekap mahasiswa × bulan dengan filter periode/bulan/status (filter & paginasi di database, 50 baris per halaman); `/admin-keuangan/tagihan/[id]`: ACC lunas, koreksi dengan alasan, pecah/gabung cicilan, riwayat dari `audit_log` (nilai sebelum/sesudah). Logika di `src/lib/keuangan-aksi.ts`, server action tipis di `src/app/actions/keuangan.ts` |

Semua menu lain (KRS, Nilai, Layanan Surat, E-Learning, KKN, Sidang, dll.) mengarah ke halaman Coming Soon
karena status fiturnya `segera` di tabel `fitur`.

## Struktur

```
database/schema.sql          struktur tabel
database/data-master.sql     pengaturan, fitur, menu, kategori (wajib)
database/data-demo.sql       data contoh (opsional)
database/migrations/         perubahan skema untuk database yang sudah berjalan
scripts/db.mjs               npm run db:setup / db:demo
tests/                       test Vitest (tests/support: setup database sidik_test)
src/proxy.ts                 redirect cepat ke /login bila tidak ada cookie session
src/lib/                     db pool, session, captcha, query data & konfigurasi, format
src/app/(portal)/            halaman yang membutuhkan login (layout = header, menu, sidebar)
src/app/login/               halaman login
src/app/admin-keuangan/      portal Admin Keuangan (pembayaran manual, izin KRS)
src/app/staf/                portal staf: beranda per role, persetujuan KRS, kelas, audit log
scripts/demo/inti.sql        akun demo tulis tangan (sumber data-demo.sql)
scripts/buat-data-demo.mjs   generator simulasi → database/data-demo.sql
```

> Logo `public/logo-iais.png` diambil dari mockup UI dengan resolusi rendah. Ganti dengan berkas logo resmi
> beresolusi tinggi (PNG persegi, latar transparan) untuk hasil terbaik.
