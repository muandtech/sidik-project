import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/print-button";
import { ButtonLink } from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import type { Pengaturan } from "@/lib/konfigurasi";

/** Kuitansi siap cetak; dipakai untuk tagihan bayar sekaligus maupun per termin cicilan. */
export function Kuitansi({
  pengaturan,
  rows,
  jumlah,
  statusLabel,
}: {
  pengaturan: Pengaturan;
  rows: [string, string][];
  jumlah: string | number;
  statusLabel: string;
}) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <ButtonLink href="/keuangan" variant="plain">
          <ArrowLeft className="size-4" aria-hidden /> Kembali ke Keuangan
        </ButtonLink>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-2xl rounded-xl border border-line bg-white p-6 sm:p-8 print:max-w-none print:border-0 print:p-0">
        <header className="flex items-center gap-4 border-b-2 border-brand pb-4">
          <Image src={pengaturan.logo} alt="" width={56} height={56} />
          <div>
            <p className="text-lg font-bold">{pengaturan.nama_institusi}</p>
            <p className="text-xs text-muted">
              {pengaturan.kuitansi_penerbit} · {pengaturan.footer_teks} ({pengaturan.nama_aplikasi})
            </p>
          </div>
        </header>

        <h1 className="mt-6 text-center text-xl font-bold tracking-wide uppercase">Kuitansi Pembayaran</h1>

        <dl className="mt-6 divide-y divide-line text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[150px_1fr] gap-3 py-2 sm:grid-cols-[180px_1fr]">
              <dt className="text-muted">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex items-center justify-between rounded-lg bg-brand-soft px-4 py-4 print:border print:border-line">
          <span className="text-sm font-semibold">Jumlah Dibayar</span>
          <span className="text-2xl font-bold text-brand">{formatRupiah(jumlah)}</span>
        </div>

        <p className="mt-4 text-center text-xs font-bold tracking-widest text-success uppercase">{statusLabel}</p>
        {pengaturan.kuitansi_catatan && (
          <p className="mt-6 text-center text-[11px] text-muted">{pengaturan.kuitansi_catatan}</p>
        )}
      </article>
    </>
  );
}
