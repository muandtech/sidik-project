import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { ComingSoon } from "@/components/coming-soon";
import { getFitur, getPengaturan } from "@/lib/konfigurasi";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getFitur("modul-dosen-admin"))?.nama };
}

// Placeholder S1-CS5: modul dosen dan admin (fitur "modul-dosen-admin" di tabel fitur).
export default async function PortalStafPage() {
  const user = await requireUser();
  const [fitur, pengaturan] = await Promise.all([getFitur("modul-dosen-admin"), getPengaturan()]);
  if (!fitur) notFound();
  if (fitur.status === "tersedia") redirect(fitur.href);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-brand">
        <div className="flex h-[72px] items-center gap-3 px-4 sm:h-[83px]">
          <Image
            src={pengaturan.logo}
            alt={`Logo ${pengaturan.nama_institusi}`}
            width={56}
            height={56}
            className="size-11 sm:size-14"
          />
          <div className="min-w-0">
            <p className="text-lg font-bold text-white sm:text-xl">{pengaturan.judul_portal}</p>
            <p className="text-xs text-white/90">Portal {user.role === "dosen" ? "Dosen" : "Admin"}</p>
          </div>
          <form action={logout} className="ml-auto">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-brand-soft"
            >
              <LogOut className="size-4 text-brand" aria-hidden />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-4">
        <p className="mt-6 text-center text-sm text-muted">
          Masuk sebagai <span className="font-semibold text-ink">{user.nama}</span>
        </p>
        <ComingSoon
          fitur={fitur}
          deskripsiUmum={pengaturan.coming_soon_deskripsi}
          backHref="/portal-staf"
          backLabel="Muat Ulang"
        />
      </main>
    </div>
  );
}
