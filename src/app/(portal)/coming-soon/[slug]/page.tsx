import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ComingSoon } from "@/components/coming-soon";
import { getFitur, getPengaturan } from "@/lib/konfigurasi";

export async function generateMetadata({ params }: PageProps<"/coming-soon/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: (await getFitur(slug))?.nama ?? "Coming Soon" };
}

export default async function ComingSoonPage({ params }: PageProps<"/coming-soon/[slug]">) {
  const { slug } = await params;
  const [fitur, pengaturan] = await Promise.all([getFitur(slug), getPengaturan()]);
  if (!fitur) notFound();
  // Fitur yang sudah diaktifkan di database langsung diarahkan ke halaman aslinya.
  if (fitur.status === "tersedia") redirect(fitur.href);

  return (
    <ComingSoon
      fitur={fitur}
      deskripsiUmum={pengaturan.coming_soon_deskripsi}
      catatan={pengaturan.coming_soon_catatan}
    />
  );
}
