import { StafFrame } from "@/components/staf/staf-frame";
import { ROLE_STAF } from "@/lib/peran";
import { requireUser } from "@/lib/session";

// Portal staf: dosen, kaprodi, BAAK, keuangan, pimpinan, superadmin (SD-S2-03). Setiap halaman tetap
// memeriksa role-nya sendiri; layout hanya memastikan pengguna adalah staf.
export default async function StafLayout({ children }: LayoutProps<"/staf">) {
  const user = await requireUser(ROLE_STAF);
  return <StafFrame user={user}>{children}</StafFrame>;
}
