import type { Metadata } from "next";
import Link from "next/link";
import { izinkanMassal, ubahIzinKrs } from "@/app/actions/keuangan";
import { AksiForm } from "@/components/aksi-form";
import { Paginasi, satuParam } from "@/components/paginasi";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { labelTahunAkademik } from "@/lib/akademik";
import { getDaftarIzinKrs, memenuhiSyaratBayar, type FilterIzin } from "@/lib/izin-krs";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Izin KRS" };

const inputClass =
  "w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

function bacaIzin(nilai: string): FilterIzin["izin"] {
  return nilai === "diizinkan" || nilai === "belum" ? nilai : "";
}

// PRD 21.4: sampai Sprint 4, izin KRS dibuka manual oleh Admin Keuangan berdasarkan status pembayaran (BR-SD-02).
export default async function IzinKrsPage({ searchParams }: PageProps<"/admin-keuangan/izin-krs">) {
  await requireUser("keuangan");
  const params = await searchParams;
  const q = satuParam(params.q).trim().slice(0, 100);
  const izin = bacaIzin(satuParam(params.izin));
  const data = await getDaftarIzinKrs({ q, izin, halaman: Number(satuParam(params.halaman)) || 1 });
  const url = (n: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (izin) sp.set("izin", izin);
    if (n > 1) sp.set("halaman", String(n));
    return `/admin-keuangan/izin-krs?${sp.toString()}`;
  };

  return (
    <>
      <PageHeader
        boxed
        title="Izin KRS"
        description={`${data.ta ? `Semester ${labelTahunAkademik(data.ta)} · ` : ""}Syarat: tagihan lunas, atau cicilan dengan minimal ${data.minTermin} termin lunas (BR-SD-02).`}
        actions={
          <AksiForm action={izinkanMassal} label="Buka KRS untuk semua yang memenuhi syarat" labelProses="Memproses…" />
        }
      />
      <Card>
        <form method="get" className="grid gap-3 border-b border-line p-4 sm:grid-cols-[1.4fr_1fr_auto] sm:p-5">
          <div>
            <label htmlFor="q" className="mb-1 block text-xs font-medium text-muted">Cari mahasiswa</label>
            <input id="q" name="q" defaultValue={q} placeholder="Nama atau NIM" className={inputClass} />
          </div>
          <div>
            <label htmlFor="izin" className="mb-1 block text-xs font-medium text-muted">Izin KRS</label>
            <select id="izin" name="izin" defaultValue={izin} className={inputClass}>
              <option value="">Semua</option>
              <option value="belum">Belum diizinkan</option>
              <option value="diizinkan">Sudah diizinkan</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-md border border-brand bg-brand px-4 py-2 text-[13px] font-semibold text-white">
              Terapkan
            </button>
            <Link href="/admin-keuangan/izin-krs" className="rounded-md border border-line px-3 py-2 text-[13px] font-semibold">
              Reset
            </Link>
          </div>
        </form>
        <div className="overflow-x-auto p-4 sm:p-5">
          <p className="mb-2 text-xs text-muted">{data.totalBaris} mahasiswa aktif</p>
          {data.baris.length === 0 ? (
            <EmptyState>Tidak ada mahasiswa yang sesuai.</EmptyState>
          ) : (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="bg-canvas text-[13px]">
                  <th scope="col" className="px-3 py-2.5">Mahasiswa</th>
                  <th scope="col" className="px-3 py-2.5">Pembayaran semester ini</th>
                  <th scope="col" className="px-3 py-2.5">Izin KRS</th>
                  <th scope="col" className="px-3 py-2.5">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.baris.map((b) => {
                  const syarat = memenuhiSyaratBayar(b, data.minTermin);
                  const bayar =
                    b.status_tagihan === null
                      ? "Belum ada tagihan"
                      : b.status_tagihan === "lunas"
                        ? "Lunas"
                        : b.jumlah_termin > 0
                          ? `Cicilan ${b.termin_lunas}/${b.jumlah_termin} termin lunas`
                          : "Belum lunas";
                  return (
                    <tr key={b.mahasiswa_id}>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold">{b.nama}</span>
                        <span className="block text-xs text-muted">
                          {b.nim} · {b.prodi} · Smt {b.semester}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {bayar}
                        <span className={`block text-xs ${syarat ? "text-success" : "text-danger"}`}>
                          {syarat ? "Memenuhi syarat" : "Belum memenuhi syarat"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold">{b.boleh_krs ? "Dibuka" : "Ditutup"}</td>
                      <td className="px-3 py-2.5 text-right">
                        <AksiForm
                          action={ubahIzinKrs}
                          hidden={{ mahasiswa_id: b.mahasiswa_id, boleh: b.boleh_krs ? "0" : "1" }}
                          label={b.boleh_krs ? "Tutup" : "Buka"}
                          variant={b.boleh_krs ? "danger" : "outline"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <Paginasi halaman={data.halaman} jumlahHalaman={data.jumlahHalaman} url={url} />
        </div>
      </Card>
    </>
  );
}
