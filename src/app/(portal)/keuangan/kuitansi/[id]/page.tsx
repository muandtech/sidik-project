import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Kuitansi } from "@/components/kuitansi";
import { getMahasiswa, getTagihan } from "@/lib/data";
import { formatTanggal } from "@/lib/format";
import { getPengaturan } from "@/lib/konfigurasi";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Kuitansi Pembayaran" };

export default async function KuitansiPage({ params }: PageProps<"/keuangan/kuitansi/[id]">) {
  const { id } = await params;
  const user = await requireUser("mahasiswa");
  const [mhs, pengaturan] = await Promise.all([getMahasiswa(user.userId), getPengaturan()]);
  if (!mhs) notFound();
  const tagihan = Number.isInteger(Number(id)) ? await getTagihan(Number(id), mhs.id) : null;
  // Kuitansi hanya ada untuk tagihan milik mahasiswa ini yang sudah lunas.
  if (!tagihan || tagihan.status !== "lunas" || !tagihan.no_kuitansi) notFound();

  return (
    <Kuitansi
      pengaturan={pengaturan}
      jumlah={tagihan.dibayar}
      statusLabel="Lunas"
      rows={[
        ["No. Kuitansi", tagihan.no_kuitansi],
        ["No. Tagihan", tagihan.no_tagihan],
        ["Nama Mahasiswa", mhs.nama],
        ["NIM", mhs.nim],
        ["Program Studi", `${mhs.jenjang} ${mhs.prodi}`],
        ["Semester", `Semester ${tagihan.semester_ke} ${tagihan.periode} — T.A. ${tagihan.tahun_akademik}`],
        ["Jenis Pembayaran", tagihan.jenis_pembayaran],
        ["Metode Pembayaran", tagihan.metode_bayar ?? "-"],
        ["Tanggal Bayar", formatTanggal(tagihan.tanggal_bayar, true)],
      ]}
    />
  );
}
