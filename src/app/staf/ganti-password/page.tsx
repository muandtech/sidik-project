import type { Metadata } from "next";
import { HalamanGantiPassword } from "@/components/akun/halaman-ganti-password";
import { ROLE_STAF } from "@/lib/peran";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Ganti Password" };

export default async function GantiPasswordStafPage() {
  await requireUser(ROLE_STAF);
  return <HalamanGantiPassword />;
}
