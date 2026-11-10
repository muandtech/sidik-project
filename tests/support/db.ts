import { db } from "@/lib/db";

/** Menutup pool koneksi setelah satu berkas test selesai. */
export async function tutupDb() {
  await db.end();
  delete (globalThis as { sidikPool?: unknown }).sidikPool;
}
