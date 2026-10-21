import "server-only";
import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";

const globalForDb = globalThis as unknown as { sidikPool?: Pool };

function createPool() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "sidik_db",
    connectionLimit: 10,
    // Tanggal dikembalikan sebagai string "YYYY-MM-DD HH:mm:ss" (WIB) agar tidak bergeser zona waktu.
    dateStrings: true,
    timezone: "+07:00",
  });
  pool.on("connection", (connection) => {
    connection.query("SET time_zone = '+07:00'");
  });
  return pool;
}

// Simpan pool di globalThis supaya hot reload saat development tidak membuat koneksi baru terus-menerus.
export const db = globalForDb.sidikPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.sidikPool = db;

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await db.query<RowDataPacket[]>(sql, params);
  return rows as T[];
}

export async function queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Menjalankan `fn` dalam satu transaksi; rollback otomatis bila terjadi error. */
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
