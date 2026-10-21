import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  CircleAlert,
  Download,
  FileText,
  Info,
  PencilLine,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardHeader, CardLink, EmptyState, MenuButtons, PageHeader } from "@/components/ui";
import {
  getAktivitas,
  getJadwalHari,
  getMahasiswa,
  getNotifikasiBelumDibaca,
  getPengumumanList,
  type Aktivitas,
  type Notifikasi,
} from "@/lib/data";
import { formatJam, formatWaktuRelatif, hariIniWib, orDash, sapaan } from "@/lib/format";
import { getFiturHref, getMenu } from "@/lib/konfigurasi";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

const TINDAKAN_ICON: Record<Notifikasi["tipe"], LucideIcon> = {
  peringatan: CircleAlert,
  dokumen: FileText,
  jadwal: CalendarDays,
  info: Info,
};

const AKTIVITAS_ICON: Record<Aktivitas["ikon"], LucideIcon> = {
  edit: PencilLine,
  unduh: Download,
  bayar: Wallet,
  info: Info,
};

export default async function DashboardPage() {
  const user = await requireUser("mahasiswa");
  const mahasiswa = (await getMahasiswa(user.userId))!;
  const now = new Date();

  const [jadwal, tindakan, pengumuman, aktivitas, aksiHeader, aksiCepat, jadwalHref, pengumumanHref] =
    await Promise.all([
      getJadwalHari(mahasiswa.id, hariIniWib(now)),
      getNotifikasiBelumDibaca(user.userId, 3),
      getPengumumanList(user.role, { limit: 3 }),
      getAktivitas(user.userId, 3),
      getMenu("aksi_dashboard"),
      getMenu("aksi_cepat"),
      getFiturHref("jadwal-kuliah"),
      getFiturHref("pengumuman"),
    ]);

  const tanggalHariIni = now.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const namaPanggilan = mahasiswa.nama.split(" ")[0];

  const identitas = [
    { label: "NIM", value: mahasiswa.nim, sub: mahasiswa.nama },
    {
      label: "Program Studi",
      value: mahasiswa.prodi,
      sub: `${mahasiswa.jenjang} · ${mahasiswa.fakultas}`,
    },
    {
      label: "Semester",
      value: String(mahasiswa.semester),
      sub: `Angkatan ${mahasiswa.angkatan} · ${mahasiswa.status_akademik === "aktif" ? "Aktif" : mahasiswa.status_akademik}`,
    },
    { label: "Dosen PA", value: orDash(mahasiswa.dosen_pa), sub: "Pembimbing Akademik" },
  ];

  return (
    <>
      <PageHeader
        title="Student Command Center"
        description={`${sapaan(now)}, ${namaPanggilan}. Dashboard terintegrasi untuk pengelolaan akademik dan administratif.`}
        actions={aksiHeader.length > 0 && <MenuButtons items={aksiHeader} />}
      />

      <section aria-label="Ringkasan identitas" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {identitas.map((item) => (
          <div key={item.label} className="min-w-0 rounded-xl border border-line bg-white px-4 py-3.5">
            <p className="text-xs font-medium text-muted">{item.label}</p>
            <p className="mt-1 text-lg leading-snug font-bold break-words text-ink sm:text-xl">
              {item.value}
            </p>
            <p className="mt-0.5 text-xs break-words text-brand">
              {item.sub}
            </p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <Card className="border-gray-400/70">
            <CardHeader
              title="Agenda Hari Ini"
              action={jadwalHref && <CardLink href={jadwalHref}>Lihat Semua</CardLink>}
            />
            <p className="-mt-1 px-4 text-xs text-muted sm:px-5">{tanggalHariIni}</p>
            <div className="space-y-2 p-4 sm:px-5">
              {jadwal.length === 0 ? (
                <EmptyState>Tidak ada jadwal kuliah hari ini.</EmptyState>
              ) : (
                jadwal.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-md border border-line bg-canvas/80 px-3 py-2.5 sm:gap-6"
                  >
                    <span className="w-12 shrink-0 text-sm font-semibold text-gray-600">{formatJam(item.jam_mulai)}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-ink">{item.nama_mk}</p>
                      <p className="truncate text-xs text-muted">
                        {item.ruang} • {orDash(item.dosen)} • s.d. {formatJam(item.jam_selesai)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {aksiCepat.length > 0 && (
            <Card>
              <CardHeader title="Quick Actions" />
              <div className="flex flex-wrap gap-2 px-4 pt-1 pb-5 sm:px-5">
                <MenuButtons items={aksiCepat} />
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Tindakan Penting" />
            <div className="space-y-2 px-4 pb-4 sm:px-5">
              {tindakan.length === 0 ? (
                <EmptyState>Tidak ada tindakan yang perlu dilakukan.</EmptyState>
              ) : (
                tindakan.map((item) => {
                  const Icon = TINDAKAN_ICON[item.tipe];
                  const content = (
                    <>
                      <Icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold text-ink">{item.judul}</span>
                        <span className="block text-xs text-muted">{item.pesan}</span>
                      </span>
                    </>
                  );
                  const className = "flex gap-3 rounded-md bg-canvas/80 px-2.5 py-2";
                  return item.tautan ? (
                    <Link key={item.id} href={item.tautan} className={`${className} hover:bg-brand-soft`}>
                      {content}
                    </Link>
                  ) : (
                    <div key={item.id} className={className}>
                      {content}
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Pengumuman Terbaru"
              action={pengumumanHref && <CardLink href={pengumumanHref}>Lihat Semua</CardLink>}
            />
            <ul className="divide-y divide-line px-4 pb-3 sm:px-5">
              {pengumuman.length === 0 ? (
                <li className="py-2">
                  <EmptyState>Belum ada pengumuman terbaru.</EmptyState>
                </li>
              ) : (
                pengumuman.map((item) => (
                  <li key={item.id}>
                    <Link href={`/pengumuman/${item.id}`} className="group block py-2.5">
                      <p className="text-sm font-semibold text-ink group-hover:text-brand">{item.judul}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted">{item.ringkasan}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">Diposting {formatWaktuRelatif(item.published_at, now).toLowerCase()}</p>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Aktivitas Terakhir" />
            <ul className="divide-y divide-line px-4 pb-3 sm:px-5">
              {aktivitas.length === 0 ? (
                <li className="py-2">
                  <EmptyState>Belum ada aktivitas.</EmptyState>
                </li>
              ) : (
                aktivitas.map((item) => {
                  const Icon = AKTIVITAS_ICON[item.ikon];
                  return (
                    <li key={item.id} className="flex items-center gap-3 py-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-soft">
                        <Icon className="size-4 text-brand" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{item.judul}</span>
                        <span className="block text-xs text-muted">{formatWaktuRelatif(item.created_at, now)}</span>
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
