import { FormGantiPassword } from "@/components/akun/form-ganti-password";
import { Card, PageHeader } from "@/components/ui";
import { getPengaturan } from "@/lib/konfigurasi";

export async function HalamanGantiPassword() {
  const minimal = Number((await getPengaturan()).password_min_panjang) || 8;
  return (
    <>
      <PageHeader
        boxed
        title="Ganti Password"
        description="Setelah password diganti, semua session di perangkat lain otomatis diakhiri."
      />
      <Card className="p-5">
        <FormGantiPassword minimal={minimal} />
      </Card>
    </>
  );
}
