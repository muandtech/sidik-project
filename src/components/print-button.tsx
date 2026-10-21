"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg border border-brand bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
    >
      <Printer className="size-4" aria-hidden /> Cetak / Simpan PDF
    </button>
  );
}
