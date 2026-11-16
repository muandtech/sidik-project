// Definisi role SIDIK (PRD §3.5, §10). Modul ini murni (tanpa akses DB) agar bisa dipakai di komponen klien.

export const DAFTAR_ROLE = ["mahasiswa", "dosen", "kaprodi", "baak", "keuangan", "pimpinan", "superadmin"] as const;

export type Role = (typeof DAFTAR_ROLE)[number];

export const ROLE_STAF = ["dosen", "kaprodi", "baak", "keuangan", "pimpinan", "superadmin"] as const satisfies readonly Role[];

export type RoleStaf = (typeof ROLE_STAF)[number];

export const LABEL_ROLE: Record<Role, string> = {
  mahasiswa: "Mahasiswa",
  dosen: "Dosen",
  kaprodi: "Kaprodi",
  baak: "Admin Akademik (BAAK)",
  keuangan: "Admin Keuangan",
  pimpinan: "Pimpinan",
  superadmin: "Superadmin",
};

export function isRole(nilai: string): nilai is Role {
  return (DAFTAR_ROLE as readonly string[]).includes(nilai);
}

export function isRoleStaf(role: Role): role is RoleStaf {
  return (ROLE_STAF as readonly string[]).includes(role);
}

/** Halaman awal setiap role aktif. */
export function homeFor(role: Role) {
  if (role === "mahasiswa") return "/dashboard";
  if (role === "keuangan") return "/admin-keuangan";
  return "/staf";
}

/**
 * Status akademik yang masih boleh login sebagai mahasiswa (keputusan kampus 2026-11-16):
 * aktif, cuti, dan nonaktif boleh login; lulus dan keluar tidak.
 */
export const STATUS_BOLEH_LOGIN = ["aktif", "cuti", "nonaktif"] as const;

export type StatusAkademik = "aktif" | "cuti" | "nonaktif" | "lulus" | "keluar";

export function statusBolehLogin(status: StatusAkademik) {
  return (STATUS_BOLEH_LOGIN as readonly string[]).includes(status);
}
