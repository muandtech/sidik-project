"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { logout } from "@/app/actions/auth";
import type { MenuItem } from "@/lib/konfigurasi";
import { isActive } from "@/lib/navigation";
import { MenuIcon } from "@/components/portal/menu-icon";

export type ShellUser = {
  nama: string;
  nomorInduk: string;
  inisial: string;
};

export type ShellMenus = {
  atas: MenuItem[];
  sidebar: MenuItem[];
  pengguna: MenuItem[];
};

export type ShellBranding = {
  judul: string;
  logo: string;
  namaInstitusi: string;
};

export type ShellStats = {
  totalSks: number;
  ipk: string | null;
  nilaiTilawah: string | null;
};

export function PortalShell({
  user,
  stats,
  menus,
  branding,
  children,
}: {
  user: ShellUser;
  stats: ShellStats;
  menus: ShellMenus;
  branding: ShellBranding;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user} branding={branding} items={menus.pengguna} onOpenMenu={() => setDrawerOpen(true)} />
      <TopNav pathname={pathname} stats={stats} items={menus.atas} />

      <div className="flex flex-1">
        <aside className="hidden w-[220px] shrink-0 border-r border-line lg:block print:hidden">
          <Sidebar pathname={pathname} items={menus.sidebar} />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu navigasi">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col overflow-y-auto bg-canvas shadow-xl">
            <div className="flex items-center justify-between bg-brand px-4 py-4 text-white">
              <span className="font-semibold">Menu</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
                className="rounded p-1 hover:bg-white/15"
              >
                <X className="size-5" />
              </button>
            </div>
            <Sidebar pathname={pathname} items={menus.sidebar} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Header({
  user,
  branding,
  items,
  onOpenMenu,
}: {
  user: ShellUser;
  branding: ShellBranding;
  items: MenuItem[];
  onOpenMenu: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-brand print:hidden">
      <div className="flex h-[72px] items-center gap-3 px-3 sm:h-[83px] sm:px-4">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Buka menu"
          className="rounded-md p-2 text-white hover:bg-white/15 lg:hidden"
        >
          <Menu className="size-6" />
        </button>
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
          <Image
            src={branding.logo}
            alt={`Logo ${branding.namaInstitusi}`}
            width={56}
            height={56}
            className="size-11 shrink-0 sm:size-14"
            priority
          />
          <span className="truncate text-lg font-bold text-white sm:text-xl">{branding.judul}</span>
        </Link>

        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2.5 rounded-lg bg-white px-2 py-1.5 text-left shadow-sm sm:px-3 sm:py-2"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-gray-100 text-xs font-bold text-gray-600">
              {user.inisial}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-[180px] truncate text-[13px] font-semibold text-ink">{user.nama}</span>
              <span className="block text-[11px] text-muted">{user.nomorInduk}</span>
            </span>
            <ChevronDown className="size-3.5 text-gray-500" aria-hidden />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Tutup menu pengguna"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg"
              >
                <div className="border-b border-line px-4 py-2.5 sm:hidden">
                  <p className="truncate text-sm font-semibold">{user.nama}</p>
                  <p className="text-xs text-muted">{user.nomorInduk}</p>
                </div>
                {items.map((item) =>
                  item.href ? (
                    <Link
                      key={item.id}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-brand-soft"
                    >
                      <MenuIcon ikon={item.ikon} className="size-4 text-brand" /> {item.label}
                    </Link>
                  ) : null,
                )}
                <form action={logout} className="border-t border-line">
                  <button
                    type="submit"
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-danger hover:bg-red-50"
                  >
                    <LogOut className="size-4" /> Keluar
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function TopNav({ pathname, stats, items }: { pathname: string; stats: ShellStats; items: MenuItem[] }) {
  const topNavMatch = items.some((item) => item.href !== "/dashboard" && isActive(pathname, item.href));

  return (
    <div className="border-b border-line bg-white print:hidden">
      <div className="flex flex-col-reverse gap-2 px-2 py-2 lg:flex-row lg:items-stretch lg:pl-[150px] xl:pl-[158px]">
        <nav aria-label="Menu cepat" className="-mx-2 overflow-x-auto px-2 lg:mx-0 lg:flex-1 lg:px-0">
          <ul className="flex min-w-max divide-x divide-line">
            {items.map(({ id, label, href, ikon }) => {
              if (!href) return null;
              // "Dashboard" menjadi tab aktif untuk semua halaman yang tidak punya tab sendiri.
              const active = href === "/dashboard" ? !topNavMatch : isActive(pathname, href);
              return (
                <li key={id}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-14 min-w-[84px] flex-col items-center justify-center gap-1.5 border-b-2 px-3 text-[10.5px] font-semibold tracking-wide uppercase transition lg:h-[56px] ${
                      active
                        ? "border-brand bg-brand-soft text-ink"
                        : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-ink"
                    }`}
                  >
                    <MenuIcon
                      ikon={ikon}
                      className={`size-4 ${active ? "text-brand" : "text-gray-500"}`}
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <span className="whitespace-nowrap">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <dl className="flex shrink-0 items-stretch self-stretch border-l-2 border-brand bg-brand-soft/70 lg:self-auto">
          <div className="px-3 py-1.5">
            <dt className="text-[10px] font-semibold text-gray-700 uppercase">
              Σ SKS <span className="block text-[9px] font-normal text-muted normal-case">A/B/C</span>
            </dt>
            <dd className="text-[22px] leading-tight font-semibold text-brand">{stats.totalSks}</dd>
          </div>
          <div className="border-l border-line px-3 py-1.5">
            <dt className="text-[10px] font-semibold text-gray-700 uppercase">IPK</dt>
            <dd className="mt-2 text-[22px] leading-tight font-bold text-ink">{stats.ipk ?? "-"}</dd>
          </div>
          <div className="border-l border-line px-3 py-1.5">
            <dt className="text-[10px] font-semibold text-gray-700 uppercase">Nilai Tilawah</dt>
            <dd className="mt-2 text-[22px] leading-tight font-bold text-ink">{stats.nilaiTilawah ?? "-"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function Sidebar({
  pathname,
  items,
  onNavigate,
}: {
  pathname: string;
  items: MenuItem[];
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Menu utama" className="p-2">
      <ul className="overflow-hidden rounded-sm bg-white">
        {items.map((item) => (
          <SidebarEntry key={item.id} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </ul>
      <form action={logout} className="mt-2">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-sm bg-white px-3 py-2.5 text-left text-[12.5px] font-semibold text-danger uppercase hover:bg-red-50"
        >
          <LogOut className="size-3.5" aria-hidden /> Keluar
        </button>
      </form>
    </nav>
  );
}

function SidebarEntry({
  item,
  pathname,
  onNavigate,
}: {
  item: MenuItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const hasChildren = item.children.length > 0;
  const childActive = item.children.some((child) => isActive(pathname, child.href));
  const selfActive = !hasChildren && isActive(pathname, item.href);
  // null = ikuti rute aktif; true/false = pilihan manual pengguna.
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const open = expanded ?? childActive;

  const rowClass = (active: boolean) =>
    `flex w-full items-center gap-3 border-l-[3px] px-3 py-2.5 text-left text-[12.5px] font-semibold uppercase transition ${
      active ? "border-brand bg-brand-soft text-ink" : "border-transparent text-ink hover:bg-canvas"
    }`;
  if (!hasChildren) {
    if (!item.href) return null;
    return (
      <li>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={selfActive ? "page" : undefined}
          className={rowClass(selfActive)}
        >
          <MenuIcon ikon={item.ikon} className="size-3.5 shrink-0 text-brand" aria-hidden />
          {item.label}
        </Link>
      </li>
    );
  }

  const panelId = `submenu-${item.id}`;
  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className={rowClass(childActive && !open)}
      >
        <MenuIcon ikon={item.ikon} className="size-3.5 shrink-0 text-brand" aria-hidden />
        <span className="flex-1">{item.label}</span>
        <ChevronDown className={`size-3 text-brand transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <ul id={panelId} className="pb-1">
          {item.children.map((child) => {
            if (!child.href) return null;
            const active = isActive(pathname, child.href);
            return (
              <li key={child.id}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`block border-l-[3px] py-2 pr-3 pl-10 text-[12.5px] transition ${
                    active
                      ? "border-brand bg-brand-soft font-semibold text-ink"
                      : "border-transparent text-gray-600 hover:bg-canvas hover:text-ink"
                  }`}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
