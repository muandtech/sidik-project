import "server-only";
import type { PoolConnection } from "mysql2/promise";
import { db } from "@/lib/db";
import { getClientInfo } from "@/lib/session";

/** Mencatat aksi ke audit_log; kirim `conn` agar ikut dalam transaksi yang sedang berjalan. */
export async function catatAudit(
  userId: number | null,
  aksi: string,
  keterangan: string | null = null,
  conn?: PoolConnection,
) {
  const { ip, userAgent } = await getClientInfo();
  await (conn ?? db).execute(
    "INSERT INTO audit_log (user_id, aksi, keterangan, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
    [userId, aksi, keterangan, ip, userAgent],
  );
}
