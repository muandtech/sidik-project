import type { Tagihan, Termin } from "@/lib/data";
import { lewatJatuhTempo } from "@/lib/format";

const badge = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap uppercase";

export const GAYA_STATUS = {
  lunas: { label: "Lunas", className: `${badge} bg-green-50 text-success` },
  cicilan: { label: "Cicilan", className: `${badge} bg-brand-soft text-brand` },
  belum: { label: "Belum Bayar", className: `${badge} bg-gray-100 text-gray-600` },
  menunggak: { label: "Menunggak", className: `${badge} bg-red-50 text-danger` },
} as const;

export type KodeStatus = keyof typeof GAYA_STATUS;

/** Status satu termin; termin belum bayar yang lewat jatuh tempo = menunggak. */
export function statusTermin(t: Pick<Termin, "status" | "jatuh_tempo">, now = new Date()): KodeStatus {
  if (t.status === "lunas") return "lunas";
  return lewatJatuhTempo(t.jatuh_tempo, now) ? "menunggak" : "belum";
}

/** Status tagihan; tagihan menunggak bila ada termin (atau tagihan sekaligus) yang lewat jatuh tempo. */
export function statusTagihan(
  t: Pick<Tagihan, "status" | "jatuh_tempo">,
  termin: Pick<Termin, "status" | "jatuh_tempo">[],
  now = new Date(),
): KodeStatus {
  if (t.status === "lunas") return "lunas";
  const menunggak =
    termin.length > 0 ? termin.some((tt) => statusTermin(tt, now) === "menunggak") : lewatJatuhTempo(t.jatuh_tempo, now);
  if (menunggak) return "menunggak";
  return t.status === "cicilan" ? "cicilan" : "belum";
}

export function StatusBadge({ status, label }: { status: KodeStatus; label?: string }) {
  const gaya = GAYA_STATUS[status];
  return <span className={gaya.className}>{label ?? gaya.label}</span>;
}
