import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getTahunAkademikAktif, labelTahunAkademik } from "@/lib/akademik";
import { getKelasAmpu } from "@/lib/dasbor";
import { getDosenByUser } from "@/lib/krs";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Kelas Saya" };

export default async function KelasSayaPage() {
  const user = await requireUser(["dosen", "kaprodi"]);
  const [dosen, ta] = await Promise.all([getDosenByUser(user.userId), getTahunAkademikAktif()]);
  const kelas = dosen && ta ? await getKelasAmpu(dosen.id, ta.id) : [];
  return (
    <>
      <PageHeader boxed title="Kelas Saya" description={ta ? `Semester ${labelTahunAkademik(ta)}` : undefined} />
      {kelas.length === 0 ? (
        <EmptyState>Tidak ada kelas yang diampu pada semester ini.</EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto p-4 sm:p-5">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="bg-canvas text-[13px]">
                  <th scope="col" className="px-3 py-2.5">Mata kuliah</th>
                  <th scope="col" className="px-3 py-2.5">Jadwal</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Peserta</th>
                  <th scope="col" className="px-3 py-2.5">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {kelas.map((k) => (
                  <tr key={k.kelas_id}>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold">
                        {k.nama_mk} · Kelas {k.kelas}
                      </span>
                      <span className="block text-xs text-muted">
                        {k.kode_mk} · {k.sks} SKS · {k.prodi}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{k.jadwal ?? "-"}</td>
                    <td className="px-3 py-2.5 text-right">
                      {k.terisi}/{k.kuota}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link href={`/staf/kelas/${k.kelas_id}`} className="text-[13px] font-semibold text-brand hover:underline">
                        Peserta
                      </Link>
                    </td>
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
