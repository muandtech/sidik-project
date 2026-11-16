"use server";

import { refresh } from "next/cache";
import { GagalAksi } from "@/lib/gagal-aksi";
import {
  ajukanKrs,
  batalkanPengajuanKrs,
  getDosenByUser,
  getMahasiswaKrs,
  hapusKelasKrs,
  putuskanKrs,
  setujuiKrsMassal,
  tambahKelasKrs,
} from "@/lib/krs";
import type { Role } from "@/lib/peran";
import { getSessionUser, type SessionUser } from "@/lib/session";

// Server Action akademik: cek session & role aktif → baca input → panggil src/lib/krs.ts.
// Kepemilikan data (KRS milik sendiri / bimbingan sendiri) diperiksa di src/lib, di dalam transaksi.

export type AksiState = { error?: string; sukses?: string };

async function jalankan(roles: readonly Role[], aksi: (user: SessionUser) => Promise<string>): Promise<AksiState> {
  const user = await getSessionUser();
  if (!user || !roles.includes(user.role)) return { error: "Anda tidak berhak melakukan aksi ini dengan role yang aktif." };
  try {
    const sukses = await aksi(user);
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

/** Mahasiswa yang sedang login (KRS selalu milik sendiri; id mahasiswa tidak pernah diambil dari form). */
async function mahasiswaSaya(user: SessionUser) {
  const mhs = await getMahasiswaKrs(user.userId);
  if (!mhs) throw new GagalAksi("Data mahasiswa tidak ditemukan.");
  return mhs;
}

async function dosenSaya(user: SessionUser) {
  const dosen = await getDosenByUser(user.userId);
  if (!dosen) throw new GagalAksi("Akun ini belum terhubung dengan data dosen.");
  return dosen;
}

export async function tambahKelas(_prev: AksiState, formData: FormData): Promise<AksiState> {
  return jalankan(["mahasiswa"], async (user) => tambahKelasKrs((await mahasiswaSaya(user)).id, idDari(formData, "kelas_id")));
}

export async function hapusKelas(_prev: AksiState, formData: FormData): Promise<AksiState> {
  return jalankan(["mahasiswa"], async (user) => hapusKelasKrs((await mahasiswaSaya(user)).id, idDari(formData, "kelas_id")));
}

export async function ajukan(): Promise<AksiState> {
  return jalankan(["mahasiswa"], async (user) => ajukanKrs((await mahasiswaSaya(user)).id, user.userId));
}

export async function batalkanPengajuan(): Promise<AksiState> {
  return jalankan(["mahasiswa"], async (user) => batalkanPengajuanKrs((await mahasiswaSaya(user)).id, user.userId));
}

/** Dosen PA menyetujui/menolak satu KRS. Kaprodi juga dosen, jadi boleh memakai role kaprodi. */
export async function putuskan(_prev: AksiState, formData: FormData): Promise<AksiState> {
  return jalankan(["dosen", "kaprodi"], async (user) => {
    const keputusan = formData.get("keputusan") === "tolak" ? "tolak" : "setujui";
    return putuskanKrs(
      idDari(formData, "krs_id"),
      (await dosenSaya(user)).id,
      user.userId,
      keputusan,
      String(formData.get("catatan") ?? ""),
    );
  });
}

export async function setujuiMassal(_prev: AksiState, formData: FormData): Promise<AksiState> {
  return jalankan(["dosen", "kaprodi"], async (user) => {
    const ids = formData
      .getAll("krs_id")
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, 200);
    if (ids.length === 0) throw new GagalAksi("Pilih minimal satu KRS.");
    const { berhasil, gagal } = await setujuiKrsMassal(ids, (await dosenSaya(user)).id, user.userId);
    if (gagal.length > 0) throw new GagalAksi(`${berhasil} disetujui; ${gagal.length} gagal: ${gagal.slice(0, 3).join(" ")}`);
    return `${berhasil} KRS disetujui.`;
  });
}
