import type { ReactNode } from "react";
import { StafShell } from "@/components/staf/staf-shell";
import { getMenuStaf, getPengaturan } from "@/lib/konfigurasi";
import type { SessionUser } from "@/lib/session";

/** Memuat branding & menu staf (dari database) untuk role aktif, lalu merender kerangka portal staf. */
export async function StafFrame({ user, children }: { user: SessionUser; children: ReactNode }) {
  const [pengaturan, menu] = await Promise.all([getPengaturan(), getMenuStaf(user.role)]);
  return (
    <StafShell
      nama={user.nama}
      role={user.role}
      roles={user.roles}
      menu={menu}
      branding={{ judul: pengaturan.judul_portal, logo: pengaturan.logo, namaInstitusi: pengaturan.nama_institusi }}
    >
      {children}
    </StafShell>
  );
}
