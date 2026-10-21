import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, CardHeader, EmptyState, MenuButtons, PageHeader } from "@/components/ui";
import { StatusBadge, statusTermin } from "@/components/keuangan/status";
import { getMahasiswa, getTagihanList, getTerminMahasiswa, type Tagihan, type Termin } from "@/lib/data";
import { formatBulan, formatRupiah, formatTanggal, lewatJatuhTempo, parseDbDate } from "@/lib/format";
import { getFiturHref, getMenu } from "@/lib/konfigurasi";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Layanan Keuangan" };

const STATUS_TAGIHAN: Record<Tagihan["status"], { label: string; className: string }> = {
  lunas: { label: "Lunas", className: "text-success" },
  cicilan: { label: "Cicilan", className: "text-brand" },
  belum_lunas: { label: "Belum Lunas", className: "text-danger" },
};

function labelSemester(t: Tagihan) {
  return `Sem. ${t.semester_ke} ${t.periode}`;
}

export default async function KeuanganPage() {
  const user = await requireUser("mahasiswa");
  const mhs = (await getMahasiswa(user.userId))!;
  const [tagihan, termin, aksi, bayarHref] = await Promise.all([
    getTagihanList(mhs.id),
    getTerminMahasiswa(mhs.id),
    getMenu("aksi_keuangan"),
    getFiturHref("konfirmasi-pembayaran"),
  ]);
  const berjalan = tagihan[0];
  const terminDari = (t: Tagihan) => termin.filter((tt) => tt.tagihan_id === t.id);
  const bercicilan = tagihan.filter((t) => t.jumlah_termin > 0);

  return (
    <>
      <PageHeader
        boxed
        title="Layanan Keuangan"
        description="Daftar rincian tagihan, riwayat transaksi pembayaran, dan panduan virtual account."
        actions={aksi.length > 0 && <MenuButtons items={aksi} />}
      />

      {berjalan && <RingkasanTagihan tagihan={berjalan} termin={terminDari(berjalan)} />}

      {bercicilan.map((t) => (
        <CicilanPerBulan key={t.id} tagihan={t} termin={terminDari(t)} bayarHref={bayarHref} />
      ))}

      <Card>
        <CardHeader title="Rincian Tagihan Per Semester" />
        <div className="p-4 pt-2 sm:p-5 sm:pt-2">
          {tagihan.length === 0 ? (
            <EmptyState>Belum ada tagihan yang diterbitkan.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="bg-canvas text-[13px] font-semibold text-ink">
                    <th scope="col" className="px-3 py-3">Semester</th>
                    <th scope="col" className="px-3 py-3">Jenis Pembayaran</th>
                    <th scope="col" className="px-3 py-3">Tahun Akademik</th>
                    <th scope="col" className="px-3 py-3 text-right">Jumlah</th>
                    <th scope="col" className="px-3 py-3">Tanggal Bayar</th>
                    <th scope="col" className="px-3 py-3">Status</th>
                    <th scope="col" className="px-3 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line border-b border-line">
                  {tagihan.map((t) => {
                    const status = STATUS_TAGIHAN[t.status];
                    return (
                      <tr key={t.id}>
                        <td className="px-3 py-3 font-semibold whitespace-nowrap">{labelSemester(t)}</td>
                        <td className="px-3 py-3 text-gray-600">{t.jenis_pembayaran}</td>
                        <td className="px-3 py-3 text-gray-600">{t.tahun_akademik}</td>
                        <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">{formatRupiah(t.jumlah)}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-600">{formatTanggal(t.tanggal_bayar)}</td>
                        <td className={`px-3 py-3 text-[11px] font-bold tracking-wide uppercase ${status.className}`}>
                          {status.label}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {t.jumlah_termin > 0 ? (
                            <a href={`#cicilan-${t.id}`} className="font-semibold text-brand hover:underline">
                              Lihat Cicilan
                            </a>
                          ) : t.status === "lunas" ? (
                            <Link
                              href={`/keuangan/kuitansi/${t.id}`}
                              className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                              aria-label={`Unduh kuitansi ${labelSemester(t)}`}
                            >
                              Unduh <FileText className="size-3.5" aria-hidden />
                            </Link>
                          ) : bayarHref ? (
                            <Link href={bayarHref} className="font-semibold text-brand hover:underline">
                              Bayar
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

function CicilanPerBulan({
  tagihan,
  termin,
  bayarHref,
}: {
  tagihan: Tagihan;
  termin: Termin[];
  bayarHref: string | null;
}) {
  const now = new Date();
  return (
    <Card className="mb-5 scroll-mt-4">
      <div id={`cicilan-${tagihan.id}`}>
        <CardHeader title={`Cicilan Per Bulan — ${labelSemester(tagihan)} ${tagihan.tahun_akademik}`} />
      </div>
      <p className="-mt-1 px-4 text-xs text-muted sm:px-5">
        {tagihan.jenis_pembayaran} dibayar {termin.length}× per bulan. Status berubah menjadi Lunas setelah
        diverifikasi Bagian Keuangan.
      </p>
      <div className="p-4 pt-3 sm:p-5 sm:pt-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="bg-canvas text-[13px] font-semibold text-ink">
                <th scope="col" className="px-3 py-3">Bulan</th>
                <th scope="col" className="px-3 py-3">Jatuh Tempo</th>
                <th scope="col" className="px-3 py-3 text-right">Jumlah</th>
                <th scope="col" className="px-3 py-3">Tanggal Bayar</th>
                <th scope="col" className="px-3 py-3">Status</th>
                <th scope="col" className="px-3 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-b border-line">
              {termin.map((tt) => (
                <tr key={tt.id}>
                  <td className="px-3 py-3 font-semibold whitespace-nowrap">
                    {formatBulan(tt.jatuh_tempo)}
                    <span className="block text-xs font-normal text-muted">Termin {tt.termin_ke}</span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-gray-600">{formatTanggal(tt.jatuh_tempo)}</td>
                  <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">{formatRupiah(tt.jumlah)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-gray-600">{formatTanggal(tt.tanggal_bayar)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={statusTermin(tt, now)} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    {tt.status === "lunas" ? (
                      <Link
                        href={`/keuangan/kuitansi/termin/${tt.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                        aria-label={`Unduh kuitansi cicilan ${formatBulan(tt.jatuh_tempo)}`}
                      >
                        Unduh <FileText className="size-3.5" aria-hidden />
                      </Link>
                    ) : bayarHref ? (
                      <Link href={bayarHref} className="font-semibold text-brand hover:underline">
                        Bayar
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

function RingkasanTagihan({ tagihan, termin }: { tagihan: Tagihan; termin: Termin[] }) {
  const jumlah = Number(tagihan.jumlah);
  const dibayar = Number(tagihan.dibayar);
  const sisa = Math.max(jumlah - dibayar, 0);
  const status = STATUS_TAGIHAN[tagihan.status];

  let keteranganSisa: { label: string; className: string };
  if (sisa === 0) {
    const tepatWaktu =
      tagihan.tanggal_bayar && parseDbDate(tagihan.tanggal_bayar) <= parseDbDate(`${tagihan.jatuh_tempo} 23:59:59`);
    keteranganSisa = { label: tepatWaktu ? "Tepat Waktu" : "Lunas", className: "text-success" };
  } else {
    // Tagihan bercicilan: tampilkan termin terdekat yang belum dibayar.
    const berikutnya = termin.find((tt) => tt.status !== "lunas");
    const jatuhTempo = berikutnya?.jatuh_tempo ?? tagihan.jatuh_tempo;
    const lewat = lewatJatuhTempo(jatuhTempo);
    keteranganSisa = {
      label: berikutnya
        ? `Cicilan ${formatBulan(jatuhTempo)} ${lewat ? "lewat jatuh tempo" : "jatuh tempo"} ${formatTanggal(jatuhTempo)}`
        : `${lewat ? "Lewat jatuh tempo" : "Jatuh tempo"} ${formatTanggal(jatuhTempo)}`,
      className: lewat ? "text-danger" : "text-brand",
    };
  }

  const items = [
    { label: "Total Tagihan Berjalan", value: jumlah, note: `Semester ${tagihan.semester_ke} ${tagihan.periode}`, noteClass: "text-brand" },
    { label: "Sudah Dibayar", value: dibayar, note: status.label, noteClass: status.className },
    { label: "Sisa Wajib Bayar", value: sisa, note: keteranganSisa.label, noteClass: keteranganSisa.className },
  ];

  return (
    <section
      aria-label="Ringkasan tagihan semester berjalan"
      className="mb-5 grid gap-5 rounded-xl bg-white px-4 py-5 sm:grid-cols-3 sm:px-5"
    >
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-[11px] font-semibold tracking-wide text-gray-600 uppercase">{item.label}</p>
          <p className="mt-1.5 text-2xl font-bold text-ink sm:text-[28px]">{formatRupiah(item.value)}</p>
          <p className={`mt-1.5 text-[11px] font-bold tracking-wide uppercase ${item.noteClass}`}>{item.note}</p>
        </div>
      ))}
    </section>
  );
}
