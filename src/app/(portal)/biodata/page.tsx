import type { Metadata } from "next";
import Image from "next/image";
import { Card, CardHeader, EmptyState, InfoRow, MenuButtons, PageHeader } from "@/components/ui";
import { getDokumen, getMahasiswa, getOrangTua, type Dokumen } from "@/lib/data";
import { formatTanggalPanjang, formatUkuranBerkas, inisial, orDash } from "@/lib/format";
import { getMenu } from "@/lib/konfigurasi";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Biodata Mahasiswa" };

const STATUS_DOKUMEN: Record<Dokumen["status"], { label: string; className: string }> = {
  terverifikasi: { label: "Verifikasi", className: "text-success" },
  pending: { label: "Pending", className: "text-brand" },
  belum_ada: { label: "Belum Ada", className: "text-danger" },
};

export default async function BiodataPage() {
  const user = await requireUser("mahasiswa");
  const mhs = (await getMahasiswa(user.userId))!;
  const [ortu, dokumen, aksi] = await Promise.all([
    getOrangTua(mhs.id),
    getDokumen(mhs.id),
    getMenu("aksi_biodata"),
  ]);

  const tempatTanggalLahir =
    mhs.tempat_lahir || mhs.tanggal_lahir
      ? [mhs.tempat_lahir, mhs.tanggal_lahir ? formatTanggalPanjang(mhs.tanggal_lahir) : null].filter(Boolean).join(", ")
      : "-";
  const jenisKelamin = mhs.jenis_kelamin === "L" ? "Laki-laki" : mhs.jenis_kelamin === "P" ? "Perempuan" : "-";

  return (
    <>
      <PageHeader
        boxed
        title="Biodata Mahasiswa"
        description="Informasi profil pribadi, alamat, data keluarga, serta berkas pelengkap yang terdaftar."
        actions={aksi.length > 0 && <MenuButtons items={aksi} />}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Data Pribadi Utama" />
            <dl className="px-4 pb-4 sm:px-5">
              <InfoRow label="Nama Lengkap" value={mhs.nama} />
              <InfoRow label="NIM / ID" value={mhs.nim} />
              <InfoRow label="Tempat, Tanggal Lahir" value={tempatTanggalLahir} />
              <InfoRow label="Jenis Kelamin" value={jenisKelamin} />
              <InfoRow label="Agama" value={orDash(mhs.agama)} />
              <InfoRow label="Kewarganegaraan" value={orDash(mhs.kewarganegaraan)} />
              <InfoRow label="Golongan Darah" value={orDash(mhs.golongan_darah)} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Data Akademik" />
            <dl className="px-4 pb-4 sm:px-5">
              <InfoRow label="Program Studi" value={`${mhs.jenjang} ${mhs.prodi}`} />
              <InfoRow label="Fakultas" value={mhs.fakultas} />
              <InfoRow label="Angkatan" value={mhs.angkatan} />
              <InfoRow label="Semester" value={mhs.semester} />
              <InfoRow label="Dosen Pembimbing Akademik" value={orDash(mhs.dosen_pa)} />
              <InfoRow
                label="Status Akademik"
                value={<span className="font-semibold text-success capitalize">{mhs.status_akademik}</span>}
              />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Kontak & Alamat Domisili" />
            <dl className="px-4 pb-4 sm:px-5">
              <InfoRow label="No. Handphone" value={orDash(mhs.no_hp)} />
              <InfoRow label="Email Kampus" value={orDash(mhs.email_kampus)} />
              <InfoRow label="Alamat KTP" value={orDash(mhs.alamat_ktp)} />
              <InfoRow label="Alamat Domisili" value={orDash(mhs.alamat_domisili)} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Informasi Orang Tua / Wali" />
            <dl className="px-4 pb-4 sm:px-5">
              <InfoRow label="Nama Ayah Kandung" value={orDash(ortu?.nama_ayah)} />
              <InfoRow label="Nama Ibu Kandung" value={orDash(ortu?.nama_ibu)} />
              <InfoRow label="Pekerjaan Orang Tua" value={orDash(ortu?.pekerjaan)} />
              <InfoRow label="Kontak Darurat Orang Tua" value={orDash(ortu?.kontak_darurat)} />
            </dl>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="px-5 py-6 text-center">
            {mhs.foto ? (
              <Image
                src={mhs.foto}
                alt={`Foto ${mhs.nama}`}
                width={112}
                height={112}
                className="mx-auto size-28 rounded-full object-cover"
              />
            ) : (
              <div
                className="mx-auto grid size-28 place-items-center rounded-full bg-brand-soft text-3xl font-bold text-brand"
                aria-label="Foto profil belum tersedia"
              >
                {inisial(mhs.nama)}
              </div>
            )}
            <h2 className="mt-4 text-lg font-bold">{mhs.nama}</h2>
            <p className="text-sm text-muted">{mhs.nim}</p>
            <p className="mt-2 text-xs font-semibold text-brand">
              {mhs.jenjang} {mhs.prodi} · Angkatan {mhs.angkatan}
            </p>
            {!mhs.foto && <p className="mt-3 text-xs text-muted">Foto profil belum diunggah.</p>}
          </Card>

          <Card>
            <CardHeader title="Dokumen Terunggah" />
            <p className="px-4 text-[13px] text-muted sm:px-5">
              Berkas penting untuk kebutuhan verifikasi wisuda dan beasiswa.
            </p>
            <ul className="space-y-3 p-4 sm:p-5">
              {dokumen.length === 0 ? (
                <li>
                  <EmptyState>Belum ada dokumen yang diunggah.</EmptyState>
                </li>
              ) : (
                dokumen.map((doc) => {
                  const status = STATUS_DOKUMEN[doc.status];
                  return (
                    <li key={doc.id} className="flex items-center justify-between gap-3 rounded-lg bg-canvas px-3 py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{doc.jenis}</span>
                        <span className="block text-xs text-muted">{formatUkuranBerkas(doc.ukuran_kb)}</span>
                      </span>
                      <span className={`shrink-0 text-[11px] font-bold tracking-wide uppercase ${status.className}`}>
                        {status.label}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
