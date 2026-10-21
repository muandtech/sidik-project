import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge, statusTagihan, statusTermin, type KodeStatus } from "@/components/keuangan/status";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { formatBulan, formatRupiah, formatTanggal, kunciBulan, lewatJatuhTempo } from "@/lib/format";
import { getPeriodeTagihan, getRekapTagihan, kodePeriode, type RekapBaris } from "@/lib/keuangan";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Rekap Pembayaran" };

const FILTER_STATUS = [
  { value: "", label: "Semua status" },
  { value: "lunas", label: "Sudah bayar" },
  { value: "belum", label: "Belum bayar" },
] as const;

function satu(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Status pembayaran baris pada bulan tertentu; null bila baris tidak punya kewajiban di bulan itu. */
function statusBulan(row: RekapBaris, bulan: string, now: Date): KodeStatus | null {
  if (row.termin.length === 0) {
    return kunciBulan(row.jatuh_tempo) === bulan || row.status === "lunas" ? statusTagihan(row, [], now) : null;
  }
  const termin = row.termin.find((t) => kunciBulan(t.jatuh_tempo) === bulan);
  return termin ? statusTermin(termin, now) : null;
}

export default async function RekapPembayaranPage({ searchParams }: PageProps<"/admin-keuangan">) {
  await requireUser("keuangan");
  const params = await searchParams;
  const daftarPeriode = await getPeriodeTagihan();
  const periode = daftarPeriode.find((p) => kodePeriode(p) === satu(params.periode)) ?? daftarPeriode[0];

  if (!periode) {
    return (
      <>
        <PageHeader boxed title="Rekap Pembayaran" />
        <EmptyState>Belum ada tagihan yang diterbitkan.</EmptyState>
      </>
    );
  }

  const now = new Date();
  const semua = await getRekapTagihan(periode);
  const daftarBulan = [...new Set(semua.flatMap((r) => r.termin.map((t) => kunciBulan(t.jatuh_tempo))))].sort();
  const bulan = daftarBulan.includes(satu(params.bulan)) ? satu(params.bulan) : "";
  const filterStatus = FILTER_STATUS.some((f) => f.value === satu(params.status)) ? satu(params.status) : "";
  const q = satu(params.q).trim().toLowerCase();

  const baris = semua.filter((row) => {
    if (q && !row.nama.toLowerCase().includes(q) && !row.nim.includes(q)) return false;
    if (!filterStatus) return true;
    const status = bulan ? statusBulan(row, bulan, now) : statusTagihan(row, row.termin, now);
    if (status === null) return false;
    return filterStatus === "lunas" ? status === "lunas" : status !== "lunas";
  });

  // Ringkasan dihitung dari seluruh tagihan periode, tidak terpengaruh filter.
  const total = semua.reduce((n, r) => n + Number(r.jumlah), 0);
  const diterima = semua.reduce((n, r) => n + Number(r.dibayar), 0);
  const tunggakan = semua.reduce((n, r) => {
    if (r.termin.length === 0) {
      return r.status !== "lunas" && lewatJatuhTempo(r.jatuh_tempo, now) ? n + Number(r.jumlah) - Number(r.dibayar) : n;
    }
    return n + r.termin.filter((t) => statusTermin(t, now) === "menunggak").reduce((m, t) => m + Number(t.jumlah), 0);
  }, 0);
  const jumlahLunas = semua.filter((r) => r.status === "lunas").length;

  const ringkasan = [
    { label: "Total Tagihan", value: formatRupiah(total), note: `${semua.length} mahasiswa`, noteClass: "text-brand" },
    { label: "Sudah Diterima", value: formatRupiah(diterima), note: `${jumlahLunas} lunas penuh`, noteClass: "text-success" },
    { label: "Belum Diterima", value: formatRupiah(total - diterima), note: "Termasuk cicilan belum jatuh tempo", noteClass: "text-muted" },
    { label: "Menunggak", value: formatRupiah(tunggakan), note: "Lewat jatuh tempo", noteClass: "text-danger" },
  ];

  const selectClass =
    "w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

  return (
    <>
      <PageHeader
        boxed
        title="Rekap Pembayaran"
        description={`Status pembayaran UKT per bulan · Semester ${periode.periode} ${periode.tahun_akademik}. Klik baris untuk ACC atau koreksi pembayaran.`}
      />

      <section aria-label="Ringkasan periode" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ringkasan.map((item) => (
          <div key={item.label} className="min-w-0 rounded-xl border border-line bg-white px-4 py-3.5">
            <p className="text-[11px] font-semibold tracking-wide text-gray-600 uppercase">{item.label}</p>
            <p className="mt-1 text-lg font-bold break-words text-ink sm:text-xl">{item.value}</p>
            <p className={`mt-0.5 text-xs ${item.noteClass}`}>{item.note}</p>
          </div>
        ))}
      </section>

      <Card>
        <form method="get" className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_1fr_1fr_1.4fr_auto]">
          <div>
            <label htmlFor="periode" className="mb-1 block text-xs font-medium text-muted">Periode</label>
            <select id="periode" name="periode" defaultValue={kodePeriode(periode)} className={selectClass}>
              {daftarPeriode.map((p) => (
                <option key={kodePeriode(p)} value={kodePeriode(p)}>
                  {p.periode} {p.tahun_akademik}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="bulan" className="mb-1 block text-xs font-medium text-muted">Bulan</label>
            <select id="bulan" name="bulan" defaultValue={bulan} className={selectClass}>
              <option value="">Semua bulan</option>
              {daftarBulan.map((b) => (
                <option key={b} value={b}>
                  {formatBulan(`${b}-01`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-xs font-medium text-muted">Status</label>
            <select id="status" name="status" defaultValue={filterStatus} className={selectClass}>
              {FILTER_STATUS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="q" className="mb-1 block text-xs font-medium text-muted">Cari mahasiswa</label>
            <input id="q" name="q" defaultValue={satu(params.q)} placeholder="Nama atau NIM" className={selectClass} />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-md border border-brand bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
            >
              Terapkan
            </button>
            <Link href="/admin-keuangan" className="rounded-md border border-line px-3 py-2 text-[13px] font-semibold hover:bg-canvas">
              Reset
            </Link>
          </div>
        </form>

        <CardHeader
          title={bulan ? `Pembayaran ${formatBulan(`${bulan}-01`)}` : "Pembayaran Per Bulan"}
          action={<span className="text-xs text-muted">{baris.length} dari {semua.length} mahasiswa</span>}
        />
        <div className="p-4 pt-2 sm:p-5 sm:pt-2">
          {baris.length === 0 ? (
            <EmptyState>Tidak ada mahasiswa yang sesuai filter.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="bg-canvas text-[13px] font-semibold text-ink">
                    <th scope="col" className="px-3 py-3">Mahasiswa</th>
                    <th scope="col" className="px-3 py-3">Skema</th>
                    {daftarBulan.map((b) => (
                      <th
                        key={b}
                        scope="col"
                        className={`px-2 py-3 text-center whitespace-nowrap ${b === bulan ? "bg-brand-muted" : ""}`}
                      >
                        {formatBulan(`${b}-01`, true)}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-3 text-right">Dibayar / Total</th>
                    <th scope="col" className="px-3 py-3">Status</th>
                    <th scope="col" className="px-3 py-3"><span className="sr-only">Aksi</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line border-b border-line">
                  {baris.map((row) => (
                    <tr key={row.id} className="hover:bg-canvas/60">
                      <td className="px-3 py-3">
                        <p className="font-semibold">{row.nama}</p>
                        <p className="text-xs text-muted">
                          {row.nim} · {row.jenjang} {row.prodi} · Sem. {row.semester_ke}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap text-gray-600">
                        {row.termin.length > 0 ? `Cicilan ${row.termin.length}×` : "Sekaligus"}
                      </td>
                      {row.termin.length > 0 ? (
                        daftarBulan.map((b) => {
                          const termin = row.termin.find((t) => kunciBulan(t.jatuh_tempo) === b);
                          return (
                            <td key={b} className={`px-2 py-3 text-center ${b === bulan ? "bg-brand-soft" : ""}`}>
                              {termin ? (
                                <span title={`Termin ${termin.termin_ke} · ${formatRupiah(termin.jumlah)} · jatuh tempo ${formatTanggal(termin.jatuh_tempo)}`}>
                                  <StatusBadge status={statusTermin(termin, now)} />
                                </span>
                              ) : (
                                <span className="text-muted">–</span>
                              )}
                            </td>
                          );
                        })
                      ) : (
                        daftarBulan.length > 0 && (
                          <td colSpan={daftarBulan.length} className="px-3 py-3 text-center text-xs text-muted">
                            {row.status === "lunas"
                              ? `Dibayar sekaligus ${formatTanggal(row.tanggal_bayar)}`
                              : `Bayar sekaligus · jatuh tempo ${formatTanggal(row.jatuh_tempo)}`}
                          </td>
                        )
                      )}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="font-semibold">{formatRupiah(row.dibayar)}</span>
                        <span className="block text-xs text-muted">dari {formatRupiah(row.jumlah)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={statusTagihan(row, row.termin, now)} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/admin-keuangan/tagihan/${row.id}`}
                          className="inline-flex items-center gap-0.5 font-semibold whitespace-nowrap text-brand hover:underline"
                          aria-label={`Kelola tagihan ${row.nama}`}
                        >
                          Kelola <ChevronRight className="size-4" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
            <span className="flex items-center gap-1.5"><StatusBadge status="lunas" /> sudah di-ACC</span>
            <span className="flex items-center gap-1.5"><StatusBadge status="belum" /> belum jatuh tempo</span>
            <span className="flex items-center gap-1.5"><StatusBadge status="menunggak" /> lewat jatuh tempo</span>
          </p>
        </div>
      </Card>
    </>
  );
}
