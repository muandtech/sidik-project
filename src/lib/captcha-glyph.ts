import "server-only";

// Gambar CAPTCHA dibuat dari garis (path SVG), bukan elemen <text>, agar kodenya tidak bisa dibaca
// langsung dari isi SVG oleh bot (temuan audit T1, docs/audit/2026-11-10-audit-kode.md).

type Titik = readonly [x: number, y: number];
type Glyph = readonly (readonly Titik[])[];

// Setiap karakter digambar sebagai satu atau beberapa garis pada grid 4 × 6 (x ke kanan, y ke bawah).
// Karakter yang mudah tertukar (I/1, O/0, S/5) sengaja tidak dipakai.
const GLYPH: Record<string, Glyph> = {
  A: [[[0, 6], [0, 2], [2, 0], [4, 2], [4, 6]], [[0, 3.5], [4, 3.5]]],
  B: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]], [[0, 0], [3, 0], [4, 1], [4, 2], [3, 3]]],
  C: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]],
  D: [[[0, 0], [0, 6], [2.5, 6], [4, 4.5], [4, 1.5], [2.5, 0], [0, 0]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  G: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3.5], [2, 3.5]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  J: [[[4, 0], [4, 5], [3, 6], [1, 6], [0, 5]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 3.5]], [[1.3, 2.7], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  P: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]]],
  Q: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]], [[2.5, 4.5], [4, 6.3]]],
  R: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[2, 3], [4, 6]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [1, 6], [2, 3], [3, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]],
  Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
  "2": [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [0, 6], [4, 6]]],
  "3": [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [1.5, 3]], [[3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]]],
  "4": [[[3, 6], [3, 0], [0, 4], [4, 4]]],
  "6": [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]]],
  "7": [[[0, 0], [4, 0], [1.5, 6]]],
  "8": [
    [[1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [1, 3], [0, 4], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3]],
  ],
  "9": [[[4, 3], [1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5]]],
};

/** Karakter yang dapat muncul di CAPTCHA — selalu punya glyph. */
export const CAPTCHA_CHARSET = Object.keys(GLYPH).join("");

const WIDTH = 132;
const HEIGHT = 48;
const WARNA = ["#374151", "#4b5563", "#1f2937", "#6b7280"];

const acak = (min: number, max: number) => min + Math.random() * (max - min);
const pilih = <T,>(daftar: readonly T[]) => daftar[Math.floor(Math.random() * daftar.length)];
const f = (n: number) => n.toFixed(1);

/** Mengubah satu karakter menjadi garis-garis berkoordinat layar, dengan skala, rotasi, dan getaran acak. */
function garisKarakter(char: string, cx: number, cy: number): string[] {
  const glyph = GLYPH[char];
  if (!glyph) throw new Error(`Karakter CAPTCHA tanpa glyph: ${char}`);
  const skala = acak(4.1, 4.7);
  const sudut = acak(-0.35, 0.35);
  const [sin, cos] = [Math.sin(sudut), Math.cos(sudut)];

  return glyph.map((garis) =>
    garis
      .map(([x, y], i) => {
        const dx = (x - 2) * skala;
        const dy = (y - 3) * skala;
        const px = cx + dx * cos - dy * sin + acak(-0.7, 0.7);
        const py = cy + dx * sin + dy * cos + acak(-0.7, 0.7);
        return `${i === 0 ? "M" : "L"}${f(px)} ${f(py)}`;
      })
      .join(""),
  );
}

function acakUrutan<T>(daftar: T[]) {
  for (let i = daftar.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [daftar[i], daftar[j]] = [daftar[j], daftar[i]];
  }
  return daftar;
}

export function renderCaptchaSvg(code: string) {
  // Garis semua karakter diacak urutannya agar tidak bisa dipisahkan per elemen.
  const garis = acakUrutan([...code].flatMap((char, i) => garisKarakter(char, 18 + i * 24, acak(22, 26))));
  const huruf = garis
    .map(
      (d) =>
        `<path d="${d}" stroke="${pilih(WARNA)}" stroke-width="${f(acak(2.2, 2.8))}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    )
    .join("");

  const derau = Array.from(
    { length: 5 },
    () =>
      `<path d="M${f(acak(0, 20))} ${f(acak(5, 43))} Q ${f(acak(40, 90))} ${f(acak(0, 48))} ${f(acak(110, 132))} ${f(acak(5, 43))}" stroke="${pilih(WARNA)}" stroke-opacity="0.35" stroke-width="${f(acak(1, 2))}" fill="none"/>`,
  ).join("");

  const titik = Array.from(
    { length: 30 },
    () => `<circle cx="${f(acak(0, WIDTH))}" cy="${f(acak(0, HEIGHT))}" r="${f(acak(0.6, 1.4))}" fill="#9ca3af" fill-opacity="0.6"/>`,
  ).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><rect width="100%" height="100%" fill="#eef0f3"/>${titik}${derau}${huruf}</svg>`;
}
