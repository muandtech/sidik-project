import "server-only";
import { cache } from "react";
import { query, queryOne } from "@/lib/db";

/** Tautan fitur: rute asli bila sudah tersedia, selain itu halaman Coming Soon. */
const HREF_SQL = `CASE WHEN f.status = 'tersedia' AND f.rute IS NOT NULL THEN f.rute
                       WHEN f.slug IS NOT NULL THEN CONCAT('/coming-soon/', f.slug) END`;

export type Pengaturan = Record<string, string>;

/** Seluruh baris tabel `pengaturan` sebagai objek kunci → nilai. */
export const getPengaturan = cache(async (): Promise<Pengaturan> => {
  const rows = await query<{ kunci: string; nilai: string }>("SELECT kunci, nilai FROM pengaturan");
  return Object.fromEntries(rows.map((row) => [row.kunci, row.nilai]));
});

export type Fitur = {
  slug: string;
  nama: string;
  deskripsi: string;
  status: "tersedia" | "segera";
  rencana_sprint: number | null;
  href: string;
};

export const getFitur = cache(async (slug: string) =>
  queryOne<Fitur>(
    `SELECT f.slug, f.nama, f.deskripsi, f.status, f.rencana_sprint, ${HREF_SQL} AS href
       FROM fitur f WHERE f.slug = ?`,
    [slug],
  ),
);

/** Tautan untuk fitur yang dirujuk langsung dari halaman (mis. "Lihat Semua"); null bila fitur tidak terdaftar. */
export async function getFiturHref(slug: string) {
  return (await getFitur(slug))?.href ?? null;
}

export type MenuGrup =
  | "menu_atas"
  | "sidebar"
  | "menu_pengguna"
  | "aksi_dashboard"
  | "aksi_cepat"
  | "aksi_biodata"
  | "aksi_keuangan";

export type ButtonVariant = "primary" | "outline" | "plain" | "soft";

export type MenuItem = {
  id: number;
  label: string;
  ikon: string | null;
  href: string | null;
  varian: ButtonVariant | null;
  children: MenuItem[];
};

/** Menu aktif satu grup, tersusun sebagai pohon (induk → submenu). */
export const getMenu = cache(async (grup: MenuGrup): Promise<MenuItem[]> => {
  const rows = await query<Omit<MenuItem, "children"> & { parent_id: number | null }>(
    `SELECT m.id, m.parent_id, m.label, m.ikon, m.varian, ${HREF_SQL} AS href
       FROM menu m
       LEFT JOIN fitur f ON f.slug = m.fitur_slug
      WHERE m.grup = ? AND m.aktif = 1
      ORDER BY m.urutan, m.id`,
    [grup],
  );

  const toItem = (row: (typeof rows)[number]): MenuItem => ({
    id: row.id,
    label: row.label,
    ikon: row.ikon,
    href: row.href,
    varian: row.varian,
    children: [],
  });
  return rows
    .filter((row) => row.parent_id === null)
    .map((row) => ({
      ...toItem(row),
      children: rows.filter((child) => child.parent_id === row.id && child.href).map(toItem),
    }))
    // Abaikan entri yang tidak punya tujuan (fitur tidak terdaftar dan tanpa submenu).
    .filter((item) => item.href || item.children.length > 0);
});
