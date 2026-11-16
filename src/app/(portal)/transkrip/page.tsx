import type { Metadata } from "next";
import { PrintButton } from "@/components/print-button";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { formatIp, getRingkasanStudi } from "@/lib/akademik";
import { getMahasiswa } from "@/lib/data";
import { formatTanggal, tanggalHariIniWib } from "@/lib/format";
import { getPengaturan } from "@/lib/konfigurasi";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Transkrip Nilai Sementara" };

// FR-AK-13 / SD-S2-11: transkrip sementara siap cetak (Simpan sebagai PDF dari browser).
// Kode verifikasi dokumen dijadwalkan bersama layanan verifikasi publik pada fase berikutnya.
export default async function TranskripPage() {
  const user = await requireUser("mahasiswa");
  const mahasiswa = (await getMahasiswa(user.userId))!;
  const [studi, pengaturan] = await Promise.all([getRingkasanStudi(mahasiswa.id), getPengaturan()]);

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          boxed
          title="Transkrip Nilai Sementara"
          description={`Aturan mata kuliah yang diulang: nilai ${pengaturan.ipk_nilai_ulang === "terakhir" ? "terakhir" : "terbaik"} yang dipakai.`}
          actions={<PrintButton />}
        />
      </div>
      <Card className="p-5 sm:p-8 print:border-0 print:p-0">
        <header className="border-b border-line pb-4 text-center">
          <p className="text-lg font-bold uppercase">{pengaturan.nama_institusi}</p>
          <p className="text-sm font-semibold">TRANSKRIP NILAI SEMENTARA</p>
        </header>
        <dl className="grid gap-x-8 gap-y-1 py-4 text-sm sm:grid-cols-2">
          {[
            ["Nama", mahasiswa.nama],
            ["NIM", mahasiswa.nim],
            ["Program Studi", `${mahasiswa.jenjang} ${mahasiswa.prodi}`],
            ["Fakultas", mahasiswa.fakultas],
          ].map(([label, nilai]) => (
            <div key={label} className="flex gap-2">
              <dt className="w-32 shrink-0 text-muted">{label}</dt>
              <dd className="font-semibold">{nilai}</dd>
            </div>
          ))}
        </dl>
        {studi.transkrip.length === 0 ? (
          <EmptyState>Belum ada nilai yang dipublikasikan.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-y border-line text-[13px]">
                  <th scope="col" className="px-2 py-2">No</th>
                  <th scope="col" className="px-2 py-2">Kode</th>
                  <th scope="col" className="px-2 py-2">Mata kuliah</th>
                  <th scope="col" className="px-2 py-2 text-right">SKS</th>
                  <th scope="col" className="px-2 py-2 text-center">Nilai</th>
                  <th scope="col" className="px-2 py-2">Semester</th>
                </tr>
              </thead>
              <tbody>
                {studi.transkrip.map((n, i) => (
                  <tr key={n.kode_mk} className="border-b border-line/60">
                    <td className="px-2 py-1.5">{i + 1}</td>
                    <td className="px-2 py-1.5">{n.kode_mk}</td>
                    <td className="px-2 py-1.5">{n.nama_mk}</td>
                    <td className="px-2 py-1.5 text-right">{n.sks}</td>
                    <td className="px-2 py-1.5 text-center font-semibold">{n.nilai_huruf}</td>
                    <td className="px-2 py-1.5 text-xs">{n.periode} {n.tahun}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-sm">
          <div className="flex gap-2"><dt className="text-muted">SKS lulus</dt><dd className="font-bold">{studi.sksLulus}</dd></div>
          <div className="flex gap-2"><dt className="text-muted">IPK</dt><dd className="font-bold">{formatIp(studi.ipk)}</dd></div>
        </dl>
        <p className="mt-6 text-xs text-muted">
          Dicetak dari SIDIK pada {formatTanggal(tanggalHariIniWib())}. Transkrip sementara ini bukan dokumen resmi kelulusan.
        </p>
      </Card>
    </>
  );
}
