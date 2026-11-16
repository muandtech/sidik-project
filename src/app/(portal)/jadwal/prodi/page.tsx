import type { Metadata } from "next";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getJadwalProdi, getTahunAkademikAktif, labelTahunAkademik, namaHari } from "@/lib/akademik";
import { getMahasiswa } from "@/lib/data";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Jadwal Kuliah Prodi" };

// Seluruh kelas yang ditawarkan prodi mahasiswa pada semester aktif.
export default async function JadwalProdiPage() {
  const user = await requireUser("mahasiswa");
  const mahasiswa = (await getMahasiswa(user.userId))!;
  const ta = await getTahunAkademikAktif();
  const jadwal = ta ? await getJadwalProdi(mahasiswa.prodi_id, ta.id) : [];
  return (
    <>
      <PageHeader
        boxed
        title="Jadwal Kuliah Prodi"
        description={`${mahasiswa.jenjang} ${mahasiswa.prodi}${ta ? ` · Semester ${labelTahunAkademik(ta)}` : ""}`}
      />
      {jadwal.length === 0 ? (
        <EmptyState>Belum ada kelas yang ditawarkan.</EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto p-4 sm:p-5">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="bg-canvas text-[13px]">
                  <th scope="col" className="px-3 py-2.5">Smt</th>
                  <th scope="col" className="px-3 py-2.5">Mata kuliah</th>
                  <th scope="col" className="px-3 py-2.5">Kelas</th>
                  <th scope="col" className="px-3 py-2.5">Waktu</th>
                  <th scope="col" className="px-3 py-2.5">Ruang</th>
                  <th scope="col" className="px-3 py-2.5">Dosen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {jadwal.map((j) => (
                  <tr key={j.jadwal_id}>
                    <td className="px-3 py-2">{j.semester}</td>
                    <td className="px-3 py-2">
                      <span className="font-semibold">{j.nama_mk}</span>
                      <span className="block text-xs text-muted">{j.kode_mk} · {j.sks} SKS</span>
                    </td>
                    <td className="px-3 py-2">{j.kelas}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {namaHari(j.hari)} {j.jam_mulai.slice(0, 5)}–{j.jam_selesai.slice(0, 5)}
                    </td>
                    <td className="px-3 py-2">{j.ruang ?? "-"}</td>
                    <td className="px-3 py-2 text-xs">{j.dosen ?? "-"}</td>
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
