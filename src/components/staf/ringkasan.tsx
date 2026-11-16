import type { Hitungan } from "@/lib/dasbor";

export const LABEL_STATUS_KRS: Record<string, string> = {
  belum: "Belum isi",
  draf: "Draf",
  diajukan: "Menunggu PA",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export const LABEL_STATUS_MAHASISWA: Record<string, string> = {
  aktif: "Aktif",
  cuti: "Cuti",
  nonaktif: "Nonaktif",
  lulus: "Lulus",
  keluar: "Keluar",
};

export type Angka = { label: string; nilai: string | number; catatan?: string };

/** Deretan kartu angka ringkas. */
export function KartuAngka({ items }: { items: Angka[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-xl border border-line bg-white px-4 py-3.5">
          <p className="text-[11px] font-semibold tracking-wide text-gray-600 uppercase">{item.label}</p>
          <p className="mt-1 text-xl font-bold break-words text-ink">{item.nilai}</p>
          {item.catatan && <p className="mt-0.5 text-xs text-muted">{item.catatan}</p>}
        </div>
      ))}
    </div>
  );
}

/** Hitungan per status → kartu angka, urut sesuai `urutan`, status kosong tetap ditampilkan 0. */
export function hitunganKeAngka(hitungan: Hitungan[], label: Record<string, string>): Angka[] {
  return Object.entries(label).map(([kunci, teks]) => ({
    label: teks,
    nilai: hitungan.find((h) => h.kunci === kunci)?.jumlah ?? 0,
  }));
}
