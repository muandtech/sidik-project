import type { Metadata } from "next";
import Link from "next/link";
import { Paginasi, satuParam } from "@/components/paginasi";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getAuditLog, getDaftarAksiAudit } from "@/lib/dasbor";
import { formatTanggal } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Audit Log" };

const inputClass =
  "w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

function ringkasJson(data: Record<string, unknown> | null) {
  if (!data) return null;
  return Object.entries(data)
    .map(([k, v]) => `${k}: ${v === null ? "-" : String(v)}`)
    .join(", ");
}

// SD-S2-13: audit log hanya-baca (PRD §10: Pimpinan R, Superadmin). Tidak ada aksi ubah/hapus di UI,
// dan database menolak UPDATE/DELETE pada tabel ini.
export default async function AuditLogPage({ searchParams }: PageProps<"/staf/audit">) {
  await requireUser(["pimpinan", "superadmin"]);
  const params = await searchParams;
  const aksi = satuParam(params.aksi).slice(0, 50);
  const q = satuParam(params.q).trim().slice(0, 60);
  const [{ baris, totalBaris, halaman, jumlahHalaman }, daftarAksi] = await Promise.all([
    getAuditLog({ aksi, q, halaman: Number(satuParam(params.halaman)) || 1 }),
    getDaftarAksiAudit(),
  ]);
  const url = (n: number) => {
    const sp = new URLSearchParams();
    if (aksi) sp.set("aksi", aksi);
    if (q) sp.set("q", q);
    if (n > 1) sp.set("halaman", String(n));
    return `/staf/audit?${sp.toString()}`;
  };

  return (
    <>
      <PageHeader boxed title="Audit Log" description={`${totalBaris} catatan · tidak dapat diubah atau dihapus`} />
      <Card>
        <form method="get" className="grid gap-3 border-b border-line p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:p-5">
          <div>
            <label htmlFor="aksi" className="mb-1 block text-xs font-medium text-muted">Aksi</label>
            <select id="aksi" name="aksi" defaultValue={aksi} className={inputClass}>
              <option value="">Semua aksi</option>
              {daftarAksi.map((a) => (
                <option key={a.aksi} value={a.aksi}>
                  {a.aksi}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="q" className="mb-1 block text-xs font-medium text-muted">Pelaku / keterangan</label>
            <input id="q" name="q" defaultValue={q} className={inputClass} placeholder="username atau kata kunci" />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-md border border-brand bg-brand px-4 py-2 text-[13px] font-semibold text-white">
              Terapkan
            </button>
            <Link href="/staf/audit" className="rounded-md border border-line px-3 py-2 text-[13px] font-semibold">
              Reset
            </Link>
          </div>
        </form>
        <div className="overflow-x-auto p-4 sm:p-5">
          {baris.length === 0 ? (
            <EmptyState>Tidak ada catatan yang sesuai.</EmptyState>
          ) : (
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="bg-canvas text-[13px]">
                  <th scope="col" className="px-3 py-2.5">Waktu</th>
                  <th scope="col" className="px-3 py-2.5">Pelaku</th>
                  <th scope="col" className="px-3 py-2.5">Aksi</th>
                  <th scope="col" className="px-3 py-2.5">Keterangan</th>
                  <th scope="col" className="px-3 py-2.5">Sebelum → sesudah</th>
                  <th scope="col" className="px-3 py-2.5">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {baris.map((b) => (
                  <tr key={b.id}>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{formatTanggal(b.created_at, true)}</td>
                    <td className="px-3 py-2 text-xs">{b.oleh}</td>
                    <td className="px-3 py-2 font-mono text-xs">{b.aksi}</td>
                    <td className="px-3 py-2 text-xs">
                      {b.keterangan ?? "-"}
                      {b.alasan && <span className="block text-muted">Alasan: {b.alasan}</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {b.data_lama || b.data_baru ? (
                        <>
                          <span className="block text-muted">{ringkasJson(b.data_lama) ?? "-"}</span>
                          <span className="block">→ {ringkasJson(b.data_baru) ?? "-"}</span>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">{b.ip_address ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Paginasi halaman={halaman} jumlahHalaman={jumlahHalaman} url={url} />
        </div>
      </Card>
    </>
  );
}
