import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Kuitansi } from "@/components/kuitansi";
import { getMahasiswa, getTerminMilik } from "@/lib/data";
import { formatBulan, formatTanggal } from "@/lib/format";
import { getPengaturan } from "@/lib/konfigurasi";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Kuitansi Cicilan" };

export default async function KuitansiTerminPage({ params }: PageProps<"/keuangan/kuitansi/termin/[id]">) {
  const { id } = await params;
  const user = await requireUser("mahasiswa");
  const [mhs, pengaturan] = await Promise.all([getMahasiswa(user.userId), getPengaturan()]);
  if (!mhs) notFound();
  const data = Number.isInteger(Number(id)) ? await getTerminMilik(Number(id), mhs.id) : null;
  // Kuitansi hanya ada untuk termin milik mahasiswa ini yang sudah di-ACC lunas.
  if (!data || data.termin.status !== "lunas" || !data.termin.no_kuitansi) notFound();
  const { termin, tagihan } = data;
  const noKuitansi = data.termin.no_kuitansi;

  return (
    <Kuitansi
      pengaturan={pengaturan}
      jumlah={termin.jumlah}
      statusLabel={`Cicilan termin ${termin.termin_ke} dari ${tagihan.jumlah_termin} lunas`}
      rows={[
        ["No. Kuitansi", noKuitansi],
        ["No. Tagihan", tagihan.no_tagihan],
        ["Nama Mahasiswa", mhs.nama],
        ["NIM", mhs.nim],
        ["Program Studi", `${mhs.jenjang} ${mhs.prodi}`],
        ["Semester", `Semester ${tagihan.semester_ke} ${tagihan.periode} — T.A. ${tagihan.tahun_akademik}`],
        ["Jenis Pembayaran", `${tagihan.jenis_pembayaran} — Cicilan ${formatBulan(termin.jatuh_tempo)}`],
        ["Metode Pembayaran", termin.metode_bayar ?? "-"],
        ["Tanggal Bayar", formatTanggal(termin.tanggal_bayar, true)],
      ]}
    />
  );
}
