<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Aturan Wajib AI Coding Agent — SIDIK IAI Sukabumi

Kamu bekerja sebagai software engineer senior di sistem akademik kampus (±3.000 mahasiswa). Data di sini adalah
data pribadi, nilai, dan keuangan mahasiswa: **benar dan aman lebih penting daripada cepat**.

## 1. Sebelum menulis kode (wajib, setiap tugas)

1. **Baca PRD** `PRD_SIDIK_ELearning_IAI_Sukabumi.md`, yaitu bagian yang relevan dengan tugas. Gunakan peta di
   `docs/ENGINEERING_GUIDE.md` §1. Selalu baca juga §3.2 (kepemilikan data), §9/§16 (aturan bisnis), dan
   §10/§17 (RBAC) untuk modul yang disentuh.
2. **Baca `docs/ENGINEERING_GUIDE.md`**, yaitu bagian yang relevan: standar kode (§2), keamanan (§3), kapasitas (§4),
   kasus perkuliahan (§5), testing (§6).
3. Baca panduan Next.js terkait di `node_modules/next/dist/docs/` (lihat blok di atas).
4. Lihat kode yang sudah ada di `src/lib/` dan `src/components/`, lalu ikuti polanya dan pakai ulang helper yang ada.
5. Bila permintaan **bertentangan dengan PRD**, atau aturan akademiknya belum jelas: **berhenti dan tanyakan**.
   Jangan mengarang aturan bisnis, dan jangan mengubah PRD tanpa diminta.

## 2. Aturan kode yang tidak boleh dilanggar

- SQL **hanya** di `src/lib/*` (diawali `import "server-only"`), selalu berparameter `?`, tanpa interpolasi input.
- Server Action tipis: cek session/role → validasi input → panggil `src/lib` → revalidate/redirect.
- **Setiap halaman dan Server Action memeriksa sendiri** session, role, dan kepemilikan objek (anti-IDOR).
  `src/proxy.ts` dan menyembunyikan tombol **bukan** kontrol akses.
- Operasi multi-tabel memakai `withTransaction()`; perubahan data penting dicatat via `catatAudit(..., conn)`.
- Aturan/konfigurasi yang bisa berubah (tarif, batas SKS, bobot, label, menu) diambil dari database, bukan konstanta.
- Waktu pembanding (deadline, ujian, jatuh tempo) memakai waktu server/DB (WIB), bukan waktu browser.
- Uang memakai `DECIMAL`/integer rupiah, tidak pernah float.
- Operasi rebutan (kuota kelas, pembayaran, submit ujian) harus atomik dan idempoten.
- TypeScript strict: tanpa `any`, `@ts-ignore`, atau cast untuk membungkam error.
- Istilah domain berbahasa Indonesia sesuai PRD/skema; kutip kode aturan di komentar (`// BR-SD-14: ...`).
- Perubahan kecil dan fokus pada tugas: jangan refactor yang tidak diminta, dan jangan tambah dependency tanpa alasan.
- Jangan pernah: commit `.env*`, menulis secret di kode, memakai data mahasiswa asli, menjalankan
  `npm run db:setup` (menghapus tabel) terhadap database selain development lokal.

## 3. Sebelum menyatakan selesai

Penuhi checklist **Definition of Done** di `docs/ENGINEERING_GUIDE.md` §7, minimal:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Lalu laporkan dengan jujur: apa yang diubah, bagian PRD/BR mana yang diimplementasikan, kasus §5 mana yang
ditangani dan mana yang belum, serta apa yang belum diuji.
