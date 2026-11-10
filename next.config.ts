import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Security header (Guide §3.9, temuan audit S3).
// CSP tanpa nonce: Next.js menyisipkan script inline untuk hydration, jadi script-src masih butuh 'unsafe-inline'.
// Perlindungan utamanya: tidak ada sumber eksternal, tidak bisa di-iframe (clickjacking), form hanya ke domain sendiri.
// Peningkatan berikutnya: CSP bernonce lewat src/proxy.ts (lihat node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Diabaikan browser bila diakses lewat HTTP biasa, jadi aman untuk `npm start` lokal.
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
