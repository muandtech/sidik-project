import "server-only";
import type { PoolConnection } from "mysql2/promise";
import { db } from "@/lib/db";
import { getClientInfo } from "@/lib/session";

export type NilaiAudit = Record<string, string | number | null>;

/** Rincian perubahan data penting: objek yang diubah, nilai sebelum/sesudah, dan alasan (Guide §3.6, BR-SD-10). */
export type DetailAudit = {
  entitas: string;
  entitasId: number;
  dataLama?: NilaiAudit | null;
  dataBaru?: NilaiAudit | null;
  alasan?: string | null;
};

/** Mencatat aksi ke audit_log; kirim `conn` agar ikut dalam transaksi yang sedang berjalan. */
export async function catatAudit(
  userId: number | null,
  aksi: string,
  keterangan: string | null = null,
  conn?: PoolConnection,
  detail?: DetailAudit,
) {
  const { ip, userAgent } = await getClientInfo();
  await (conn ?? db).execute(
    `INSERT INTO audit_log
       (user_id, aksi, keterangan, entitas, entitas_id, data_lama, data_baru, alasan, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      aksi,
      keterangan,
      detail?.entitas ?? null,
      detail?.entitasId ?? null,
      detail?.dataLama ? JSON.stringify(detail.dataLama) : null,
      detail?.dataBaru ? JSON.stringify(detail.dataBaru) : null,
      detail?.alasan?.slice(0, 255) ?? null,
      ip,
      userAgent,
    ],
  );
}
