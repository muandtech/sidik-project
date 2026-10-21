const TZ = "Asia/Jakarta";

/** Mengubah string DATETIME MySQL ("YYYY-MM-DD HH:mm:ss", WIB) menjadi Date. */
export function parseDbDate(value: string) {
  const iso = value.length <= 10 ? `${value}T00:00:00` : value.replace(" ", "T");
  return new Date(`${iso}+07:00`);
}

export function formatRupiah(value: number | string) {
  return `Rp ${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

export function formatTanggal(value: string | null | undefined, withTime = false) {
  if (!value) return "-";
  return parseDbDate(value).toLocaleString("id-ID", {
    timeZone: TZ,
    day: "2-digit",
    month: withTime ? "long" : "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatTanggalPanjang(value: string | null | undefined) {
  if (!value) return "-";
  return parseDbDate(value).toLocaleDateString("id-ID", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** DATE/DATETIME → "Oktober 2026" (atau "Okt 2026" bila `pendek`). */
export function formatBulan(value: string, pendek = false) {
  return parseDbDate(value).toLocaleDateString("id-ID", {
    timeZone: TZ,
    month: pendek ? "short" : "long",
    year: "numeric",
  });
}

/** Kunci bulan "YYYY-MM" dari DATE/DATETIME MySQL, dipakai untuk mengelompokkan cicilan per bulan. */
export function kunciBulan(value: string) {
  return value.slice(0, 7);
}

/** Tanggal hari ini (WIB) dalam format "YYYY-MM-DD". */
export function tanggalHariIniWib(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** true bila tanggal jatuh tempo (DATE) sudah lewat — jatuh tempo berlaku sampai akhir hari. */
export function lewatJatuhTempo(jatuhTempo: string, now = new Date()) {
  return parseDbDate(`${jatuhTempo} 23:59:59`) < now;
}

export function formatJam(value: string) {
  // TIME "08:00:00" atau DATETIME → "08:00"
  const time = value.length > 8 ? value.slice(11, 16) : value.slice(0, 5);
  return time;
}

export function formatWaktuRelatif(value: string, now = new Date()) {
  const date = parseDbDate(value);
  const diffMinutes = Math.round((now.getTime() - date.getTime()) / 60000);
  const jam = date.toLocaleTimeString("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

  if (diffMinutes < 1) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`;
  if (diffMinutes < 24 * 60) return `${Math.floor(diffMinutes / 60)} jam yang lalu`;

  const hariIni = new Date(now.toLocaleDateString("en-CA", { timeZone: TZ }));
  const tanggal = new Date(date.toLocaleDateString("en-CA", { timeZone: TZ }));
  const diffDays = Math.round((hariIni.getTime() - tanggal.getTime()) / 86400000);
  if (diffDays === 1) return `Kemarin, ${jam}`;
  if (diffDays < 7) return `${diffDays} hari yang lalu`;
  return formatTanggal(value);
}

export function formatUkuranBerkas(kb: number | null) {
  if (kb == null) return "-";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export function inisial(nama: string) {
  return nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Nilai kosong ditampilkan sebagai "-" agar layout tetap rapi. */
export function orDash(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

/** 1 = Senin ... 7 = Minggu, mengikuti kolom jadwal_kuliah.hari. */
export function hariIniWib(now = new Date()) {
  const day = new Date(now.toLocaleString("en-US", { timeZone: TZ })).getDay();
  return day === 0 ? 7 : day;
}

export function sapaan(now = new Date()) {
  const hour = Number(now.toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false }));
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}
