import { logout } from "@/app/actions/auth";
import { PortalShell } from "@/components/portal/portal-shell";
import { getMahasiswa } from "@/lib/data";
import { inisial } from "@/lib/format";
import { getMenu, getPengaturan } from "@/lib/konfigurasi";
import { requireUser } from "@/lib/session";

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser("mahasiswa");
  const [mahasiswa, pengaturan, menuAtas, sidebar, menuPengguna] = await Promise.all([
    getMahasiswa(user.userId),
    getPengaturan(),
    getMenu("menu_atas"),
    getMenu("sidebar"),
    getMenu("menu_pengguna"),
  ]);

  // Akun mahasiswa tanpa data profil tidak bisa memakai portal (jangan redirect ke /login agar tidak berputar).
  if (!mahasiswa) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md rounded-xl border border-line bg-white p-6 text-center">
          <h1 className="text-lg font-bold">Data mahasiswa belum tersedia</h1>
          <p className="mt-2 text-sm text-muted">
            Akun Anda belum terhubung dengan data mahasiswa. Silakan hubungi {pengaturan.unit_layanan_akun}.
          </p>
          <form action={logout} className="mt-5">
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
              Keluar
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <PortalShell
      user={{ nama: mahasiswa.nama, nomorInduk: mahasiswa.nim, inisial: inisial(mahasiswa.nama) }}
      stats={{ totalSks: mahasiswa.total_sks, ipk: mahasiswa.ipk, nilaiTilawah: mahasiswa.nilai_tilawah }}
      menus={{ atas: menuAtas, sidebar, pengguna: menuPengguna }}
      branding={{
        judul: pengaturan.judul_portal,
        logo: pengaturan.logo,
        namaInstitusi: pengaturan.nama_institusi,
      }}
    >
      {children}
    </PortalShell>
  );
}
