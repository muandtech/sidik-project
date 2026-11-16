import type { Metadata } from "next";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getTahunAkademikAktif, labelTahunAkademik } from "@/lib/akademik";
import { formatTanggal } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Kalender Akademik" };

// FR-AK-04: kalender semester aktif yang diatur BAAK.
export default async function KalenderPage() {
  await requireUser("mahasiswa");
  const ta = await getTahunAkademikAktif();
  if (!ta) {
    return (
      <>
        <PageHeader boxed title="Kalender Akademik" />
        <EmptyState>Semester aktif belum ditetapkan.</EmptyState>
      </>
    );
  }
  const agenda = [
    ["Pengisian KRS", ta.krs_mulai, ta.krs_selesai],
    ["Masa tambah/batal KRS", ta.perubahan_mulai, ta.perubahan_selesai],
    ["Perkuliahan", ta.kuliah_mulai, ta.kuliah_selesai],
    ["Ujian Tengah Semester", ta.uts_mulai, ta.uts_selesai],
    ["Ujian Akhir Semester", ta.uas_mulai, ta.uas_selesai],
    ["Input & publikasi nilai", ta.nilai_mulai, ta.nilai_selesai],
  ] as const;
  return (
    <>
      <PageHeader boxed title="Kalender Akademik" description={`Semester ${labelTahunAkademik(ta)}`} />
      <Card>
        <ol className="divide-y divide-line">
          {agenda.map(([label, mulai, selesai]) => (
            <li key={label} className="flex flex-col gap-0.5 px-5 py-3.5 sm:flex-row sm:justify-between">
              <span className="font-semibold">{label}</span>
              <span className="text-sm text-muted">
                {mulai && selesai ? `${formatTanggal(mulai)} – ${formatTanggal(selesai)}` : "Belum diatur"}
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
