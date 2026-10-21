import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Fitur } from "@/lib/konfigurasi";

/** Template Coming Soon reusable (S1-13): nama fitur, status, deskripsi singkat, dan tombol kembali. */
export function ComingSoon({
  fitur,
  deskripsiUmum,
  catatan,
  backHref = "/dashboard",
  backLabel = "Kembali ke Dashboard",
}: {
  fitur: Pick<Fitur, "nama" | "deskripsi" | "rencana_sprint">;
  deskripsiUmum?: string;
  catatan?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center py-6">
      <section className="w-full max-w-[620px] rounded-xl border border-gray-300 bg-white px-6 py-10 text-center sm:px-12">
        <span className="mx-auto block h-[3px] w-12 rounded-full bg-brand" aria-hidden />
        <p className="mt-5 text-[32px] leading-tight font-bold text-ink">Coming Soon</p>
        <h1 className="mt-3 text-lg font-semibold text-ink">{fitur.nama}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{fitur.deskripsi}</p>
        {deskripsiUmum && <p className="mt-1 text-sm leading-relaxed text-muted">{deskripsiUmum}</p>}
        <p className="mt-4 inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          Status: Coming Soon
          {fitur.rencana_sprint ? ` · Direncanakan Sprint ${fitur.rencana_sprint}` : " · Jadwal menyusul"}
        </p>

        {catatan && (
          <>
            <hr className="my-6 border-line" />
            <p className="text-sm font-medium text-brand">{catatan}</p>
          </>
        )}

        <Link
          href={backHref}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-semibold text-ink hover:bg-canvas"
        >
          <ArrowLeft className="size-4" aria-hidden /> {backLabel}
        </Link>
      </section>
    </div>
  );
}
