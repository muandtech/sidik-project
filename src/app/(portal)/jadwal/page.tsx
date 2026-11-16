import type { Metadata } from "next";
import { JadwalPerHari } from "@/components/akademik/tabel-jadwal";
import { EmptyState, PageHeader } from "@/components/ui";
import { getJadwalMahasiswa, getTahunAkademikAktif, labelTahunAkademik } from "@/lib/akademik";
import { getMahasiswa } from "@/lib/data";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Jadwal Kuliah" };

// FR-AK-11: jadwal mingguan dari KRS yang sudah disetujui Dosen PA.
export default async function JadwalPage() {
  const user = await requireUser("mahasiswa");
  const mahasiswa = (await getMahasiswa(user.userId))!;
  const ta = await getTahunAkademikAktif();
  if (!ta) {
    return (
      <>
        <PageHeader boxed title="Jadwal Kuliah" />
        <EmptyState>Semester aktif belum ditetapkan.</EmptyState>
      </>
    );
  }
  const [disetujui, menunggu] = await Promise.all([
    getJadwalMahasiswa(mahasiswa.id, ta.id),
    getJadwalMahasiswa(mahasiswa.id, ta.id, ["diajukan"]),
  ]);
  return (
    <>
      <PageHeader boxed title="Jadwal Kuliah" description={`Semester ${labelTahunAkademik(ta)} · dari KRS yang disetujui`} />
      {menunggu.length > 0 && (
        <p role="status" className="mb-4 rounded-lg border border-line bg-brand-soft px-4 py-3 text-sm">
          KRS Anda masih menunggu persetujuan Dosen PA. Jadwal tampil setelah KRS disetujui.
        </p>
      )}
      <JadwalPerHari jadwal={disetujui} kosong="Belum ada jadwal. Isi KRS dan tunggu persetujuan Dosen PA." />
    </>
  );
}
