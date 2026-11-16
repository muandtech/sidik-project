import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LABEL_STATUS_KRS } from "@/components/staf/ringkasan";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getKelasMilikDosen, getPesertaKelas } from "@/lib/dasbor";
import { getDosenByUser } from "@/lib/krs";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Peserta Kelas" };

// Peserta kelas hanya untuk dosen pengampunya (anti-IDOR → 404).
export default async function PesertaKelasPage({ params }: PageProps<"/staf/kelas/[id]">) {
  const user = await requireUser(["dosen", "kaprodi"]);
  const { id } = await params;
  const dosen = await getDosenByUser(user.userId);
  const kelas = dosen && Number.isInteger(Number(id)) ? await getKelasMilikDosen(Number(id), dosen.id) : null;
  if (!kelas) notFound();
  const peserta = await getPesertaKelas(kelas.kelas_id);

  return (
    <>
      <Link href="/staf/kelas" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Kembali
      </Link>
      <PageHeader
        boxed
        title={`${kelas.nama_mk} · Kelas ${kelas.kelas}`}
        description={`${kelas.kode_mk} · ${kelas.terisi}/${kelas.kuota} kursi terisi`}
      />
      {peserta.length === 0 ? (
        <EmptyState>Belum ada peserta.</EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto p-4 sm:p-5">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="bg-canvas text-[13px]">
                  <th scope="col" className="px-3 py-2.5">No</th>
                  <th scope="col" className="px-3 py-2.5">NIM</th>
                  <th scope="col" className="px-3 py-2.5">Nama</th>
                  <th scope="col" className="px-3 py-2.5">Prodi</th>
                  <th scope="col" className="px-3 py-2.5">Status KRS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {peserta.map((p, i) => (
                  <tr key={p.nim}>
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">{p.nim}</td>
                    <td className="px-3 py-2 font-semibold">{p.nama}</td>
                    <td className="px-3 py-2 text-xs">
                      {p.prodi} · {p.angkatan}
                    </td>
                    <td className="px-3 py-2 text-xs">{LABEL_STATUS_KRS[p.status_krs]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
