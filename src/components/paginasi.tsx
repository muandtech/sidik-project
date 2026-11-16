import Link from "next/link";

/** Navigasi halaman sebelumnya/berikutnya; `url(n)` membangun URL halaman ke-n dengan filter yang sama. */
export function Paginasi({ halaman, jumlahHalaman, url }: { halaman: number; jumlahHalaman: number; url: (n: number) => string }) {
  if (jumlahHalaman <= 1) return null;
  const tombol = "rounded-md border border-line px-3 py-1.5 font-semibold hover:bg-canvas";
  return (
    <nav aria-label="Halaman" className="mt-3 flex items-center justify-between gap-3 text-[13px]">
      {halaman > 1 ? (
        <Link href={url(halaman - 1)} className={tombol}>
          ‹ Sebelumnya
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">
        Halaman {halaman} dari {jumlahHalaman}
      </span>
      {halaman < jumlahHalaman ? (
        <Link href={url(halaman + 1)} className={tombol}>
          Berikutnya ›
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function satuParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}
