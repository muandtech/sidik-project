import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { putuskan } from "@/app/actions/akademik";
import { AksiForm } from "@/components/aksi-form";
import { LABEL_STATUS_KRS } from "@/components/staf/ringkasan";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { formatIp } from "@/lib/akademik";
import { formatTanggal } from "@/lib/format";
import { formatSlot, getDosenByUser, getIsiKrs, getKrsUntukPa } from "@/lib/krs";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Tinjau KRS" };

const textareaClass = "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-brand";

// Detail KRS untuk Dosen PA. KRS yang bukan bimbingannya → 404 (anti-IDOR).
export default async function TinjauKrsPage({ params }: PageProps<"/staf/perwalian/[id]">) {
  const user = await requireUser(["dosen", "kaprodi"]);
  const { id } = await params;
  const dosen = await getDosenByUser(user.userId);
  const krs = dosen && Number.isInteger(Number(id)) ? await getKrsUntukPa(Number(id), dosen.id) : null;
  if (!krs) notFound();
  const isi = await getIsiKrs(krs.id);

  return (
    <>
      <Link href="/staf/perwalian" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Kembali
      </Link>
      <PageHeader
        boxed
        title={`KRS ${krs.nama}`}
        description={`${krs.nim} · ${krs.prodi} · Semester ${krs.semester} · ${LABEL_STATUS_KRS[krs.status]}`}
      />
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Total SKS", `${krs.total_sks} / ${krs.maks_sks}`],
          ["IPS acuan", krs.ips_acuan ? formatIp(Number(krs.ips_acuan)) : "Paket semester 1"],
          ["Diajukan", formatTanggal(krs.diajukan_at)],
          ["Diputuskan", formatTanggal(krs.diputuskan_at)],
        ].map(([label, nilai]) => (
          <div key={label} className="rounded-xl border border-line bg-white px-4 py-3.5">
            <p className="text-[11px] font-semibold tracking-wide text-gray-600 uppercase">{label}</p>
            <p className="mt-1 font-bold">{nilai}</p>
          </div>
        ))}
      </section>
      <Card className="mb-5">
        <CardHeader title="Mata Kuliah Diambil" />
        <div className="overflow-x-auto p-4 pt-1 sm:px-5">
          {isi.length === 0 ? (
            <EmptyState>KRS masih kosong.</EmptyState>
          ) : (
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="bg-canvas text-[13px]">
                  <th scope="col" className="px-3 py-2.5">Mata kuliah</th>
                  <th scope="col" className="px-3 py-2.5">Kelas · Jadwal</th>
                  <th scope="col" className="px-3 py-2.5 text-right">SKS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {isi.map((k) => (
                  <tr key={k.kelas_id}>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold">{k.nama_mk}</span>
                      <span className="block text-xs text-muted">
                        {k.kode_mk} · Smt {k.semester} · {k.jenis}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {k.kelas} · {k.jadwal.map(formatSlot).join("; ")}
                    </td>
                    <td className="px-3 py-2.5 text-right">{k.sks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      {krs.catatan_pa && <p className="mb-5 rounded-lg border border-line bg-white px-4 py-3 text-sm">Catatan: {krs.catatan_pa}</p>}
      {krs.status === "diajukan" && (
        <Card className="p-5">
          <div className="grid gap-6 md:grid-cols-2">
            <AksiForm action={putuskan} hidden={{ krs_id: krs.id, keputusan: "setujui" }} label="Setujui KRS">
              <label htmlFor="catatan-setuju" className="block text-sm font-medium">
                Catatan (opsional)
              </label>
              <textarea id="catatan-setuju" name="catatan" rows={2} maxLength={255} className={textareaClass} />
            </AksiForm>
            <AksiForm action={putuskan} hidden={{ krs_id: krs.id, keputusan: "tolak" }} label="Tolak KRS" variant="danger">
              <label htmlFor="catatan-tolak" className="block text-sm font-medium">
                Alasan penolakan (wajib)
              </label>
              <textarea id="catatan-tolak" name="catatan" rows={2} maxLength={255} required minLength={5} className={textareaClass} />
            </AksiForm>
          </div>
        </Card>
      )}
    </>
  );
}
