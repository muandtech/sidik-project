import Link from "next/link";
import type { ReactNode } from "react";
import type { ButtonVariant, MenuItem } from "@/lib/konfigurasi";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-white ${className}`}>{children}</section>;
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 sm:px-5 sm:pt-5">
      <h2 className="text-[17px] font-bold text-ink">{title}</h2>
      {action}
    </div>
  );
}

export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="shrink-0 text-[13px] font-semibold text-brand hover:underline">
      {children}
    </Link>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  boxed = false,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  boxed?: boolean;
}) {
  return (
    <div
      className={`mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
        boxed ? "rounded-xl border border-line bg-white px-4 py-4 sm:px-5" : ""
      }`}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark border border-brand",
  outline: "border border-brand text-brand bg-white hover:bg-brand-soft",
  plain: "border border-line bg-white text-ink hover:bg-canvas",
  soft: "bg-brand-soft text-brand hover:bg-brand-muted",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition ${buttonStyles[variant]}`}
    >
      {children}
    </Link>
  );
}

/** Tombol aksi yang bersumber dari tabel `menu` (grup aksi_*). */
export function MenuButtons({ items }: { items: MenuItem[] }) {
  if (items.length === 0) return null;
  return (
    <>
      {items.map((item) =>
        item.href ? (
          <ButtonLink key={item.id} href={item.href} variant={item.varian ?? "primary"}>
            {item.label}
          </ButtonLink>
        ) : null,
      )}
    </>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-canvas px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

/** Baris label–nilai untuk halaman biodata. */
export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="text-sm break-words text-ink">{value}</dd>
    </div>
  );
}
