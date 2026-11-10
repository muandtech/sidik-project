"use server";

import { refresh } from "next/cache";
import {
  bentukCicilan,
  gabungkanCicilan,
  GagalAksi,
  koreksiTagihan,
  koreksiTermin,
  validasiAlasan,
  validasiPembayaran,
  verifikasiTagihan,
  verifikasiTermin,
} from "@/lib/keuangan-aksi";
import { getSessionUser } from "@/lib/session";

// Server Action Admin Keuangan: cek session/role → baca & validasi input → panggil src/lib/keuangan-aksi.ts.

export type AksiState = { error?: string; sukses?: string };

const BUKAN_KEUANGAN = "Hanya Admin Keuangan yang dapat mengubah tagihan.";

/**
 * Server action dapat dipanggil lewat POST langsung, jadi hak akses selalu diperiksa di sini, bukan hanya
 * dengan menyembunyikan tombol. Kesalahan GagalAksi dikembalikan sebagai pesan; error lain tetap dilempar.
 */
async function jalankan(aksi: (userId: number) => Promise<string>): Promise<AksiState> {
  const user = await getSessionUser();
  if (!user || user.role !== "keuangan") return { error: BUKAN_KEUANGAN };
  try {
    const sukses = await aksi(user.userId);
    refresh();
    return { sukses };
  } catch (error) {
    if (error instanceof GagalAksi) return { error: error.message };
    throw error;
  }
}

function idDari(formData: FormData, key: string) {
  const id = Number(formData.get(key));
  if (!Number.isInteger(id) || id <= 0) throw new GagalAksi("Data tidak valid. Muat ulang halaman lalu coba lagi.");
  return id;
}

function teks(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function bacaPembayaran(formData: FormData) {
  return validasiPembayaran({
    tanggal: teks(formData, "tanggal_bayar"),
    metode: teks(formData, "metode_bayar"),
    catatan: teks(formData, "catatan"),
  });
}

/** ACC satu termin cicilan bulanan sebagai lunas (BR-SD-08). */
export async function accTermin(_prev: AksiState, formData: FormData): Promise<AksiState> {
  return jalankan(async (userId) =>
    verifikasiTermin(idDari(formData, "termin_id"), await bacaPembayaran(formData), userId),
  );
}

/** Membatalkan status lunas satu termin dengan alasan wajib (BR-SD-10). */
export async function batalkanTermin(_prev: AksiState, formData: FormData): Promise<AksiState> {
  return jalankan(async (userId) =>
    koreksiTermin(idDari(formData, "termin_id"), validasiAlasan(teks(formData, "alasan")), userId),
  );
}

/** ACC tagihan yang dibayar sekaligus (tanpa cicilan). */
export async function accTagihan(_prev: AksiState, formData: FormData): Promise<AksiState> {
  return jalankan(async (userId) =>
    verifikasiTagihan(idDari(formData, "tagihan_id"), await bacaPembayaran(formData), userId),
  );
}

/** Membatalkan status lunas tagihan bayar sekaligus dengan alasan wajib (BR-SD-10). */
export async function batalkanTagihan(_prev: AksiState, formData: FormData): Promise<AksiState> {
  return jalankan(async (userId) =>
    koreksiTagihan(idDari(formData, "tagihan_id"), validasiAlasan(teks(formData, "alasan")), userId),
  );
}

/** Memecah tagihan yang belum dibayar menjadi cicilan bulanan (FR-KEU-08, BR-SD-13). */
export async function pecahCicilan(_prev: AksiState, formData: FormData): Promise<AksiState> {
  return jalankan(async (userId) =>
    bentukCicilan(idDari(formData, "tagihan_id"), Number(formData.get("jumlah_termin")), teks(formData, "mulai"), userId),
  );
}

/** Menggabungkan kembali cicilan menjadi bayar sekaligus (BR-SD-15). */
export async function gabungCicilan(_prev: AksiState, formData: FormData): Promise<AksiState> {
  return jalankan(async (userId) => gabungkanCicilan(idDari(formData, "tagihan_id"), userId));
}
