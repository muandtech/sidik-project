import type { Metadata } from "next";
import Link from "next/link";
import { setujuiMassal } from "@/app/actions/akademik";
import { AksiForm } from "@/components/aksi-form";
import { LABEL_STATUS_KRS } from "@/components/staf/ringkasan";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { formatIp, getTahunAkademikAktif, labelTahunAkademik } from "@/lib/akademik";
import { formatTanggal } from "@/lib/format";
import { getDosenByUser, getKrsBimbingan } from "@/lib/krs";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Persetujuan KRS" };

// FR-AK-08 / SD-S2-10: daftar KRS mahasiswa bimbingan; hanya bimbingan dosen yang login.
export default async function PerwalianPage() {
  const user = await requireUser(["dosen", "kaprodi"]);
  const [dosen, ta] = await Promise.all([getDosenByUser(user.userId), getTahunAkademikAktif()]);
  if (!dosen || !ta) {
    return (
      <>
        <PageHeader boxed title="Persetujuan KRS" />
        <EmptyState>{!dosen ? "Akun ini belum terhubung dengan data dosen." : "Semester aktif belum ditetapkan."}</EmptyState>
      </>
    );
  }
  const daftar = await getKrsBimbingan(dosen.id, ta.id);
  const menunggu = daftar.filter((k) => k.status === "diajukan");

  return (
    <>
      <PageHeader boxed title="Persetujuan KRS" description={`Mahasiswa bimbingan ${dosen.nama} · ${labelTahunAkademik(ta)}`} />

      <Card className="mb-5">
        <CardHeader title={`Menunggu Persetujuan (${menunggu.length})`} />
        <div className="p-4 pt-1 sm:px-5">
          {menunggu.length === 0 ? (
            <EmptyState>Tidak ada KRS yang menunggu persetujuan.</EmptyState>
          ) : (
            <AksiForm action={setujuiMassal} label="Setujui yang dicentang" labelProses="Menyetujui…">
              <ul className="divide-y divide-line">
                {menunggu.map((k) => (
                  <li key={k.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <input
                      type="checkbox"
                      name="krs_id"
                      value={k.id}
                      id={`krs-${k.id}`}
                      className="size-4 accent-brand"
                    />
                    <label htmlFor={`krs-${k.id}`} className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {k.nama} <span className="font-normal text-muted">· {k.nim}</span>
                      </span>
                      <span className="text-xs text-muted">
                        Smt {k.semester} · {k.total_sks}/{k.maks_sks} SKS · IPS acuan{" "}
                        {k.ips_acuan ? formatIp(Number(k.ips_acuan)) : "paket"} · diajukan {formatTanggal(k.diajukan_at)}
                      </span>
                    </label>
                    <Link href={`/staf/perwalian/${k.id}`} className="shrink-0 text-[13px] font-semibold text-brand hover:underline">
                      Tinjau
                    </Link>
                  </li>
                ))}
              </ul>
            </AksiForm>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Semua KRS Bimbingan" />
        <div className="overflow-x-auto p-4 pt-1 sm:px-5">
          {daftar.length === 0 ? (
            <EmptyState>Belum ada mahasiswa bimbingan yang membuat KRS.</EmptyState>
          ) : (
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="bg-canvas text-[13px]">
                  <th scope="col" className="px-3 py-2.5">Mahasiswa</th>
                  <th scope="col" className="px-3 py-2.5">Status</th>
                  <th scope="col" className="px-3 py-2.5 text-right">SKS</th>
                  <th scope="col" className="px-3 py-2.5">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {daftar.map((k) => (
                  <tr key={k.id}>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold">{k.nama}</span>
                      <span className="block text-xs text-muted">
                        {k.nim} · {k.prodi} · Smt {k.semester}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{LABEL_STATUS_KRS[k.status]}</td>
                    <td className="px-3 py-2.5 text-right">
                      {k.total_sks}/{k.maks_sks}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link href={`/staf/perwalian/${k.id}`} className="text-[13px] font-semibold text-brand hover:underline">
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </>
  );
}
