import Link from "next/link";

// HTTP 403 (SD-S2-01): role aktif tidak berhak membuka halaman ini. Percobaan sudah dicatat di audit log.
export default function Forbidden() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md rounded-xl border border-line bg-white px-6 py-10 text-center">
        <span className="mx-auto block h-[3px] w-12 rounded-full bg-brand" aria-hidden />
        <h1 className="mt-5 text-3xl font-bold">403</h1>
        <p className="mt-2 text-sm text-muted">
          Anda tidak memiliki akses ke halaman ini dengan role yang sedang aktif. Bila Anda memiliki role lain,
          ganti role aktif dari menu pengguna.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
