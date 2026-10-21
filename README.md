# SIDIK — Portal Akademik Mahasiswa IAI Sukabumi (Sprint 1)

Implementasi **Sprint 1 — Fondasi Portal Mahasiswa** dari `PRD_SIDIK_ELearning_IAI_Sukabumi.md`,
dibangun dengan Next.js 16 (App Router) + MySQL/MariaDB (XAMPP).

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
   npm run db:demo    # opsional: database/data-demo.sql (data contoh untuk uji coba)
   ```
   Lewat phpMyAdmin: buat database `sidik_db`, lalu Import `schema.sql` → `data-master.sql` → (opsional) `data-demo.sql`.
4. Jalankan aplikasi:
   ```bash
   npm run dev      # http://localhost:3000
   ```

### Akun demo (hanya bila `data-demo.sql` diimport; password: `password123`)

| Akun | Login | Keterangan |
| --- | --- | --- |
| Mahasiswa | `0102523025` atau `hasan.yusuf@iais.ac.id` | Data lengkap, semua tagihan lunas |
| Mahasiswa | `0102523026` | Data minim (uji tampilan data kosong), UKT dicicil 6 bulan, cicilan Oktober menunggak |
| Mahasiswa | `0102523027` | UKT dicicil 6 bulan, September & Oktober lunas |
| Mahasiswa | `0102523028` | Mahasiswa baru, tagihan bayar sekaligus belum lunas (bisa di-ACC atau dipecah jadi cicilan) |
| Dosen | `0412345678` | Diarahkan ke placeholder *Modul Dosen & Admin* (Sprint 2) |
| Admin Keuangan | `keuangan` atau `keuangan@iais.ac.id` | Portal Admin Keuangan `/admin-keuangan`: rekap per bulan, ACC/koreksi pembayaran |

CAPTCHA peka huruf besar/kecil. Untuk produksi, jangan import `data-demo.sql`; isi tabel dengan data asli kampus
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
| S1-07/08/10/16 Login, session, logout | `/login`, server action `src/app/actions/auth.ts`, session di tabel `sessions` (token acak, disimpan sebagai hash SHA-256, cookie httpOnly), CAPTCHA bertanda tangan HMAC, "Ingat Saya" (durasi diatur di tabel `pengaturan`), audit login/logout di `audit_log` |
| S1-01/12 Dashboard & ringkasan identitas | `/dashboard` — NIM, nama, prodi, semester, dosen PA, agenda hari ini, tindakan penting (notifikasi), pengumuman terbaru, aktivitas, shortcut |
| S1-02/15 Profil | `/biodata` — data pribadi, akademik, kontak, orang tua/wali, dokumen, foto (fallback inisial) |
| S1-06/11 Pengumuman | `/pengumuman` (filter Akademik / Informasi Kampus / Agenda) dan `/pengumuman/[id]` |
| S1-09 Navigasi | Sidebar dengan submenu + menu atas + menu pengguna, state aktif, tombol Keluar |
| S1-13 + S1-CS1..5 Coming Soon | Template reusable `src/components/coming-soon.tsx`, rute `/coming-soon/[slug]`, isi dari tabel `fitur` |
| S1-14 Responsif | Drawer sidebar di mobile, menu atas dapat digeser, diuji hingga lebar 360 px |
| Tagihan & Keuangan (sesuai desain UI) | `/keuangan` + cicilan per bulan, kuitansi siap cetak `/keuangan/kuitansi/[id]` dan per termin `/keuangan/kuitansi/termin/[id]` |
| Simulasi pembayaran manual (PRD 6.4.1) | `/admin-keuangan`: rekap mahasiswa × bulan dengan filter periode/bulan/status; `/admin-keuangan/tagihan/[id]`: ACC lunas, koreksi dengan alasan, pecah/gabung cicilan, riwayat dari `audit_log`. Server action di `src/app/actions/keuangan.ts` |

Semua menu lain (KRS, Nilai, Layanan Surat, E-Learning, KKN, Sidang, dll.) mengarah ke halaman Coming Soon
karena status fiturnya `segera` di tabel `fitur`.

## Struktur

```
database/schema.sql          struktur tabel
database/data-master.sql     pengaturan, fitur, menu, kategori (wajib)
database/data-demo.sql       data contoh (opsional)
scripts/db.mjs               npm run db:setup / db:demo
src/proxy.ts                 redirect cepat ke /login bila tidak ada cookie session
src/lib/                     db pool, session, captcha, query data & konfigurasi, format
src/app/(portal)/            halaman yang membutuhkan login (layout = header, menu, sidebar)
src/app/login/               halaman login
src/app/admin-keuangan/      portal Admin Keuangan (simulasi pembayaran manual)
src/app/portal-staf/         placeholder modul dosen & admin
```

> Logo `public/logo-iais.png` diambil dari mockup UI dengan resolusi rendah. Ganti dengan berkas logo resmi
> beresolusi tinggi (PNG persegi, latar transparan) untuk hasil terbaik.
