import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { getPengaturan } from "@/lib/konfigurasi";
import { requireUser } from "@/lib/session";

// Portal Admin Keuangan: verifikasi pembayaran dan cicilan UKT (UC-SD-22, FR-KEU-07/08).
export default async function AdminKeuanganLayout({ children }: LayoutProps<"/admin-keuangan">) {
  const user = await requireUser("keuangan");
  const pengaturan = await getPengaturan();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-brand print:hidden">
        <div className="flex h-[72px] items-center gap-3 px-4 sm:h-[83px]">
          <Link href="/admin-keuangan" className="flex min-w-0 items-center gap-3">
            <Image
              src={pengaturan.logo}
              alt={`Logo ${pengaturan.nama_institusi}`}
              width={56}
              height={56}
              className="size-11 shrink-0 sm:size-14"
              priority
            />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-white sm:text-xl">{pengaturan.judul_portal}</p>
              <p className="text-xs text-white/90">Portal Admin Keuangan</p>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <p className="hidden text-right text-[13px] text-white sm:block">
              <span className="block font-semibold">{user.nama}</span>
              <span className="text-white/80">Admin Keuangan</span>
            </p>
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-brand-soft"
              >
                <LogOut className="size-4 text-brand" aria-hidden />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
    </div>
  );
}
