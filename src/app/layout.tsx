import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { getPengaturan } from "@/lib/konfigurasi";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  // Identitas aplikasi dibaca dari database saat request, bukan saat build.
  await connection();
  const p = await getPengaturan();
  const nama = `${p.nama_aplikasi} ${p.singkatan_institusi}`;
  return {
    title: { default: `${p.nama_aplikasi} — ${p.judul_portal} ${p.singkatan_institusi}`, template: `%s | ${nama}` },
    description: p.deskripsi_aplikasi,
    icons: { icon: p.logo },
  };
}

export const viewport: Viewport = {
  themeColor: "#f97316",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
