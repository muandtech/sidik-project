"use client";

import { useActionState, type ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

export type AksiState = { error?: string; sukses?: string };
type Aksi = (prev: AksiState, formData: FormData) => Promise<AksiState>;

const GAYA = {
  primary: "border-brand bg-brand text-white hover:bg-brand-dark",
  outline: "border-brand bg-white text-brand hover:bg-brand-soft",
  danger: "border-danger bg-white text-danger hover:bg-red-50",
} as const;

export function PesanAksi({ state }: { state: AksiState }) {
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

/**
 * Form satu tombol untuk Server Action, dengan nilai tersembunyi dan pesan hasil.
 * `children` dapat berisi field tambahan (mis. textarea catatan).
 */
export function AksiForm({
  action,
  label,
  labelProses = "Memproses…",
  hidden = {},
  variant = "primary",
  children,
  className = "",
}: {
  action: Aksi;
  label: string;
  labelProses?: string;
  hidden?: Record<string, string | number>;
  variant?: keyof typeof GAYA;
  children?: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<AksiState, FormData>(action, {});
  return (
    <form action={formAction} className={`space-y-1.5 ${className}`}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-[13px] font-semibold disabled:opacity-60 ${GAYA[variant]}`}
      >
        {pending ? labelProses : label}
      </button>
      <PesanAksi state={state} />
    </form>
  );
}
