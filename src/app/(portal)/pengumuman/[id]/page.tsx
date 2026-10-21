import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { ButtonLink, Card } from "@/components/ui";
import { getPengumuman } from "@/lib/data";
import { formatTanggal } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Detail Pengumuman" };

export default async function PengumumanDetailPage({ params }: PageProps<"/pengumuman/[id]">) {
  const { id } = await params;
  const user = await requireUser("mahasiswa");
  const pengumuman = Number.isInteger(Number(id)) ? await getPengumuman(Number(id), user.role) : null;
  if (!pengumuman) notFound();

  return (
    <>
      <div className="mb-4">
        <ButtonLink href="/pengumuman" variant="plain">
          <ArrowLeft className="size-4" aria-hidden /> Semua Pengumuman
        </ButtonLink>
      </div>

      <Card className="mx-auto max-w-3xl px-5 py-6 sm:px-8 sm:py-8">
        <span className="inline-block rounded bg-brand-soft px-2 py-0.5 text-[11px] font-bold tracking-wide text-brand uppercase">
          {pengumuman.kategori_nama}
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{pengumuman.judul}</h1>
        <p className="mt-2 text-sm text-muted">
          {pengumuman.penulis} • {formatTanggal(pengumuman.published_at, true)} WIB
        </p>

        {pengumuman.tanggal_acara && (
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-brand-muted bg-brand-soft px-4 py-3">
            <CalendarDays className="size-5 shrink-0 text-brand" aria-hidden />
            <div>
              <p className="text-xs font-semibold text-muted uppercase">Waktu Kegiatan</p>
              <p className="text-sm font-semibold">{formatTanggal(pengumuman.tanggal_acara, true)} WIB</p>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink">
          {pengumuman.isi.split(/\n{2,}/).map((paragraf, index) => (
            <p key={index}>{paragraf}</p>
          ))}
        </div>
      </Card>
    </>
  );
}
