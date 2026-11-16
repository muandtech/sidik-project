import type { Metadata } from "next";
import { CircleAlert, Lock } from "lucide-react";
import { ajukan, batalkanPengajuan, hapusKelas, tambahKelas } from "@/app/actions/akademik";
import { AksiForm } from "@/components/aksi-form";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { formatIp, labelTahunAkademik } from "@/lib/akademik";
import { formatTanggal } from "@/lib/format";
import { formatSlot, getIsiKrs, getKonteksKrs, getMahasiswaKrs, getPenawaran, jadwalBentrok, type StatusKrs } from "@/lib/krs";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Isi KRS" };

const STATUS_KRS: Record<StatusKrs, { label: string; kelas: string }> = {
  draf: { label: "Draf (belum diajukan)", kelas: "bg-gray-100 text-gray-700" },
  diajukan: { label: "Menunggu persetujuan Dosen PA", kelas: "bg-brand-soft text-brand" },
  disetujui: { label: "Disetujui", kelas: "bg-green-50 text-success" },
  ditolak: { label: "Ditolak — perbaiki lalu ajukan lagi", kelas: "bg-red-50 text-danger" },
};

// FR-AK-07 / SD-S2-09. Validasi di halaman ini hanya petunjuk; aturan sebenarnya diperiksa ulang di server.
export default async function IsiKrsPage() {
  const user = await requireUser("mahasiswa");
  const mhs = (await getMahasiswaKrs(user.userId))!;
  const konteks = await getKonteksKrs(mhs);
  const { ta, krs } = konteks;

  if (!ta) {
    return (
      <>
        <PageHeader boxed title="Isi KRS" />
        <EmptyState>{konteks.alasanTerkunci}</EmptyState>
      </>
    );
  }

  const [isi, penawaran] = await Promise.all([krs ? getIsiKrs(krs.id) : [], getPenawaran(mhs, ta)]);
  const totalSks = isi.reduce((n, k) => n + k.sks, 0);
  const status = krs?.status ?? "draf";
  const bisaUbah = !konteks.alasanTerkunci && (status === "draf" || status === "ditolak");
  const mkTerpilih = new Set(isi.map((k) => k.mata_kuliah_id));

  return (
    <>
      <PageHeader
        boxed
        title="Isi KRS"
        description={`Semester ${labelTahunAkademik(ta)} · Semester ${mhs.semester}${konteks.paket ? " (paket)" : ""}`}
      />

      <section aria-label="Ringkasan KRS" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Status KRS", krs ? STATUS_KRS[status].label : "Belum dibuat"],
          ["SKS dipilih", `${totalSks} / ${konteks.maksSks}`],
          ["IPS acuan", konteks.paket ? "Paket semester 1" : formatIp(konteks.ipsAcuan)],
          ["Periode isi KRS", ta.krs_mulai && ta.krs_selesai ? `${formatTanggal(ta.krs_mulai)} – ${formatTanggal(ta.krs_selesai)}` : "-"],
        ].map(([label, nilai]) => (
          <div key={label} className="min-w-0 rounded-xl border border-line bg-white px-4 py-3.5">
            <p className="text-[11px] font-semibold tracking-wide text-gray-600 uppercase">{label}</p>
            <p className="mt-1 text-[15px] font-bold break-words text-ink">{nilai}</p>
          </div>
        ))}
      </section>

      {konteks.alasanTerkunci && (
        <p role="status" className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden /> {konteks.alasanTerkunci}
        </p>
      )}
      {krs?.catatan_pa && (
        <p className="mb-5 flex items-start gap-2 rounded-lg border border-line bg-white px-4 py-3 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <span>
            <strong>Catatan Dosen PA:</strong> {krs.catatan_pa}
          </span>
        </p>
      )}

      <Card className="mb-5">
        <CardHeader
          title="KRS Saya"
          action={
            !konteks.alasanTerkunci && krs && status === "diajukan" ? (
              <AksiForm action={batalkanPengajuan} label="Batalkan pengajuan" variant="danger" />
            ) : undefined
          }
        />
        <div className="overflow-x-auto p-4 pt-1 sm:px-5">
          {isi.length === 0 ? (
            <EmptyState>Belum ada mata kuliah yang dipilih.</EmptyState>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="bg-canvas text-[13px]">
                  <th scope="col" className="px-3 py-2.5">Mata kuliah</th>
                  <th scope="col" className="px-3 py-2.5">Kelas</th>
                  <th scope="col" className="px-3 py-2.5">Jadwal</th>
                  <th scope="col" className="px-3 py-2.5 text-right">SKS</th>
                  {bisaUbah && <th scope="col" className="px-3 py-2.5"><span className="sr-only">Aksi</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {isi.map((k) => (
                  <tr key={k.kelas_id}>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold">{k.nama_mk}</p>
                      <p className="text-xs text-muted">{k.kode_mk} · {k.dosen ?? "Dosen belum ditetapkan"}</p>
                    </td>
                    <td className="px-3 py-2.5">{k.kelas}</td>
                    <td className="px-3 py-2.5 text-xs">{k.jadwal.map(formatSlot).join("; ") || "-"}</td>
                    <td className="px-3 py-2.5 text-right">{k.sks}</td>
                    {bisaUbah && (
                      <td className="px-3 py-2.5 text-right">
                        <AksiForm action={hapusKelas} hidden={{ kelas_id: k.kelas_id }} label="Hapus" variant="danger" />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {bisaUbah && isi.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <p className="text-sm text-muted">
                Total <strong className="text-ink">{totalSks} SKS</strong> dari batas {konteks.maksSks} SKS. Kuota kelas dikunci saat
                KRS diajukan.
              </p>
              <AksiForm action={ajukan} label="Ajukan ke Dosen PA" labelProses="Mengajukan…" />
            </div>
          )}
        </div>
      </Card>

      {bisaUbah && (
        <Card>
          <CardHeader title={konteks.paket ? "Paket Semester 1" : "Penawaran Kelas"} />
          <div className="overflow-x-auto p-4 pt-1 sm:px-5">
            {penawaran.length === 0 ? (
              <EmptyState>Belum ada kelas yang ditawarkan untuk kurikulum Anda.</EmptyState>
            ) : (
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="bg-canvas text-[13px]">
                    <th scope="col" className="px-3 py-2.5">Smt</th>
                    <th scope="col" className="px-3 py-2.5">Mata kuliah</th>
                    <th scope="col" className="px-3 py-2.5">Kelas · Jadwal</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Kuota</th>
                    <th scope="col" className="px-3 py-2.5"><span className="sr-only">Aksi</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {penawaran
                    .filter((p) => !isi.some((k) => k.kelas_id === p.kelas_id))
                    .map((p) => {
                      const bentrok = isi.find((k) => jadwalBentrok(k.jadwal, p.jadwal));
                      const kendala = p.sudahLulus
                        ? "Sudah lulus"
                        : mkTerpilih.has(p.mata_kuliah_id)
                          ? "Sudah dipilih di kelas lain"
                          : p.prasyaratKurang.length > 0
                            ? `Prasyarat: ${p.prasyaratKurang.join(", ")}`
                            : p.terisi >= p.kuota
                              ? "Kelas penuh"
                              : bentrok
                                ? `Bentrok dengan ${bentrok.kode_mk}`
                                : totalSks + p.sks > konteks.maksSks
                                  ? "Melebihi batas SKS"
                                  : null;
                      return (
                        <tr key={p.kelas_id} className={kendala ? "text-gray-500" : undefined}>
                          <td className="px-3 py-2.5">{p.semester}</td>
                          <td className="px-3 py-2.5">
                            <p className="font-semibold text-ink">{p.nama_mk}</p>
                            <p className="text-xs">
                              {p.kode_mk} · {p.sks} SKS · {p.jenis === "wajib" ? "Wajib" : "Pilihan"}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            <span className="font-semibold">Kelas {p.kelas}</span> · {p.jadwal.map(formatSlot).join("; ") || "-"}
                            <span className="block">{p.dosen ?? "-"}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            {p.terisi}/{p.kuota}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {kendala ? (
                              <span className="text-xs">{kendala}</span>
                            ) : (
                              <AksiForm action={tambahKelas} hidden={{ kelas_id: p.kelas_id }} label="Ambil" variant="outline" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
