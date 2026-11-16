import type { Metadata } from "next";
import { HalamanGantiPassword } from "@/components/akun/halaman-ganti-password";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Ganti Password" };

export default async function GantiPasswordPage() {
  await requireUser("mahasiswa");
  return <HalamanGantiPassword />;
}
