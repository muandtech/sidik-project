"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogOut, Repeat } from "lucide-react";
import { gantiRole, logout } from "@/app/actions/auth";
import { MenuIcon } from "@/components/portal/menu-icon";
import { LABEL_ROLE, type Role } from "@/lib/peran";

export type StafMenu = { id: number; label: string; ikon: string | null; href: string };

/** Item menu yang aktif: tautan terpanjang yang cocok dengan path (mis. /admin-keuangan/izin-krs mengalahkan /admin-keuangan). */
function menuAktif(pathname: string, items: StafMenu[]) {
  return items
    .filter((m) => pathname === m.href || pathname.startsWith(`${m.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.id;
}

/** Kerangka portal staf (dosen, kaprodi, BAAK, keuangan, pimpinan, superadmin) dengan penggantian role aktif. */
export function StafShell({
  nama,
  role,
  roles,
  menu,
  branding,
  children,
}: {
  nama: string;
  role: Role;
  roles: Role[];
  menu: StafMenu[];
  branding: { judul: string; logo: string; namaInstitusi: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const aktif = menuAktif(pathname, menu);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-brand print:hidden">
        <div className="flex h-[72px] items-center gap-3 px-4 sm:h-[83px]">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image
              src={branding.logo}
              alt={`Logo ${branding.namaInstitusi}`}
              width={56}
              height={56}
              className="size-11 shrink-0 sm:size-14"
              priority
            />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-white sm:text-xl">{branding.judul}</p>
              <p className="text-xs text-white/90">Portal {LABEL_ROLE[role]}</p>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <p className="hidden text-right text-[13px] text-white md:block">
              <span className="block max-w-[220px] truncate font-semibold">{nama}</span>
              <span className="text-white/80">{LABEL_ROLE[role]}</span>
            </p>
            {roles.length > 1 && (
              <form action={gantiRole} className="flex items-center gap-1.5">
                <label htmlFor="ganti-role" className="sr-only">
                  Ganti role aktif
                </label>
                <select
                  id="ganti-role"
                  name="role"
                  defaultValue={role}
                  className="max-w-[150px] rounded-lg border-0 bg-white/95 px-2 py-2 text-[13px] text-ink"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {LABEL_ROLE[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  title="Ganti role"
                  className="rounded-lg bg-white px-2.5 py-2 text-ink shadow-sm hover:bg-brand-soft"
                >
                  <Repeat className="size-4 text-brand" aria-hidden />
                  <span className="sr-only">Ganti role</span>
                </button>
              </form>
            )}
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

      <nav aria-label="Menu staf" className="border-b border-line bg-white print:hidden">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 sm:px-4">
          {menu.map((m) => (
            <li key={m.id}>
              <Link
                href={m.href}
                aria-current={m.id === aktif ? "page" : undefined}
                className={`flex items-center gap-2 border-b-2 px-3 py-3 text-[13px] font-semibold whitespace-nowrap ${
                  m.id === aktif ? "border-brand text-ink" : "border-transparent text-gray-600 hover:text-ink"
                }`}
              >
                <MenuIcon ikon={m.ikon} className="size-4 text-brand" aria-hidden />
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
    </div>
  );
}
