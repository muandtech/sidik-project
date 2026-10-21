// Menjalankan berkas SQL di folder database/ secara berurutan.
//   node scripts/db.mjs schema data-master   → buat ulang tabel + data master aplikasi
//   node scripts/db.mjs data-demo            → isi data contoh (opsional)
// Nama database diambil dari DB_NAME di .env.local dan dibuat otomatis bila belum ada.
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Sebutkan berkas SQL, mis.: node scripts/db.mjs schema data-master");
  process.exit(1);
}

const database = process.env.DB_NAME ?? "sidik_db";
const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  multipleStatements: true,
});

try {
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.query(`USE \`${database}\``);
  for (const name of files) {
    const sql = await readFile(new URL(`../database/${name}.sql`, import.meta.url), "utf8");
    await connection.query(sql);
    console.log(`✓ ${name}.sql dijalankan pada database ${database}`);
  }
} catch (error) {
  console.error("✗ Gagal:", error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
