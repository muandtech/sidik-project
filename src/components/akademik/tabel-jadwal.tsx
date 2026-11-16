import { EmptyState } from "@/components/ui";
import { NAMA_HARI, type JadwalKelas } from "@/lib/akademik";

/** Jadwal dikelompokkan per hari (Senin–Minggu). */
export function JadwalPerHari({ jadwal, kosong }: { jadwal: JadwalKelas[]; kosong: string }) {
  if (jadwal.length === 0) return <EmptyState>{kosong}</EmptyState>;
  const hari = [...new Set(jadwal.map((j) => j.hari))].sort((a, b) => a - b);
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {hari.map((h) => (
        <section key={h} className="rounded-xl border border-line bg-white">
          <h2 className="border-b border-line px-4 py-2.5 text-sm font-bold">{NAMA_HARI[h]}</h2>
          <ul className="divide-y divide-line">
            {jadwal
              .filter((j) => j.hari === h)
              .map((j) => (
                <li key={j.jadwal_id} className="flex gap-3 px-4 py-2.5 text-sm">
                  <span className="w-24 shrink-0 font-semibold text-gray-600">
                    {j.jam_mulai.slice(0, 5)}–{j.jam_selesai.slice(0, 5)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      {j.nama_mk} <span className="font-normal text-muted">({j.kelas})</span>
                    </span>
                    <span className="block text-xs text-muted">
                      {j.kode_mk} · {j.sks} SKS · {j.ruang ?? "Ruang belum diatur"} · {j.dosen ?? "-"}
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
