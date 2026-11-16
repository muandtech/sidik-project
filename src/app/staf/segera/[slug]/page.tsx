import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ComingSoon } from "@/components/coming-soon";
import { getFitur, getPengaturan } from "@/lib/konfigurasi";
import { ROLE_STAF } from "@/lib/peran";
import { requireUser } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/staf/segera/[slug]">): Promise<Metadata> {
  return { title: (await getFitur((await params).slug))?.nama ?? "Segera Hadir" };
}

/** Coming Soon untuk fitur staf yang belum tersedia (isi dari tabel fitur). */
export default async function SegeraStafPage({ params }: PageProps<"/staf/segera/[slug]">) {
  await requireUser(ROLE_STAF);
  const { slug } = await params;
  const [fitur, pengaturan] = await Promise.all([getFitur(slug), getPengaturan()]);
  if (!fitur) notFound();
  if (fitur.status === "tersedia") redirect(fitur.href);
  return (
    <ComingSoon fitur={fitur} deskripsiUmum={pengaturan.coming_soon_deskripsi} backHref="/staf" backLabel="Kembali ke Beranda" />
  );
}
