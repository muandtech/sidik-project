import type { Metadata } from "next";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { formatIp, getRingkasanStudi } from "@/lib/akademik";
import { getMahasiswa } from "@/lib/data";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Kartu Hasil Studi" };

// FR-AK-12 / SD-S2-11: KHS per semester, IPS, IPK. Hanya nilai terpublikasi (BR-SD-06).
export default async function KhsPage() {
  const user = await requireUser("mahasiswa");
  const mahasiswa = (await getMahasiswa(user.userId))!;
  const studi = await getRingkasanStudi(mahasiswa.id);

  return (
    <>
      <PageHeader boxed title="Kartu Hasil Studi" description="Nilai resmi yang telah dipublikasikan, per semester." />

      <section aria-label="Ringkasan studi" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["IPK", formatIp(studi.ipk)],
          ["SKS lulus", String(studi.sksLulus)],
          ["Semester ditempuh", String(studi.semester.length)],
          ["IPS terakhir", formatIp(studi.semester.at(-1)?.ips ?? null)],
        ].map(([label, nilai]) => (
          <div key={label} className="rounded-xl border border-line bg-white px-4 py-3.5">
            <p className="text-[11px] font-semibold tracking-wide text-gray-600 uppercase">{label}</p>
            <p className="mt-1 text-xl font-bold text-ink">{nilai}</p>
          </div>
        ))}
      </section>

      {studi.semester.length === 0 ? (
        <EmptyState>Belum ada nilai yang dipublikasikan.</EmptyState>
      ) : (
        <div className="space-y-5">
          {[...studi.semester].reverse().map((s) => (
            <Card key={s.tahun_akademik_id}>
              <CardHeader
                title={`${s.periode} ${s.tahun}`}
                action={
                  <span className="text-[13px] font-semibold text-ink">
                    IPS {formatIp(s.ips)} · {s.sks} SKS
                  </span>
                }
              />
              <div className="overflow-x-auto p-4 pt-1 sm:px-5">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="bg-canvas text-[13px]">
                      <th scope="col" className="px-3 py-2.5">Kode</th>
                      <th scope="col" className="px-3 py-2.5">Mata kuliah</th>
                      <th scope="col" className="px-3 py-2.5 text-right">SKS</th>
                      <th scope="col" className="px-3 py-2.5 text-center">Nilai</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Bobot × SKS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {s.nilai.map((n) => (
                      <tr key={n.kode_mk}>
                        <td className="px-3 py-2.5 text-xs text-muted">{n.kode_mk}</td>
                        <td className="px-3 py-2.5">{n.nama_mk}</td>
                        <td className="px-3 py-2.5 text-right">{n.sks}</td>
                        <td className={`px-3 py-2.5 text-center font-bold ${n.lulus ? "text-ink" : "text-danger"}`}>{n.nilai_huruf}</td>
                        <td className="px-3 py-2.5 text-right">{(Number(n.bobot) * n.sks).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
