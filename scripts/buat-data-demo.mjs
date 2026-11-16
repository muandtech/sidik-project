// Membuat database/data-demo.sql = scripts/demo/inti.sql (akun & data tulis tangan) + data simulasi akademik.
//   npm run db:demo:buat   → tulis ulang database/data-demo.sql
//   npm run db:demo        → import ke database
//
// Simulasi bersifat deterministik (seed tetap): kurikulum 6 prodi, angkatan 2023–2026, riwayat nilai 6 semester,
// kelas & jadwal tanpa bentrok, tagihan semester aktif, serta KRS dengan status yang beragam.
// SEMUA DATA FIKTIF — jangan pernah memakai data mahasiswa asli di sini.
import { readFile, writeFile } from "node:fs/promises";

// ---------------------------------------------------------------------------------------------
// Utilitas
// ---------------------------------------------------------------------------------------------

let benih = 20261116;
/** PRNG deterministik (mulberry32) supaya data selalu sama setiap kali dibuat. */
function acak() {
  benih = (benih + 0x6d2b79f5) | 0;
  let t = benih;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pilih = (arr) => arr[Math.floor(acak() * arr.length)];

function sqlNilai(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && v.sql) return v.sql;
  return `'${String(v).replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;
}
const mentah = (sql) => ({ sql });

/** INSERT bertahap (maks 400 baris per pernyataan). */
function insert(tabel, kolom, baris) {
  if (baris.length === 0) return "";
  const out = [];
  for (let i = 0; i < baris.length; i += 400) {
    const potong = baris.slice(i, i + 400).map((b) => `  (${kolom.map((k) => sqlNilai(b[k])).join(", ")})`);
    out.push(`INSERT INTO ${tabel} (${kolom.join(", ")}) VALUES\n${potong.join(",\n")};\n`);
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------------------------
// Konfigurasi akademik (harus sama dengan data-master.sql: bobot_nilai & batas_sks)
// ---------------------------------------------------------------------------------------------

const BOBOT = [
  ["A", 85, 4.0], ["A-", 80, 3.75], ["B+", 75, 3.5], ["B", 70, 3.0], ["B-", 65, 2.75],
  ["C+", 60, 2.5], ["C", 55, 2.0], ["D", 45, 1.0], ["E", 0, 0.0],
];
const BOBOT_MIN_PRASYARAT = 2.0; // huruf C (pengaturan krs_huruf_min_prasyarat)
const hurufDari = (skor) => BOBOT.find(([, min]) => skor >= min);
const bobotHuruf = (h) => BOBOT.find(([x]) => x === h)[2];
function maksSksDariIps(ips) {
  if (ips >= 3.0) return 24;
  if (ips >= 2.5) return 21;
  if (ips >= 2.0) return 18;
  return 15;
}
/** Sama dengan hitungIndeks() di src/lib/akademik.ts. */
function indeks(rows) {
  let sks = 0;
  let mutu = 0;
  for (const r of rows) {
    sks += r.sks;
    mutu += Math.round(r.bobot * 100) * r.sks;
  }
  return sks === 0 ? null : Math.round(mutu / sks) / 100;
}

const TAHUN_AKADEMIK = [
  { id: 1, kode: "20231", tahun: "2023/2024", periode: "Ganjil", mulai: "2023-09-04", selesai: "2024-01-26" },
  { id: 2, kode: "20232", tahun: "2023/2024", periode: "Genap", mulai: "2024-02-19", selesai: "2024-07-05" },
  { id: 3, kode: "20241", tahun: "2024/2025", periode: "Ganjil", mulai: "2024-09-02", selesai: "2025-01-24" },
  { id: 4, kode: "20242", tahun: "2024/2025", periode: "Genap", mulai: "2025-02-17", selesai: "2025-07-04" },
  { id: 5, kode: "20251", tahun: "2025/2026", periode: "Ganjil", mulai: "2025-09-01", selesai: "2026-01-23" },
  { id: 6, kode: "20252", tahun: "2025/2026", periode: "Genap", mulai: "2026-02-16", selesai: "2026-07-03" },
];
const TA_AKTIF = { id: 7, kode: "20261", tahun: "2026/2027", periode: "Ganjil" };

// Mata kuliah: "Nama:SKS" atau "Nama:SKS|Prasyarat"; awalan "~" = pilihan.
const MKU = {
  1: ["Pancasila:2", "Bahasa Indonesia:2", "Studi Al-Qur'an:2"],
  2: ["Kewarganegaraan:2", "Bahasa Arab:2", "Bahasa Inggris:2"],
  3: ["Aqidah Akhlak:2", "Bahasa Arab Lanjut:2|Bahasa Arab"],
  4: ["Fiqih:2"],
  5: ["Akhlak Tasawuf:2"],
  6: ["Islam dan Sains:2"],
};

const PRODI = [
  {
    id: 1, kode: "SI", biaya: 8500000,
    mk: {
      1: ["Pengantar Sistem Informasi:3", "Algoritma dan Pemrograman:3", "Matematika Diskrit:3"],
      2: ["Struktur Data:3|Algoritma dan Pemrograman", "Statistika:3", "Sistem Operasi:3"],
      3: ["Basis Data:3|Struktur Data", "Pemrograman Berorientasi Objek:3|Algoritma dan Pemrograman", "Analisis Proses Bisnis:3"],
      4: ["Pemrograman Web:3|Basis Data", "Jaringan Komputer:3", "Analisis dan Perancangan SI:3"],
      5: ["Interaksi Manusia dan Komputer:3", "Manajemen Proyek SI:3|Analisis dan Perancangan SI", "Keamanan Sistem Informasi:3|Jaringan Komputer", "Data Mining:3|Statistika"],
      6: ["Pemrograman Web Lanjut:3|Pemrograman Web", "Sistem Pendukung Keputusan:3", "Kewirausahaan Digital:2"],
      7: ["Metodologi Penelitian:3", "KKN:4", "~E-Business:3", "~Audit Sistem Informasi:3"],
      8: ["Skripsi:6"],
    },
    dosen: ["Rina Kurniasih, M.Kom.", "Andi Firmansyah, M.T."],
  },
  {
    id: 2, kode: "PAI", biaya: 7200000,
    mk: {
      1: ["Pengantar Studi Islam:3", "Ulumul Qur'an:2", "Ilmu Pendidikan Islam:3"],
      2: ["Ulumul Hadits:2", "Psikologi Pendidikan:3", "Fiqih Ibadah:3"],
      3: ["Tafsir Tarbawi:3|Ulumul Qur'an", "Hadits Tarbawi:3|Ulumul Hadits", "Strategi Pembelajaran PAI:3|Ilmu Pendidikan Islam"],
      4: ["Sejarah Peradaban Islam:3", "Evaluasi Pembelajaran:3", "Pengembangan Kurikulum PAI:3"],
      5: ["Media Pembelajaran PAI:3", "Fiqih Muamalah:3|Fiqih Ibadah", "Microteaching:3|Strategi Pembelajaran PAI"],
      6: ["PPL:4|Microteaching", "Manajemen Pendidikan Islam:3", "Bimbingan Konseling:2"],
      7: ["Metodologi Penelitian Pendidikan:3", "KKN:4", "~Pendidikan Karakter:2", "~Moderasi Beragama:2"],
      8: ["Skripsi:6"],
    },
    dosen: ["Dr. Hj. Euis Nurhasanah, M.Pd.I.", "Asep Saepul Milah, M.Ag.", "Ahmad Fauzi, M.Pd."],
  },
  {
    id: 3, kode: "TI", biaya: 8500000,
    mk: {
      1: ["Pengantar Teknologi Informasi:3", "Dasar Pemrograman:3", "Kalkulus:3"],
      2: ["Pemrograman Lanjut:3|Dasar Pemrograman", "Aljabar Linear:3|Kalkulus", "Organisasi Komputer:3"],
      3: ["Struktur Data dan Algoritma:3|Pemrograman Lanjut", "Basis Data:3", "Teori Bahasa dan Automata:3"],
      4: ["Rekayasa Perangkat Lunak:3", "Jaringan Komputer:3", "Kecerdasan Buatan:3|Struktur Data dan Algoritma"],
      5: ["Pembelajaran Mesin:3|Kecerdasan Buatan", "Pemrograman Mobile:3", "Komputasi Awan:3|Jaringan Komputer"],
      6: ["Grafika Komputer:3", "Keamanan Jaringan:3|Jaringan Komputer", "Pengolahan Citra Digital:3"],
      7: ["Metodologi Penelitian:3", "KKN:4", "~Internet of Things:3", "~Big Data:3"],
      8: ["Skripsi:6"],
    },
    dosen: ["Dr. Budi Santoso, M.Kom.", "Yusuf Maulana, M.Cs.", "Nurul Hidayah, M.Kom."],
  },
  {
    id: 4, kode: "PGMI", biaya: 7200000,
    mk: {
      1: ["Pengantar Pendidikan:3", "Bahasa Indonesia MI:3", "Matematika Dasar:3"],
      2: ["Perkembangan Peserta Didik:3", "IPA MI 1:3", "Pendidikan Pancasila MI:2"],
      3: ["IPA MI 2:3|IPA MI 1", "Matematika MI:3|Matematika Dasar", "Pembelajaran Tematik:3"],
      4: ["IPS MI:3", "Desain Pembelajaran MI:3", "Seni Budaya MI:2"],
      5: ["Media Pembelajaran MI:3", "Evaluasi Pembelajaran MI:3", "Microteaching MI:3|Desain Pembelajaran MI"],
      6: ["PPL MI:4|Microteaching MI", "Penelitian Tindakan Kelas:3", "Bimbingan Konseling MI:2"],
      7: ["Metodologi Penelitian:3", "KKN:4", "~Literasi Digital MI:2", "~Pendidikan Inklusi:2"],
      8: ["Skripsi:6"],
    },
    dosen: ["Dra. Hj. Iis Aisyah, M.Pd.", "Dadang Sukandar, M.Pd.", "Lilis Suryani, M.Pd."],
  },
  {
    id: 5, kode: "ES", biaya: 7800000,
    mk: {
      1: ["Pengantar Ekonomi Islam:3", "Matematika Ekonomi:3", "Pengantar Akuntansi:3"],
      2: ["Mikroekonomi Islam:3|Pengantar Ekonomi Islam", "Akuntansi Syariah:3|Pengantar Akuntansi", "Fiqih Muamalah:3"],
      3: ["Makroekonomi Islam:3|Mikroekonomi Islam", "Statistika Ekonomi:3|Matematika Ekonomi", "Lembaga Keuangan Syariah:3"],
      4: ["Manajemen Keuangan Syariah:3", "Ekonometrika:3|Statistika Ekonomi", "Perbankan Syariah:3"],
      5: ["Pasar Modal Syariah:3", "Zakat dan Wakaf:3", "Manajemen Risiko Syariah:3|Manajemen Keuangan Syariah"],
      6: ["Studi Kelayakan Bisnis:3", "Kewirausahaan Syariah:2", "Etika Bisnis Islam:2"],
      7: ["Metodologi Penelitian Ekonomi:3", "KKN:4", "~Fintech Syariah:3", "~Asuransi Syariah:3"],
      8: ["Skripsi:6"],
    },
    dosen: ["Dr. Hendra Gunawan, M.E.Sy.", "Siti Maryam, M.E.", "Rizal Fahmi, M.Ak."],
  },
  {
    id: 6, kode: "HES", biaya: 7800000,
    mk: {
      1: ["Pengantar Ilmu Hukum:3", "Ushul Fiqih 1:3", "Pengantar Hukum Islam:3"],
      2: ["Ushul Fiqih 2:3|Ushul Fiqih 1", "Hukum Perdata:3", "Qawaid Fiqhiyyah:3"],
      3: ["Fiqih Muamalah:3", "Hukum Dagang:3|Hukum Perdata", "Hukum Perbankan Syariah:3"],
      4: ["Hukum Acara Perdata:3|Hukum Perdata", "Hukum Zakat dan Wakaf:3", "Hukum Asuransi Syariah:3"],
      5: ["Penyelesaian Sengketa Ekonomi Syariah:3|Hukum Acara Perdata", "Hukum Kontrak Syariah:3", "Hukum Pasar Modal Syariah:3"],
      6: ["Praktik Peradilan:3", "Fatwa DSN-MUI:2", "Legal Drafting:3"],
      7: ["Metodologi Penelitian Hukum:3", "KKN:4", "~Hukum Bisnis Digital:3", "~Arbitrase Syariah:2"],
      8: ["Skripsi:6"],
    },
    dosen: ["Dr. H. Mulyadi, S.H., M.H.", "Fitri Handayani, S.H.I., M.H.", "Agus Salim, M.H."],
  },
];

// Dosen inti (inti.sql): SI → 1, 2, 3; PAI → 4. Dosen simulasi mulai id 20.
const DOSEN_INTI = { 1: [1, 2, 3], 2: [4] };

const NAMA_DEPAN = ["Ahmad", "Muhammad", "Siti", "Nur", "Dian", "Rizky", "Putri", "Fikri", "Aulia", "Dimas", "Intan", "Farhan",
  "Salsa", "Ilham", "Nadia", "Raka", "Annisa", "Bagas", "Zahra", "Rafi", "Tiara", "Yoga", "Laila", "Hafiz", "Citra", "Iqbal"];
const NAMA_BELAKANG = ["Hidayat", "Saputra", "Rahmawati", "Firmansyah", "Maulana", "Lestari", "Nugroho", "Kurniawan", "Permata",
  "Ramadhan", "Fauziah", "Pratama", "Sari", "Hakim", "Wulandari", "Setiawan", "Azzahra", "Gunawan", "Fitriani", "Hasanah"];

// ---------------------------------------------------------------------------------------------
// Kurikulum & mata kuliah
// ---------------------------------------------------------------------------------------------

const kurikulum = [];
const mataKuliah = []; // { id, kurikulum_id, prodi_id, kode, nama, sks, semester, jenis, prasyaratNama }
const prasyarat = [];
let mkId = 1;
for (const p of PRODI) {
  kurikulum.push({ id: p.id, prodi_id: p.id, kode: `KUR-${p.kode}-2019`, nama: `Kurikulum ${p.kode} 2019 (KKNI)`, angkatan_mulai: 2019 });
  for (let sem = 1; sem <= 8; sem++) {
    const daftar = [...(MKU[sem] ?? []).map((m) => ({ m, umum: true })), ...p.mk[sem].map((m) => ({ m, umum: false }))];
    let urut = 1;
    for (const { m, umum } of daftar) {
      const pilihan = m.startsWith("~");
      const [namaSks, prasyaratNama] = m.replace("~", "").split("|");
      const [nama, sks] = namaSks.split(":");
      mataKuliah.push({
        id: mkId++,
        kurikulum_id: p.id,
        prodi_id: p.id,
        kode: `${umum ? "UIN" : p.kode}${sem}${String(urut++).padStart(2, "0")}`,
        nama,
        sks: Number(sks),
        semester: sem,
        jenis: pilihan ? "pilihan" : "wajib",
        prasyaratNama: prasyaratNama ?? null,
      });
    }
  }
}
for (const mk of mataKuliah) {
  if (!mk.prasyaratNama) continue;
  const syarat = mataKuliah.find((x) => x.prodi_id === mk.prodi_id && x.nama === mk.prasyaratNama);
  if (!syarat) throw new Error(`Prasyarat tidak ditemukan: ${mk.prasyaratNama}`);
  prasyarat.push({ mata_kuliah_id: mk.id, prasyarat_id: syarat.id });
}
const mkProdi = (prodiId) => mataKuliah.filter((m) => m.prodi_id === prodiId);
const butuhJadwal = (mk) => mk.sks <= 3; // KKN, PPL (4 SKS) & Skripsi (6 SKS) berupa kegiatan lapangan

// ---------------------------------------------------------------------------------------------
// Dosen & ruang
// ---------------------------------------------------------------------------------------------

const users = [];
const userRoles = [];
const dosen = [];
let userId = 100;
let dosenId = 20;
const dosenProdi = {};
for (const p of PRODI) {
  dosenProdi[p.id] = [...(DOSEN_INTI[p.id] ?? [])];
  for (const nama of p.dosen) {
    const nidn = `04${String(p.id).padStart(2, "0")}${String(dosenId).padStart(6, "0")}`;
    users.push({ id: userId, username: nidn, email: `dosen${dosenId}@iais.ac.id`, password_hash: mentah("@pwd") });
    userRoles.push({ user_id: userId, role: "dosen", prodi_id: null });
    dosen.push({ id: dosenId, user_id: userId, nidn, nama, prodi_id: p.id, jabatan: pilih(["Asisten Ahli", "Lektor", "Lektor Kepala"]) });
    dosenProdi[p.id].push(dosenId);
    userId++;
    dosenId++;
  }
}

const ruang = [];
for (const [i, kode] of ["R101", "R102", "R103", "R104", "R201", "R202", "R203", "R204", "R301", "R302", "R303", "R304", "R401", "R402"].entries()) {
  ruang.push({ id: i + 1, kode, nama: `Ruang ${kode.slice(1)}`, kapasitas: 45 });
}
for (const [i, nama] of ["Lab Komputer 1", "Lab Komputer 2", "Lab Komputer 3", "Aula Utama", "Masjid Kampus"].entries()) {
  ruang.push({ id: 15 + i, kode: `K${i + 1}`, nama, kapasitas: nama.startsWith("Lab") ? 40 : 120 });
}

// ---------------------------------------------------------------------------------------------
// Mahasiswa: inti (inti.sql) + simulasi
// ---------------------------------------------------------------------------------------------

/** Mahasiswa inti — harus sama dengan inti.sql. `paksa` = nilai tertentu yang dipaksakan untuk skenario demo. */
const MAHASISWA_INTI = [
  { id: 1, user_id: 1, nim: "0102523025", prodi_id: 1, angkatan: 2024, status: "aktif", boleh_krs: 1, pa: 1, kemampuan: 0.86, krs: "disetujui" },
  { id: 2, user_id: 3, nim: "0102523026", prodi_id: 1, angkatan: 2025, status: "aktif", boleh_krs: 1, pa: 1, kemampuan: 0.64, krs: "diajukan" },
  { id: 3, user_id: 5, nim: "0102523027", prodi_id: 2, angkatan: 2025, status: "aktif", boleh_krs: 1, pa: 4, kemampuan: 0.9, krs: null },
  { id: 4, user_id: 6, nim: "0102523028", prodi_id: 1, angkatan: 2026, status: "aktif", boleh_krs: 0, pa: 2, kemampuan: 0.8, krs: null },
  {
    id: 5, user_id: 12, nim: "0102523029", prodi_id: 1, angkatan: 2024, status: "aktif", boleh_krs: 1, pa: 1, kemampuan: 0.42, krs: "draf",
    paksa: { "Jaringan Komputer": "E", Statistika: "D" },
  },
  { id: 6, user_id: 13, nim: "0102523030", prodi_id: 5, angkatan: 2024, status: "cuti", boleh_krs: 0, pa: null, kemampuan: 0.75, krs: null },
  { id: 7, user_id: 14, nim: "0102523031", prodi_id: 3, angkatan: 2024, status: "nonaktif", boleh_krs: 0, pa: null, kemampuan: 0.55, krs: null, semesterSelesai: 2 },
];

const mahasiswa = [];
const semesterSekarang = (angkatan) => (2026 - angkatan) * 2 + 1;
let mhsId = 100;
let urutNim = 1;
for (const p of PRODI) {
  for (const angkatan of [2023, 2024, 2025, 2026]) {
    const jumlah = p.id <= 2 ? 9 : 7;
    for (let i = 0; i < jumlah; i++) {
      const nim = `22${p.id}${String(angkatan).slice(2)}${String(urutNim++).padStart(4, "0")}`;
      const nama = `${pilih(NAMA_DEPAN)} ${pilih(NAMA_BELAKANG)}`;
      const r = acak();
      const status = angkatan < 2026 && r < 0.05 ? "cuti" : angkatan < 2026 && r < 0.08 ? "nonaktif" : "aktif";
      users.push({ id: userId, username: nim, email: `${nim}@mhs.iais.ac.id`, password_hash: mentah("@pwd") });
      userRoles.push({ user_id: userId, role: "mahasiswa", prodi_id: null });
      mahasiswa.push({
        id: mhsId++,
        user_id: userId++,
        nim,
        nama,
        prodi_id: p.id,
        angkatan,
        status,
        pa: pilih(dosenProdi[p.id]),
        kemampuan: 0.35 + acak() * 0.62,
        jenis_kelamin: NAMA_DEPAN.indexOf(nama.split(" ")[0]) % 2 === 0 ? "L" : "P",
        baru: true,
      });
    }
  }
}
const semuaMahasiswa = [...MAHASISWA_INTI, ...mahasiswa];

// ---------------------------------------------------------------------------------------------
// Riwayat: kelas lampau, KRS disetujui, nilai terpublikasi
// ---------------------------------------------------------------------------------------------

const kelas = [];
const jadwal = [];
const krs = [];
const krsDetail = [];
const nilai = [];
let kelasId = 1;
let krsId = 1;
let detailId = 1;

/** Kelas lampau: satu kelas A per mata kuliah per semester (tanpa jadwal — data historis). */
const kelasLampau = new Map(); // `${taId}-${mkId}` → kelas
function kelasUntuk(ta, mk) {
  const kunci = `${ta.id}-${mk.id}`;
  if (!kelasLampau.has(kunci)) {
    const k = { id: kelasId++, tahun_akademik_id: ta.id, mata_kuliah_id: mk.id, nama: "A", dosen_id: pilih(dosenProdi[mk.prodi_id]), kuota: 60, terisi: 0 };
    kelasLampau.set(kunci, k);
    kelas.push(k);
  }
  return kelasLampau.get(kunci);
}

const capaian = new Map(); // mahasiswa_id → Map(mk_id → bobot terbaik)
const ipsTerakhir = new Map();
for (const m of semuaMahasiswa) {
  const sekarang = semesterSekarang(m.angkatan);
  const selesai = Math.min(sekarang - 1, m.semesterSelesai ?? 99);
  const lulusMk = new Map();
  capaian.set(m.id, lulusMk);
  for (let sem = 1; sem <= selesai; sem++) {
    const ta = TAHUN_AKADEMIK[(m.angkatan - 2023) * 2 + (sem - 1)];
    if (!ta) continue;
    const ambil = mkProdi(m.prodi_id).filter(
      (mk) =>
        mk.semester === sem &&
        mk.jenis === "wajib" &&
        !prasyarat.some((p) => p.mata_kuliah_id === mk.id && (lulusMk.get(p.prasyarat_id) ?? -1) < BOBOT_MIN_PRASYARAT),
    );
    if (ambil.length === 0) continue;
    const idKrs = krsId++;
    krs.push({
      id: idKrs, mahasiswa_id: m.id, tahun_akademik_id: ta.id, status: "disetujui", maks_sks: 24, ips_acuan: null,
      diajukan_at: `${ta.mulai} 09:00:00`, diputuskan_at: `${ta.mulai} 15:00:00`,
    });
    const baris = [];
    for (const mk of ambil) {
      const k = kelasUntuk(ta, mk);
      k.terisi++;
      const idDetail = detailId++;
      krsDetail.push({ id: idDetail, krs_id: idKrs, kelas_id: k.id });
      const skor = Math.max(0, Math.min(100, 38 + m.kemampuan * 58 + (acak() - 0.5) * 26));
      const [huruf] = m.paksa?.[mk.nama] ? [m.paksa[mk.nama]] : hurufDari(skor);
      const bobot = bobotHuruf(huruf);
      nilai.push({
        krs_detail_id: idDetail, nilai_angka: Math.round(skor * 100) / 100, nilai_huruf: huruf, bobot,
        status: "terpublikasi", dipublikasi_at: `${ta.selesai} 10:00:00`,
      });
      lulusMk.set(mk.id, Math.max(lulusMk.get(mk.id) ?? -1, bobot));
      baris.push({ sks: mk.sks, bobot });
    }
    ipsTerakhir.set(m.id, indeks(baris));
  }
}

// ---------------------------------------------------------------------------------------------
// Semester aktif: kelas A & B + jadwal tanpa bentrok (kohort, dosen, ruang)
// ---------------------------------------------------------------------------------------------

const JAM = [["07:30", 0], ["10:00", 1], ["13:00", 2], ["15:30", 3]];
const SLOT = [];
for (let hari = 1; hari <= 5; hari++) for (const [jam] of JAM) SLOT.push({ hari, jam });
function tambahMenit(jam, menit) {
  const [h, m] = jam.split(":").map(Number);
  const total = h * 60 + m + menit;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const sibukDosen = new Set();
const sibukRuang = new Set();
const kelasAktif = []; // { kelas, mk }
for (const p of PRODI) {
  const sibukKohort = new Set();
  for (const sem of [1, 3, 5, 7]) {
    for (const mk of mkProdi(p.id).filter((m) => m.semester === sem)) {
      for (const nama of ["A", "B"]) {
        const k = {
          id: kelasId++, tahun_akademik_id: TA_AKTIF.id, mata_kuliah_id: mk.id, nama,
          dosen_id: null, kuota: nama === "A" ? 40 : 35, terisi: 0,
        };
        if (butuhJadwal(mk)) {
          const awal = Math.floor(acak() * SLOT.length);
          let dapat = false;
          for (let n = 0; n < SLOT.length && !dapat; n++) {
            const s = SLOT[(awal + n) % SLOT.length];
            const kunciSlot = `${s.hari}-${s.jam}`;
            if (sibukKohort.has(`${sem}${nama}-${kunciSlot}`)) continue;
            const dosenBebas = dosenProdi[p.id].filter((d) => !sibukDosen.has(`${d}-${kunciSlot}`));
            const ruangBebas = ruang.find((r) => !sibukRuang.has(`${r.id}-${kunciSlot}`));
            if (dosenBebas.length === 0 || !ruangBebas) continue;
            k.dosen_id = pilih(dosenBebas);
            sibukKohort.add(`${sem}${nama}-${kunciSlot}`);
            sibukDosen.add(`${k.dosen_id}-${kunciSlot}`);
            sibukRuang.add(`${ruangBebas.id}-${kunciSlot}`);
            jadwal.push({ kelas_id: k.id, hari: s.hari, jam_mulai: s.jam, jam_selesai: tambahMenit(s.jam, mk.sks * 50), ruang_id: ruangBebas.id });
            dapat = true;
          }
          if (!dapat) throw new Error(`Tidak ada slot untuk ${mk.kode} ${nama}`);
        } else {
          k.dosen_id = pilih(dosenProdi[p.id]);
        }
        kelas.push(k);
        kelasAktif.push({ kelas: k, mk });
      }
    }
  }
}
// Skenario "kelas penuh": IMK kelas A SI dibuat kuota pas dengan peminatnya (pengisian di bawah).
const imkA = kelasAktif.find(({ mk, kelas: k }) => mk.prodi_id === 1 && mk.nama === "Interaksi Manusia dan Komputer" && k.nama === "A");

// ---------------------------------------------------------------------------------------------
// Tagihan semester aktif (mahasiswa simulasi) & izin KRS
// ---------------------------------------------------------------------------------------------

const tagihan = [];
const termin = [];
let tagihanId = 100;
let terminId = 100;
const TAMBAHAN_TAGIHAN_INTI = [
  { mahasiswa_id: 5, nim: "0102523029", prodi_id: 1, semester: 5, status: "lunas" },
  { mahasiswa_id: 7, nim: "0102523031", prodi_id: 3, semester: 5, status: "belum" },
];
function buatTagihan({ mahasiswa_id, nim, prodi_id, semester, status }) {
  const prodi = PRODI.find((p) => p.id === prodi_id);
  const jumlah = semester === 1 ? 9000000 : prodi.biaya;
  const t = {
    id: tagihanId++, no_tagihan: `TGH-20261-${nim}`, mahasiswa_id, semester_ke: semester, periode: "Ganjil", tahun_akademik: "2026/2027",
    jenis_pembayaran: semester === 1 ? "Uang Pangkal & UKT" : "UKT / SPP Tetap", jumlah, dibayar: 0, status: "belum_lunas",
    jatuh_tempo: "2026-10-31", tanggal_bayar: null, metode_bayar: null, no_kuitansi: null,
  };
  if (status === "lunas") {
    Object.assign(t, {
      dibayar: jumlah, status: "lunas", tanggal_bayar: `2026-08-${String(1 + Math.floor(acak() * 27)).padStart(2, "0")} 10:00:00`,
      metode_bayar: pilih(["Virtual Account", "Transfer Manual"]), no_kuitansi: `KWT-20261-P${String(t.id).padStart(5, "0")}`,
    });
  } else if (status.startsWith("cicilan")) {
    const lunas = Number(status.slice(-1));
    const per = Math.floor(jumlah / 6);
    for (let k = 1; k <= 6; k++) {
      const nominal = k === 6 ? jumlah - per * 5 : per;
      const bulan = 8 + k; // Sep 2026 .. Feb 2027
      const tahun = bulan > 12 ? 2027 : 2026;
      const jt = `${tahun}-${String(((bulan - 1) % 12) + 1).padStart(2, "0")}-15`;
      const bayar = k <= lunas;
      termin.push({
        id: terminId, tagihan_id: t.id, termin_ke: k, jumlah: nominal, jatuh_tempo: jt, status: bayar ? "lunas" : "belum_bayar",
        tanggal_bayar: bayar ? `${jt.slice(0, 8)}10 10:00:00` : null, metode_bayar: bayar ? "Transfer Manual" : null,
        no_kuitansi: bayar ? `KWT-20261-T${String(terminId).padStart(5, "0")}` : null,
        diverifikasi_oleh: bayar ? 4 : null, diverifikasi_at: bayar ? `${jt.slice(0, 8)}11 09:00:00` : null,
      });
      terminId++;
      if (bayar) t.dibayar += nominal;
    }
    t.status = t.dibayar > 0 ? "cicilan" : "belum_lunas";
    t.jatuh_tempo = "2027-02-15";
  }
  tagihan.push(t);
  return t;
}
for (const t of TAMBAHAN_TAGIHAN_INTI) buatTagihan(t);
for (const m of mahasiswa) {
  if (m.status === "cuti") {
    m.boleh_krs = 0;
    continue;
  }
  const r = acak();
  const status = r < 0.55 ? "lunas" : r < 0.72 ? "cicilan2" : r < 0.82 ? "cicilan1" : r < 0.9 ? "cicilan0" : "belum";
  buatTagihan({ mahasiswa_id: m.id, nim: m.nim, prodi_id: m.prodi_id, semester: semesterSekarang(m.angkatan), status });
  // BR-SD-02: lunas atau minimal 1 termin cicilan lunas (pengaturan krs_min_termin_lunas).
  m.boleh_krs = m.status === "aktif" && (status === "lunas" || status === "cicilan1" || status === "cicilan2") ? 1 : 0;
}

// ---------------------------------------------------------------------------------------------
// KRS semester aktif
// ---------------------------------------------------------------------------------------------

const CATATAN_TOLAK = [
  "Ambil juga mata kuliah umum semester ini sebelum mata kuliah lanjutan.",
  "Jumlah SKS terlalu sedikit; tambahkan mata kuliah wajib yang tertinggal.",
  "Konsultasikan dulu pemilihan mata kuliah pilihan dengan saya.",
];
const pembanding = (a, b) => a.mk.kode.localeCompare(b.mk.kode);

for (const m of semuaMahasiswa) {
  if (m.status !== "aktif" || !m.boleh_krs) continue;
  let skenario = m.krs;
  if (m.baru) {
    const r = acak();
    skenario = r < 0.15 ? null : r < 0.3 ? "draf" : r < 0.58 ? "diajukan" : r < 0.94 ? "disetujui" : "ditolak";
  }
  if (!skenario) continue;

  const sem = semesterSekarang(m.angkatan);
  const ips = sem === 1 ? null : ipsTerakhir.get(m.id) ?? 0;
  const lulusMk = capaian.get(m.id);
  const kandidat = kelasAktif
    .filter(({ mk, kelas: k }) => mk.prodi_id === m.prodi_id && mk.semester === sem && k.nama === (m.id % 3 === 0 ? "B" : "A"))
    .filter(({ mk }) => !prasyarat.some((p) => p.mata_kuliah_id === mk.id && (lulusMk.get(p.prasyarat_id) ?? -1) < BOBOT_MIN_PRASYARAT))
    .sort(pembanding);
  const paket = kelasAktif.filter(({ mk, kelas: k }) => mk.prodi_id === m.prodi_id && mk.semester === 1 && mk.jenis === "wajib" && k.nama === "A");
  const maks = sem === 1 ? paket.reduce((n, { mk }) => n + mk.sks, 0) : maksSksDariIps(ips);

  const pilihan = [];
  let sks = 0;
  for (const c of kandidat) {
    if (c.mk.jenis === "pilihan" && pilihan.some((x) => x.mk.jenis === "pilihan")) continue;
    if (sks + c.mk.sks > maks) continue;
    pilihan.push(c);
    sks += c.mk.sks;
  }
  const isi = skenario === "draf" ? pilihan.slice(0, Math.max(1, Math.ceil(pilihan.length / 2))) : pilihan;
  if (isi.length === 0) continue;

  const idKrs = krsId++;
  const diajukan = skenario !== "draf";
  krs.push({
    id: idKrs, mahasiswa_id: m.id, tahun_akademik_id: TA_AKTIF.id, status: skenario, maks_sks: maks, ips_acuan: ips,
    catatan_pa: skenario === "ditolak" ? pilih(CATATAN_TOLAK) : null,
    diajukan_at: diajukan ? mentah(`NOW() - INTERVAL ${1 + Math.floor(acak() * 5)} DAY`) : null,
    diputuskan_at: skenario === "disetujui" || skenario === "ditolak" ? mentah("NOW() - INTERVAL 1 DAY") : null,
  });
  for (const { kelas: k } of isi) {
    krsDetail.push({ id: detailId++, krs_id: idKrs, kelas_id: k.id });
    // Kuota terkunci untuk KRS yang diajukan/disetujui (sama dengan aturan aplikasi).
    if (skenario === "diajukan" || skenario === "disetujui") k.terisi++;
  }
}
if (imkA) imkA.kelas.kuota = Math.max(imkA.kelas.terisi, 1);
for (const { kelas: k } of kelasAktif) if (k.terisi > k.kuota) k.kuota = k.terisi;

// ---------------------------------------------------------------------------------------------
// Tulis SQL
// ---------------------------------------------------------------------------------------------

const inti = await readFile(new URL("./demo/inti.sql", import.meta.url), "utf8");
const bagian = [
  `-- =====================================================================
-- SIDIK — 3/3 Data DEMO (opsional, hanya untuk uji coba). SEMUA DATA FIKTIF.
-- DIBUAT OTOMATIS oleh scripts/buat-data-demo.mjs dari scripts/demo/inti.sql — jangan edit manual.
-- JANGAN diimport ke server produksi.
--
-- Akun demo (password semua: password123):
--   Mahasiswa : 0102523025 Hasan (SI, smt 5) — KRS disetujui, jadwal tampil
--               0102523026 Nabila (SI, smt 3) — KRS diajukan, menunggu Dosen PA
--               0102523027 Rizki (PAI, smt 3) — boleh KRS, belum mengisi (coba isi KRS)
--               0102523028 Aisyah (SI, smt 1) — belum bayar → KRS terkunci sampai Keuangan membuka izin
--               0102523029 Fajar (SI, smt 5) — IPS rendah (batas SKS kecil), prasyarat tidak lulus
--               0102523030 Dewi (cuti) · 0102523031 Galih (nonaktif) — boleh login, lihat saja
--               0102519032 Siti (lulus) · 0102523033 Rendi (keluar) — login ditolak
--   Dosen     : 0412345678 Dr. Ahmad Rahman — Dosen PA + Kaprodi SI (bisa ganti role)
--               0415058801 Dr. Siti Aminah (SI) · 0401078503 Ust. Zainal Abidin (PAI, PA Rizki)
--   Staf      : keuangan · baak · pimpinan · superadmin
--   + ${mahasiswa.length} mahasiswa & ${dosen.length} dosen simulasi (username = NIM/NIDN, lihat tabel users)
-- =====================================================================
`,
  inti,
  "\n-- ===================== Simulasi akademik (dibuat otomatis) =====================\n",
  insert("ruang", ["id", "kode", "nama", "kapasitas"], ruang),
  insert("users", ["id", "username", "email", "password_hash"], users),
  insert("user_roles", ["user_id", "role", "prodi_id"], userRoles),
  insert("dosen", ["id", "user_id", "nidn", "nama", "prodi_id", "jabatan"], dosen),
  insert(
    "mahasiswa",
    ["id", "user_id", "nim", "nama", "prodi_id", "angkatan", "semester", "dosen_pa_id", "status_akademik", "boleh_krs", "jenis_kelamin", "agama", "email_kampus"],
    mahasiswa.map((m) => ({
      ...m, semester: semesterSekarang(m.angkatan), dosen_pa_id: m.pa, status_akademik: m.status, agama: "Islam", email_kampus: `${m.nim}@mhs.iais.ac.id`,
    })),
  ),
  insert("kurikulum", ["id", "prodi_id", "kode", "nama", "angkatan_mulai"], kurikulum),
  insert("mata_kuliah", ["id", "kurikulum_id", "kode", "nama", "sks", "semester", "jenis"], mataKuliah),
  insert("prasyarat_mk", ["mata_kuliah_id", "prasyarat_id"], prasyarat),
  insert(
    "tahun_akademik",
    ["id", "kode", "tahun", "periode", "aktif", "krs_mulai", "krs_selesai", "kuliah_mulai", "kuliah_selesai", "nilai_mulai", "nilai_selesai"],
    TAHUN_AKADEMIK.map((t) => ({ ...t, aktif: 0, krs_mulai: t.mulai, krs_selesai: t.mulai, kuliah_mulai: t.mulai, kuliah_selesai: t.selesai, nilai_mulai: t.selesai, nilai_selesai: t.selesai })),
  ),
  `-- Semester aktif. Untuk SIMULASI, periode isi KRS dibuat selalu terbuka di sekitar tanggal import
-- (CURDATE() − 7 hari s.d. + 21 hari) agar alur KRS bisa dicoba kapan saja. Di produksi BAAK mengisi tanggal asli.
INSERT INTO tahun_akademik (id, kode, tahun, periode, aktif, krs_mulai, krs_selesai, perubahan_mulai, perubahan_selesai,
  kuliah_mulai, kuliah_selesai, uts_mulai, uts_selesai, uas_mulai, uas_selesai, nilai_mulai, nilai_selesai) VALUES
  (${TA_AKTIF.id}, '${TA_AKTIF.kode}', '${TA_AKTIF.tahun}', '${TA_AKTIF.periode}', 1, CURDATE() - INTERVAL 7 DAY, CURDATE() + INTERVAL 21 DAY,
   CURDATE() + INTERVAL 22 DAY, CURDATE() + INTERVAL 35 DAY, '2026-09-07', '2027-01-15', '2026-10-26', '2026-11-06',
   '2027-01-04', '2027-01-15', '2027-01-18', '2027-01-29');
`,
  insert("kelas", ["id", "tahun_akademik_id", "mata_kuliah_id", "nama", "dosen_id", "kuota", "terisi"], kelas),
  insert("jadwal", ["kelas_id", "hari", "jam_mulai", "jam_selesai", "ruang_id"], jadwal),
  insert("krs", ["id", "mahasiswa_id", "tahun_akademik_id", "status", "maks_sks", "ips_acuan", "catatan_pa", "diajukan_at", "diputuskan_at"], krs),
  insert("krs_detail", ["id", "krs_id", "kelas_id"], krsDetail),
  insert("nilai", ["krs_detail_id", "nilai_angka", "nilai_huruf", "bobot", "status", "dipublikasi_at"], nilai),
  insert(
    "tagihan",
    ["id", "no_tagihan", "mahasiswa_id", "semester_ke", "periode", "tahun_akademik", "jenis_pembayaran", "jumlah", "dibayar", "status", "jatuh_tempo", "tanggal_bayar", "metode_bayar", "no_kuitansi"],
    tagihan,
  ),
  insert(
    "tagihan_termin",
    ["id", "tagihan_id", "termin_ke", "jumlah", "jatuh_tempo", "status", "tanggal_bayar", "metode_bayar", "no_kuitansi", "diverifikasi_oleh", "diverifikasi_at"],
    termin,
  ),
];

await writeFile(new URL("../database/data-demo.sql", import.meta.url), bagian.join("\n"));
const hitung = (s) => krs.filter((k) => k.tahun_akademik_id === TA_AKTIF.id && k.status === s).length;
console.log(
  `✓ database/data-demo.sql: ${semuaMahasiswa.length} mahasiswa, ${dosen.length + 4} dosen, ${mataKuliah.length} mata kuliah, ` +
    `${kelas.length} kelas, ${nilai.length} nilai, KRS aktif: draf ${hitung("draf")}, diajukan ${hitung("diajukan")}, ` +
    `disetujui ${hitung("disetujui")}, ditolak ${hitung("ditolak")}`,
);
