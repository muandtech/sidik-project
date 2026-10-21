import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getPengaturan } from "@/lib/konfigurasi";
import { getSessionUser, homeFor } from "@/lib/session";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user.role));

  const pengaturan = await getPengaturan();
  const tahun = new Date().toLocaleDateString("en-US", { timeZone: "Asia/Jakarta", year: "numeric" });

  return (
    <div className="flex min-h-screen flex-col bg-login">
      <main className="flex flex-1 flex-col items-center px-4 pt-6 pb-16 sm:pt-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">{pengaturan.nama_aplikasi}</h1>
        <p className="mt-1 text-sm text-white/90">{pengaturan.nama_institusi}</p>

        <section className="mt-1 w-full max-w-[440px] rounded-xl border border-white/50 bg-campus px-5 py-7 shadow-lg shadow-black/10 sm:px-8">
          <div className="flex flex-col items-center text-center">
            <Image
              src={pengaturan.logo}
              alt={`Logo ${pengaturan.nama_institusi}`}
              width={72}
              height={72}
              priority
            />
            <h2 className="mt-3 text-[15px] font-medium text-ink">{pengaturan.login_subjudul}</h2>
          </div>
          <hr className="my-6 border-white/60" />
          <LoginForm
            contohUsername={pengaturan.login_contoh_username}
            labelTombol={pengaturan.login_tombol}
            bantuanLupaPassword={pengaturan.login_bantuan_lupa_password}
          />
        </section>
      </main>

      <footer className="border-t border-white/70 px-4 py-6 text-center text-xs font-semibold text-white">
        {pengaturan.footer_teks} © {tahun} {pengaturan.nama_institusi}
      </footer>
    </div>
  );
}
