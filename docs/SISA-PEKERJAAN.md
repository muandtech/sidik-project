# Serah Terima — Sisa Pekerjaan SIDIK

Diperbarui: 16 November 2026 · Branch: `sprint2/fase1` (ditumpuk di atas `perbaikan/audit-keamanan-keuangan`)

Dokumen ini untuk developer yang melanjutkan proyek. Baca dulu [AGENTS.md](../AGENTS.md) (aturan wajib),
[ENGINEERING_GUIDE.md](ENGINEERING_GUIDE.md) (standar kode, keamanan, testing), dan bagian PRD yang relevan.

## 1. Mulai cepat

```bash
npm install
cp .env.example .env.local            # isi AUTH_SECRET (minimal 32 karakter acak)
npm run db:setup && npm run db:demo   # MySQL 8 harus menyala; HAPUS tabel lama di sidik_db
npm run dev                           # http://localhost:3000
npm test                              # 68 test, memakai database terpisah sidik_test
```

Akun demo dan skenarionya ada di [README.md](../README.md#akun-demo-hanya-bila-data-demosql-diimport-password-semua-password123).
Semua password `password123`.

Urutan merge: `perbaikan/audit-keamanan-keuangan` → `main`, lalu `sprint2/fase1` → `main`.

## 2. Posisi proyek

| Sprint (PRD §21) | Status |
| --- | --- |
| 1. Fondasi portal mahasiswa | ✅ Selesai |
| 2. SIAKAD inti, RBAC, SSO | 🟡 Fase 1 selesai (lihat §3), sisanya di §4 |
| 3. Integrasi nilai + E-Learning | ❌ Belum |
| 4. Keuangan & UKT, layanan | 🟡 Simulasi pembayaran manual (PRD 6.4.1) sudah ada |

## 3. Yang sudah ada (jangan dibuat ulang, pakai ulang)

| Area | Lokasi | Catatan |
| --- | --- | --- |
| Multi-role & role aktif | `src/lib/session.ts`, `src/lib/peran.ts`, tabel `user_roles` | `requireUser(role \| role[])` → 403 + audit `akses_ditolak`. Pakai di **setiap** halaman & action |
| Aturan status akademik | `getRoleTersedia()` (login), `alasanKrsTerkunci()` (KRS) | Aktif penuh; cuti/nonaktif lihat saja; lulus/keluar ditolak |
| KRS + persetujuan PA | `src/lib/krs.ts`, `src/app/actions/akademik.ts` | Kuota atomik saat diajukan, prasyarat, bentrok, batas SKS dari IPS, paket smt 1 |
| IPS/IPK, KHS, transkrip, jadwal | `src/lib/akademik.ts` | Hanya nilai `terpublikasi` dari KRS `disetujui` |
| Dashboard per role | `src/app/staf/page.tsx`, `src/lib/dasbor.ts` | |
| Izin KRS (manual Keuangan) | `src/lib/izin-krs.ts`, `/admin-keuangan/izin-krs` | Diganti otomatis di Sprint 4 (BR-SD-02) |
| Keuangan (ACC, cicilan, koreksi) | `src/lib/keuangan-aksi.ts` | |
| Audit log | `catatAudit(..., conn, { entitas, entitasId, dataLama, dataBaru, alasan })` | Append-only (trigger DB) |
| Komponen | `AksiForm` (`src/components/aksi-form.tsx`), `Paginasi`, `StafFrame` | Form Server Action + pesan hasil |
| Menu staf | tabel `menu` grup `staf`, kolom `roles` | Fitur `segera` otomatis ke `/staf/segera/[slug]` |
| Data simulasi | `scripts/demo/inti.sql` + `scripts/buat-data-demo.mjs` | Jangan edit `database/data-demo.sql` langsung; jalankan `npm run db:demo:buat` |

## 4. Sisa pekerjaan

Prioritas: **P0** wajib sebelum demo Sprint 2 · **P1** penting · **P2** bisa menyusul.

### 4.1 Sisa Sprint 2 — SIDIK

| # | Item | PRD | Prioritas | Petunjuk |
| --- | --- | --- | --- | --- |
| 1 | **Master akademik oleh BAAK**: CRUD fakultas, prodi, kurikulum, mata kuliah (+prasyarat). Data terpakai dinonaktifkan, bukan dihapus | SD-S2-05, FR-AK-01/02 | P0 | Kolom `aktif` sudah ada di `kurikulum` & `mata_kuliah`. Menu `master-akademik` sudah ada (status `segera`) |
| 2 | **Kelas, ruang, jadwal + deteksi bentrok** ruang & dosen, impor jadwal dari Excel | SD-S2-08, FR-AK-05 | P0 | Pakai ulang `jadwalBentrok()` di `src/lib/krs.ts`. Pemeriksaan bentrok harus di server dalam transaksi |
| 3 | **Tahun akademik & kalender**: atur semester aktif (hanya satu) dan tanggal periode | SD-S2-07, FR-AK-04 | P0 | Kolom `aktif_unik` sudah menjamin satu semester aktif. Fitur yang bergantung periode wajib menolak di luar periode |
| 4 | **Master mahasiswa & dosen + impor Excel** (≥500 baris, laporan baris gagal, akun login otomatis, Dosen PA massal) | SD-S2-06, FR-AK-03/06 | P0 | Butuh dependency parser Excel — diskusikan dulu (AGENTS.md: tanpa dependency baru tanpa alasan) |
| 5 | **Pengguna & role oleh Superadmin**: buat, nonaktifkan, reset password, atur role (termasuk `prodi_id` kaprodi), izin per menu/aksi | SD-S2-01, FR-ADM-01/02 | P0 | Tabel `user_roles` sudah ada. Izin per menu/aksi belum punya tabel |
| 6 | **Lupa password via email** (token sekali pakai ≤ 30 menit, disimpan sebagai hash; semua session dicabut) | SD-S2-04, FR-POR-09 | P0 | Butuh SMTP. Ganti password sudah ada (`gantiPassword` di `src/app/actions/auth.ts`, `akhiriSessionLain()`) |
| 7 | **CRUD pengumuman** (kategori, target audiens, lampiran, jadwal tayang) **+ pusat notifikasi** (jumlah belum dibaca) | SD-S2-12, FR-LAY-03/04 | P0 | Tabel `pengumuman` & `notifikasi` sudah ada; kolom `target` masih `semua/mahasiswa/dosen` |
| 8 | **Konfigurasi institusi** (logo, nama, pejabat penandatangan) + filter audit log lebih lengkap | SD-S2-13, FR-ADM-04 | P1 | Audit log hanya-baca sudah ada di `/staf/audit` |
| 9 | **Masa tambah/batal KRS** setelah disetujui | FR-AK-09, BR-SD-05 | P1 | Kolom `perubahan_mulai/selesai` sudah ada. Setiap perubahan nanti dikirim ke E-Learning sebagai event |
| 10 | **Kode verifikasi transkrip** + halaman verifikasi publik | FR-AK-13 | P1 | Transkrip siap cetak sudah ada di `/transkrip` |
| 11 | **SSO Identity Provider (OIDC, Authorization Code + PKCE)** + registrasi client E-Learning | SD-S2-02, FR-SSO-01..03 | P0 | Paling berat. Gunakan library OIDC yang matang, jangan menulis protokol sendiri |
| 12 | Testing, UAT, uji beban dasar KRS bersamaan | SD-S2-14, NFR-12 | P0 | Lihat Guide §6 |

### 4.2 Sprint 3 — Nilai & E-Learning

- Input nilai oleh dosen (jalur cadangan), validasi & publikasi oleh Kaprodi/BAAK, nilai terkunci setelah publikasi, koreksi oleh BAAK dengan alasan (FR-AK-14..16, 20; BR-SD-06/07). Tabel `nilai` sudah punya `status` draf/terpublikasi.
- Monitoring perwalian untuk Dosen PA & Kaprodi (FR-AK-17).
- Integration API + aplikasi E-Learning terpisah (PRD §18, NFR-15).

### 4.3 Sprint 4 — Keuangan & layanan

- Payment gateway VA/QRIS + callback idempoten (BR-SD-08/09). Pakai ulang `verifikasiTermin`/`verifikasiTagihan` di `src/lib/keuangan-aksi.ts`.
- Izin KRS otomatis dari pembayaran (ganti `src/lib/izin-krs.ts`, BR-SD-02).
- Pengajuan cicilan/keringanan oleh mahasiswa, layanan surat, cetak KRS & kartu ujian, pengajuan cuti (FR-AK-18).

### 4.4 Temuan audit yang masih terbuka

Lihat [audit/2026-11-10-audit-kode.md](audit/2026-11-10-audit-kode.md):

- R1 — ukuran pool DB dari env; aplikasi gagal start di produksi bila kredensial DB kosong.
- R2 — job pembersihan session kedaluwarsa.
- R3 — `error.tsx` berbahasa Indonesia.
- R5 — paginasi daftar pengumuman.
- R8 — rate limit `/api/captcha`.
- Sisa R6 — index pengumuman.
- S6 — akun DB non-root saat deploy.
- S8 — tagihan per semester, menunggu keputusan Keuangan.

## 5. Keputusan yang masih ditunggu dari kampus

| Topik | Kondisi sekarang | Tanya ke |
| --- | --- | --- |
| Mata kuliah diulang: nilai terbaik atau terakhir untuk IPK? | Pengaturan `ipk_nilai_ulang` = `terbaik` | BAAK |
| Bolehkah mengambil mata kuliah semester di atasnya? | Boleh bila prasyarat lulus & dalam batas SKS | BAAK |
| Batas SKS memakai IPS yang dibulatkan 2 desimal? | Ya (sama dengan yang tampil di KHS) | BAAK |
| Lebih dari satu tagihan per semester (KKN, wisuda)? | Tidak (sesuai PRD 6.4.1) | Keuangan |
| Stack (PostgreSQL/NestJS di PRD vs MySQL/Next.js di repo) | Lanjut stack repo | Tim |

## 6. Masalah yang diketahui

- **Pesan sukses hilang** setelah "Ambil", "Ajukan", "Setujui". Penyebabnya: form-nya hilang dari halaman setelah aksi berhasil. Status tetap berubah. Perbaikan: tampilkan pesan di tingkat halaman (mis. toast).
- **Periode isi KRS di data demo** selalu terbuka di sekitar tanggal import (`CURDATE() ± hari`). Sengaja dibuat begitu untuk simulasi.
- **`forbidden()` (respons 403)** memakai flag eksperimental Next.js `experimental.authInterrupts` di `next.config.ts`. Cek ulang saat upgrade Next.js.
- **Belum diuji di browser sungguhan dengan JavaScript aktif.** Uji end-to-end sejauh ini lewat HTTP dan form tanpa JavaScript.

## 7. Aturan kerja singkat (detail di AGENTS.md)

- SQL hanya di `src/lib/*` dan selalu berparameter. Server Action tetap tipis.
- Setiap halaman & action memeriksa role dan kepemilikan data sendiri (anti-IDOR).
- Perubahan multi-tabel memakai `withTransaction` + `catatAudit(..., conn)`.
- Perubahan skema = `schema.sql` **dan** berkas migrasi baru `database/migrations/000N_*.sql` yang idempoten.
- Aturan bisnis yang bisa berubah disimpan di tabel `pengaturan`, tidak ditulis di kode. Kutip kode BR/FR di komentar.
- Sebelum selesai: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
