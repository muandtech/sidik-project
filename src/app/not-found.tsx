import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md rounded-xl border border-line bg-white px-6 py-10 text-center">
        <span className="mx-auto block h-[3px] w-12 rounded-full bg-brand" aria-hidden />
        <h1 className="mt-5 text-3xl font-bold">404</h1>
        <p className="mt-2 text-sm text-muted">Halaman yang Anda cari tidak ditemukan.</p>
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
