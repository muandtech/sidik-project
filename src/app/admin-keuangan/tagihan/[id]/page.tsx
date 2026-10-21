import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  AccForm,
  BatalForm,
  GabungCicilanForm,
  PecahCicilanForm,
} from "@/components/keuangan/aksi-tagihan";
import { StatusBadge, statusTagihan, statusTermin } from "@/components/keuangan/status";
import { ButtonLink, Card, CardHeader, EmptyState } from "@/components/ui";
import { formatBulan, formatRupiah, formatTanggal, tanggalHariIniWib } from "@/lib/format";
import { getRiwayatTagihan, getTagihanMahasiswa, getTerminTagihan, kodePeriode } from "@/lib/keuangan";
import { getPengaturan } from "@/lib/konfigurasi";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Kelola Tagihan" };

const LABEL_AKSI: Record<string, string> = {
  tagihan_verifikasi: "ACC",
  tagihan_koreksi: "Koreksi",
  tagihan_cicilan: "Cicilan",
};

export default async function KelolaTagihanPage({ params }: PageProps<"/admin-keuangan/tagihan/[id]">) {
  await requireUser("keuangan");
  const { id } = await params;
  const tagihan = Number.isInteger(Number(id)) ? await getTagihanMahasiswa(Number(id)) : null;
  if (!tagihan) notFound();

  const [termin, riwayat, pengaturan] = await Promise.all([
    getTerminTagihan(tagihan.id),
    getRiwayatTagihan(tagihan.no_tagihan),
    getPengaturan(),
  ]);
  const now = new Date();
  const hariIni = tanggalHariIniWib(now);
  const metodeBayar = (pengaturan.metode_bayar_manual ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  const maksTermin = Number(pengaturan.cicilan_maks_termin) || 0;
  const sisa = Math.max(Number(tagihan.jumlah) - Number(tagihan.dibayar), 0);
  const kembaliHref = `/admin-keuangan?periode=${encodeURIComponent(kodePeriode(tagihan))}`;

  const identitas = [
    ["Mahasiswa", `${tagihan.nama} (${tagihan.nim})`],
    ["Program Studi", `${tagihan.jenjang} ${tagihan.prodi} · Semester ${tagihan.semester}`],
    ["No. Tagihan", tagihan.no_tagihan],
    ["Tagihan", `${tagihan.jenis_pembayaran} · Semester ${tagihan.semester_ke} ${tagihan.periode} ${tagihan.tahun_akademik}`],
  ];
  const angka = [
    { label: "Total Tagihan", value: formatRupiah(tagihan.jumlah) },
    { label: "Sudah Dibayar", value: formatRupiah(tagihan.dibayar) },
    { label: "Sisa", value: formatRupiah(sisa) },
  ];

  return (
    <>
      <div className="mb-4">
        <ButtonLink href={kembaliHref} variant="plain">
          <ArrowLeft className="size-4" aria-hidden /> Kembali ke Rekap
        </ButtonLink>
      </div>

      <section className="mb-5 rounded-xl border border-line bg-white px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Kelola Tagihan</h1>
          <StatusBadge status={statusTagihan(tagihan, termin, now)} />
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {identitas.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[120px_1fr] gap-2">
              <dt className="text-muted">{label}</dt>
              <dd className="font-medium break-words">{value}</dd>
            </div>
          ))}
        </dl>
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
          {angka.map((item) => (
            <div key={item.label}>
              <dt className="text-[11px] font-semibold tracking-wide text-gray-600 uppercase">{item.label}</dt>
              <dd className="mt-1 text-lg font-bold sm:text-2xl">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {termin.length > 0 ? (
        <Card className="mb-5">
          <CardHeader title={`Cicilan Per Bulan (${termin.length} termin)`} />
          <div className="p-4 pt-2 sm:p-5 sm:pt-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="bg-canvas text-[13px] font-semibold">
                    <th scope="col" className="px-3 py-3">Bulan</th>
                    <th scope="col" className="px-3 py-3 text-right">Jumlah</th>
                    <th scope="col" className="px-3 py-3">Status</th>
                    <th scope="col" className="px-3 py-3">Pembayaran / Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line border-b border-line">
                  {termin.map((t) => {
                    const label = `Termin ${t.termin_ke} (${formatBulan(t.jatuh_tempo)})`;
                    return (
                      <tr key={t.id} className="align-top">
                        <td className="px-3 py-3">
                          <p className="font-semibold">{formatBulan(t.jatuh_tempo)}</p>
                          <p className="text-xs text-muted">
                            Termin {t.termin_ke} · jatuh tempo {formatTanggal(t.jatuh_tempo)}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">{formatRupiah(t.jumlah)}</td>
                        <td className="px-3 py-3">
                          <StatusBadge status={statusTermin(t, now)} />
                        </td>
                        <td className="px-3 py-3">
                          {t.status === "lunas" ? (
                            <div className="space-y-1.5">
                              <p className="text-[13px]">
                                Dibayar {formatTanggal(t.tanggal_bayar)} · {t.metode_bayar}
                                <span className="block text-xs text-muted">
                                  {t.no_kuitansi} · di-ACC {t.diverifikator ?? "-"} {formatTanggal(t.diverifikasi_at, true)}
                                  {t.catatan && ` · ${t.catatan}`}
                                </span>
                              </p>
                              <BatalForm target={{ jenis: "termin", id: t.id }} label={label} />
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <AccForm target={{ jenis: "termin", id: t.id }} metodeBayar={metodeBayar} hariIni={hariIni} label={label} />
                              {t.catatan && <p className="text-xs text-muted">{t.catatan}</p>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {termin.every((t) => t.status !== "lunas") && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2 text-xs text-muted">
                  Belum ada termin yang dibayar, sehingga cicilan masih bisa digabung kembali menjadi bayar sekaligus.
                </p>
                <GabungCicilanForm tagihanId={tagihan.id} />
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="mb-5">
          <CardHeader title="Pembayaran Sekaligus" />
          <div className="space-y-5 p-4 pt-2 sm:p-5 sm:pt-2">
            {tagihan.status === "lunas" ? (
              <div className="space-y-2">
                <p className="text-sm">
                  Lunas {formatTanggal(tagihan.tanggal_bayar)} · {tagihan.metode_bayar ?? "-"}
                  {tagihan.no_kuitansi && <span className="text-muted"> · {tagihan.no_kuitansi}</span>}
                </p>
                <BatalForm target={{ jenis: "tagihan", id: tagihan.id }} label="pembayaran ini" />
              </div>
            ) : (
              <>
                <div>
                  <p className="mb-2 text-sm">
                    ACC bila mahasiswa sudah membayar penuh {formatRupiah(sisa)} (jatuh tempo{" "}
                    {formatTanggal(tagihan.jatuh_tempo)}).
                  </p>
                  <AccForm target={{ jenis: "tagihan", id: tagihan.id }} metodeBayar={metodeBayar} hariIni={hariIni} label="Tagihan" />
                </div>
                {Number(tagihan.dibayar) === 0 && (
                  <div className="border-t border-line pt-4">
                    <h3 className="text-sm font-bold">Cicil per bulan</h3>
                    <p className="mt-1 mb-3 text-xs text-muted">
                      Tagihan dibagi rata per bulan; sisa pembulatan masuk ke termin terakhir. Setiap termin di-ACC terpisah.
                    </p>
                    <PecahCicilanForm tagihanId={tagihan.id} maksTermin={maksTermin} defaultMulai={tagihan.jatuh_tempo} />
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Riwayat Perubahan" />
        <div className="p-4 pt-2 sm:p-5 sm:pt-2">
          {riwayat.length === 0 ? (
            <EmptyState>Belum ada perubahan yang tercatat.</EmptyState>
          ) : (
            <ol className="divide-y divide-line text-sm">
              {riwayat.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5">
                  <span className="w-16 shrink-0 text-[11px] font-bold tracking-wide text-brand uppercase">
                    {LABEL_AKSI[r.aksi] ?? r.aksi}
                  </span>
                  <span className="min-w-0 flex-1">{r.uraian}</span>
                  <span className="text-xs text-muted">
                    {r.oleh ?? "-"} · {formatTanggal(r.created_at, true)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Card>
    </>
  );
}
