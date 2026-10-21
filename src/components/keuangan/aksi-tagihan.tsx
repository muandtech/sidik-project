"use client";

import { useActionState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import {
  accTagihan,
  accTermin,
  batalkanTagihan,
  batalkanTermin,
  gabungCicilan,
  pecahCicilan,
  type AksiState,
} from "@/app/actions/keuangan";

const inputClass =
  "rounded-md border border-line bg-white px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
const primaryButton =
  "inline-flex items-center justify-center rounded-md border border-brand bg-brand px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60";
const dangerButton =
  "inline-flex items-center justify-center rounded-md border border-danger bg-white px-3 py-1.5 text-[13px] font-semibold text-danger hover:bg-red-50 disabled:opacity-60";

function Pesan({ state }: { state: AksiState }) {
  if (state.error) {
    return (
      <p role="alert" className="flex items-start gap-1.5 text-xs font-medium text-danger">
        <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden /> {state.error}
      </p>
    );
  }
  if (state.sukses) {
    return (
      <p role="status" className="flex items-start gap-1.5 text-xs font-medium text-success">
        <CircleCheck className="mt-px size-3.5 shrink-0" aria-hidden /> {state.sukses}
      </p>
    );
  }
  return null;
}

type Target = { jenis: "termin"; id: number } | { jenis: "tagihan"; id: number };

function HiddenTarget({ target }: { target: Target }) {
  return <input type="hidden" name={target.jenis === "termin" ? "termin_id" : "tagihan_id"} value={target.id} />;
}

/** Form ACC lunas: tanggal bayar, metode, catatan opsional. */
export function AccForm({
  target,
  metodeBayar,
  hariIni,
  label,
}: {
  target: Target;
  metodeBayar: string[];
  hariIni: string;
  label: string;
}) {
  const [state, action, pending] = useActionState<AksiState, FormData>(
    target.jenis === "termin" ? accTermin : accTagihan,
    {},
  );
  const prefix = `${target.jenis}-${target.id}`;

  return (
    <form action={action} className="space-y-1.5">
      <HiddenTarget target={target} />
      <div className="flex flex-wrap items-center gap-1.5">
        <label htmlFor={`${prefix}-tanggal`} className="sr-only">
          Tanggal bayar
        </label>
        <input
          id={`${prefix}-tanggal`}
          type="date"
          name="tanggal_bayar"
          defaultValue={hariIni}
          max={hariIni}
          required
          className={inputClass}
        />
        <label htmlFor={`${prefix}-metode`} className="sr-only">
          Metode pembayaran
        </label>
        <select id={`${prefix}-metode`} name="metode_bayar" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Metode bayar…
          </option>
          {metodeBayar.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <label htmlFor={`${prefix}-catatan`} className="sr-only">
          Catatan (opsional)
        </label>
        <input
          id={`${prefix}-catatan`}
          name="catatan"
          placeholder="Catatan (opsional)"
          maxLength={255}
          className={`${inputClass} w-40`}
        />
        <button type="submit" disabled={pending} className={primaryButton} aria-label={`${label}: ACC lunas`}>
          {pending ? "Menyimpan…" : "ACC Lunas"}
        </button>
      </div>
      <Pesan state={state} />
    </form>
  );
}

/** Koreksi status lunas menjadi belum bayar; alasan wajib dan tercatat di audit log. */
export function BatalForm({ target, label }: { target: Target; label: string }) {
  const [state, action, pending] = useActionState<AksiState, FormData>(
    target.jenis === "termin" ? batalkanTermin : batalkanTagihan,
    {},
  );
  const id = `${target.jenis}-${target.id}-alasan`;

  return (
    <details className="group">
      <summary className="cursor-pointer text-xs font-semibold text-danger hover:underline">Batalkan / koreksi</summary>
      <form action={action} className="mt-2 space-y-1.5">
        <HiddenTarget target={target} />
        <label htmlFor={id} className="block text-xs text-muted">
          Alasan koreksi {label}
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          <input id={id} name="alasan" required minLength={5} maxLength={200} className={`${inputClass} w-56`} />
          <button type="submit" disabled={pending} className={dangerButton}>
            {pending ? "Menyimpan…" : "Jadikan Belum Bayar"}
          </button>
        </div>
        <Pesan state={state} />
      </form>
    </details>
  );
}

/** Memecah tagihan bayar sekaligus menjadi cicilan bulanan. */
export function PecahCicilanForm({
  tagihanId,
  maksTermin,
  defaultMulai,
}: {
  tagihanId: number;
  maksTermin: number;
  defaultMulai: string;
}) {
  const [state, action, pending] = useActionState<AksiState, FormData>(pecahCicilan, {});
  const pilihan = Array.from({ length: Math.max(maksTermin - 1, 0) }, (_, i) => i + 2);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="tagihan_id" value={tagihanId} />
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="jumlah_termin" className="mb-1 block text-xs font-medium text-muted">
            Jumlah termin (bulan)
          </label>
          <select id="jumlah_termin" name="jumlah_termin" defaultValue={maksTermin} className={inputClass}>
            {pilihan.map((n) => (
              <option key={n} value={n}>
                {n}× cicilan
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="mulai" className="mb-1 block text-xs font-medium text-muted">
            Jatuh tempo termin pertama
          </label>
          <input id="mulai" type="date" name="mulai" defaultValue={defaultMulai} required className={inputClass} />
        </div>
        <button type="submit" disabled={pending || pilihan.length === 0} className={primaryButton}>
          {pending ? "Menyimpan…" : "Buat Cicilan Bulanan"}
        </button>
      </div>
      <Pesan state={state} />
    </form>
  );
}

export function GabungCicilanForm({ tagihanId }: { tagihanId: number }) {
  const [state, action, pending] = useActionState<AksiState, FormData>(gabungCicilan, {});
  return (
    <form action={action} className="space-y-1.5">
      <input type="hidden" name="tagihan_id" value={tagihanId} />
      <button type="submit" disabled={pending} className={dangerButton}>
        {pending ? "Menyimpan…" : "Gabung Kembali Jadi Bayar Sekaligus"}
      </button>
      <Pesan state={state} />
    </form>
  );
}
