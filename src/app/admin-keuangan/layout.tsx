import { StafFrame } from "@/components/staf/staf-frame";
import { requireUser } from "@/lib/session";

// Portal Admin Keuangan: verifikasi pembayaran, cicilan UKT, dan izin KRS (UC-SD-22, FR-KEU-07/08, PRD 21.4).
export default async function AdminKeuanganLayout({ children }: LayoutProps<"/admin-keuangan">) {
  const user = await requireUser("keuangan");
  return <StafFrame user={user}>{children}</StafFrame>;
}
