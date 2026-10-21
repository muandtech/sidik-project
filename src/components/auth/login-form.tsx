"use client";

import { useActionState, useState } from "react";
import { CircleAlert, Eye, EyeOff, Lock, RefreshCw, User } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 inline-flex rounded bg-white px-2 py-0.5 text-xs font-medium text-red-700">
      {message}
    </p>
  );
}

export function LoginForm({
  contohUsername,
  labelTombol,
  bantuanLupaPassword,
}: {
  contohUsername?: string;
  labelTombol?: string;
  bantuanLupaPassword?: string;
}) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [showPassword, setShowPassword] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  const captchaSrc = `/api/captcha?v=${state.attempt ?? 0}-${refresh}`;
  const inputBase =
    "w-full rounded-lg border bg-white/95 py-2.5 text-[15px] text-ink placeholder:text-gray-500 outline-none transition focus:bg-white focus:ring-2 focus:ring-brand/60";

  return (
    <form action={action} noValidate className="space-y-5">
      {state.message && (
        <div role="alert" className="flex items-start gap-2 rounded-lg bg-white px-3 py-2.5 text-sm text-red-700">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{state.message}</span>
        </div>
      )}

      <div>
        <label htmlFor="identifier" className="mb-1.5 block text-sm font-semibold text-ink">
          NIM / Username
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-gray-500" aria-hidden />
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder={contohUsername}
            defaultValue={state.identifier}
            aria-invalid={Boolean(state.errors?.identifier)}
            aria-describedby={state.errors?.identifier ? "identifier-error" : undefined}
            className={`${inputBase} pr-4 pl-11 ${state.errors?.identifier ? "border-red-500" : "border-gray-200"}`}
          />
        </div>
        <FieldError id="identifier-error" message={state.errors?.identifier} />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-gray-500" aria-hidden />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Masukkan password"
            aria-invalid={Boolean(state.errors?.password)}
            aria-describedby={state.errors?.password ? "password-error" : undefined}
            className={`${inputBase} pr-11 pl-11 ${state.errors?.password ? "border-red-500" : "border-gray-200"}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <FieldError id="password-error" message={state.errors?.password} />
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-ink/90">
          <input type="checkbox" name="remember" className="size-4 rounded border-white accent-brand" />
          Ingat Saya
        </label>
        {bantuanLupaPassword && (
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            className="font-semibold text-white hover:underline"
          >
            Lupa Password?
          </button>
        )}
      </div>
      {showHelp && bantuanLupaPassword && (
        <p className="rounded-lg bg-white/95 px-3 py-2.5 text-xs leading-relaxed text-ink">{bantuanLupaPassword}</p>
      )}

      <div>
        <label htmlFor="captcha" className="mb-1.5 block text-sm font-semibold text-ink">
          CAPTCHA
        </label>
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG dinamis dari route handler */}
            <img src={captchaSrc} alt="Kode CAPTCHA" width={132} height={48} className="shrink-0 rounded" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink">Masukkan kode di atas</p>
              <p className="text-xs leading-snug text-muted">Gunakan huruf besar dan kecil sesuai gambar.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              key={state.attempt}
              id="captcha"
              name="captcha"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Masukkan kode CAPTCHA"
              aria-invalid={Boolean(state.errors?.captcha)}
              aria-describedby={state.errors?.captcha ? "captcha-error" : undefined}
              className={`w-full rounded-lg border px-4 py-2.5 text-[15px] text-ink outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-brand/60 ${state.errors?.captcha ? "border-red-500" : "border-gray-200"}`}
            />
            <button
              type="button"
              onClick={() => setRefresh((v) => v + 1)}
              aria-label="Muat ulang CAPTCHA"
              className="grid size-11 shrink-0 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
          {state.errors?.captcha && (
            <p id="captcha-error" className="text-xs font-medium text-red-700">
              {state.errors.captcha}
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-login py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:cursor-wait disabled:opacity-80"
      >
        {pending ? "Memproses…" : (labelTombol ?? "Masuk")}
      </button>
    </form>
  );
}
