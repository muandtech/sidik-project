"use client";

import { useActionState } from "react";
import { gantiPassword, type GantiPasswordState } from "@/app/actions/auth";
import { PesanAksi } from "@/components/aksi-form";

const inputClass =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

/** Form ganti password (SD-S2-04). Kebijakan password diperiksa ulang di server. */
export function FormGantiPassword({ minimal }: { minimal: number }) {
  const [state, action, pending] = useActionState<GantiPasswordState, FormData>(gantiPassword, {});
  return (
    <form action={action} className="max-w-md space-y-4">
      {(
        [
          ["password_lama", "Password lama", "current-password"],
          ["password_baru", `Password baru (min. ${minimal} karakter, huruf & angka)`, "new-password"],
          ["password_ulang", "Ulangi password baru", "new-password"],
        ] as const
      ).map(([name, label, autoComplete]) => (
        <div key={name}>
          <label htmlFor={name} className="mb-1 block text-sm font-medium">
            {label}
          </label>
          <input id={name} name={name} type="password" required autoComplete={autoComplete} className={inputClass} />
        </div>
      ))}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-brand bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : "Simpan password baru"}
      </button>
      <PesanAksi state={state} />
    </form>
  );
}
