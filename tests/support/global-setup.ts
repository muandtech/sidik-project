import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

/** Membuat ulang database test dari schema.sql + data-master.sql sebelum seluruh test berjalan. */
export default async function setup() {
  const database = process.env.DB_NAME ?? "";
  // Pengaman: test menghapus database, jadi tidak boleh pernah menyentuh database development/produksi.
  if (!/^[A-Za-z0-9_]+_test$/.test(database)) {
    throw new Error(`Database test harus berakhiran "_test" (sekarang: "${database}").`);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await conn.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${database}\``);
    for (const name of ["schema", "data-master"]) {
      await conn.query(await readFile(new URL(`../../database/${name}.sql`, import.meta.url), "utf8"));
    }
  } finally {
    await conn.end();
  }
}
