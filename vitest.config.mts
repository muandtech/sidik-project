import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Koneksi MySQL diambil dari .env.local, tetapi test SELALU memakai database terpisah (default sidik_test)
// yang dibuat ulang setiap kali test dijalankan — lihat tests/global-setup.ts dan ENGINEERING_GUIDE §6.2.
const env = loadEnv("test", process.cwd(), "");
Object.assign(process.env, {
  DB_HOST: env.DB_HOST ?? "127.0.0.1",
  DB_PORT: env.DB_PORT ?? "3306",
  DB_USER: env.DB_USER ?? "root",
  DB_PASSWORD: env.DB_PASSWORD ?? "",
  DB_NAME: env.DB_TEST_NAME || "sidik_test",
  AUTH_SECRET: "rahasia-khusus-test-bukan-untuk-produksi",
  TRUST_PROXY: "false",
});

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // Paket server-only melempar error di luar React Server Components; di test cukup modul kosong.
      "server-only": path.resolve(import.meta.dirname, "tests/support/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    // Semua berkas test memakai satu database yang sama.
    fileParallelism: false,
  },
});
