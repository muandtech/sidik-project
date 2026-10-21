import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getKategoriPengumuman, getPengumumanList } from "@/lib/data";
import { formatTanggal, formatWaktuRelatif } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Pengumuman" };

export default async function PengumumanPage({ searchParams }: PageProps<"/pengumuman">) {
  const user = await requireUser("mahasiswa");
  const { kategori: raw } = await searchParams;
  const daftarKategori = await getKategoriPengumuman();
  const kategori = daftarKategori.find((item) => item.kode === raw)?.kode;
  const pengumuman = await getPengumumanList(user.role, { kategori });
  const tabs = [{ kode: undefined, nama: "Semua" }, ...daftarKategori];
  const now = new Date();

  return (
    <>
      <PageHeader
        boxed
        title="Pengumuman & Informasi"
        description="Pengumuman akademik, informasi kampus, dan agenda kegiatan terbaru."
      />

      <nav aria-label="Kategori pengumuman" className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-2">
          {tabs.map((tab) => {
            const active = tab.kode === kategori;
            return (
              <li key={tab.kode ?? "semua"}>
                <Link
                  href={tab.kode ? `/pengumuman?kategori=${encodeURIComponent(tab.kode)}` : "/pengumuman"}
                  aria-current={active ? "page" : undefined}
                  className={`inline-block rounded-full border px-4 py-1.5 text-[13px] font-semibold transition ${
                    active ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand hover:text-brand"
                  }`}
                >
                  {tab.nama}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Card>
        {pengumuman.length === 0 ? (
          <div className="p-5">
            <EmptyState>Belum ada pengumuman pada kategori ini.</EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {pengumuman.map((item) => (
              <li key={item.id}>
                <Link href={`/pengumuman/${item.id}`} className="group block px-4 py-4 hover:bg-canvas/60 sm:px-5">
                  <span className="inline-block rounded bg-brand-soft px-2 py-0.5 text-[11px] font-bold tracking-wide text-brand uppercase">
                    {item.kategori_nama}
                  </span>
                  <h2 className="mt-1.5 text-[15px] font-semibold text-ink group-hover:text-brand">{item.judul}</h2>
                  <p className="mt-1 text-sm text-gray-600">{item.ringkasan}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span>
                      {item.penulis} • {formatWaktuRelatif(item.published_at, now)}
                    </span>
                    {item.tanggal_acara && (
                      <span className="inline-flex items-center gap-1 font-medium text-ink">
                        <CalendarDays className="size-3.5 text-brand" aria-hidden />
                        {formatTanggal(item.tanggal_acara, true)} WIB
                      </span>
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
