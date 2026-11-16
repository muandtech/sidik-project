import type { Metadata } from "next";
import Link from "next/link";
import { hitunganKeAngka, KartuAngka, LABEL_STATUS_KRS, LABEL_STATUS_MAHASISWA } from "@/components/staf/ringkasan";
import { Card, CardHeader, CardLink, EmptyState, PageHeader } from "@/components/ui";
import { getTahunAkademikAktif, labelTahunAkademik, type TahunAkademik } from "@/lib/akademik";
import {
  getBimbinganBelumKrs,
  getKelasAmpu,
  getKelasHampirPenuh,
  getPenggunaPerRole,
  getProdiKaprodi,
  getStatistikFakultas,
  getStatusKrs,
  getStatusKrsBimbingan,
  getStatusMahasiswa,
} from "@/lib/dasbor";
import { formatTanggal } from "@/lib/format";
import { getDosenByUser, getKrsBimbingan } from "@/lib/krs";
import { LABEL_ROLE } from "@/lib/peran";
import { requireUser, type SessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Beranda Staf" };

// Dashboard per role aktif (SD-S2-03): dosen → kelas & KRS bimbingan; kaprodi → ringkasan prodi;
// BAAK → periode akademik; pimpinan → statistik; superadmin → pengguna & audit; keuangan → tautan modul.
export default async function BerandaStafPage() {
  const user = await requireUser(["dosen", "kaprodi", "baak", "keuangan", "pimpinan", "superadmin"]);
  const ta = await getTahunAkademikAktif();

  return (
    <>
      <PageHeader
        boxed
        title={`Selamat datang, ${user.nama}`}
        description={`${LABEL_ROLE[user.role]} · ${ta ? `Semester ${labelTahunAkademik(ta)}` : "Semester aktif belum ditetapkan"}`}
      />
      {!ta ? (
        <EmptyState>BAAK belum menetapkan semester aktif.</EmptyState>
      ) : user.role === "dosen" ? (
        <BerandaDosen user={user} ta={ta} />
      ) : user.role === "kaprodi" ? (
        <BerandaKaprodi user={user} ta={ta} />
      ) : user.role === "baak" ? (
        <BerandaBaak ta={ta} />
      ) : user.role === "pimpinan" ? (
        <BerandaPimpinan ta={ta} />
      ) : user.role === "superadmin" ? (
        <BerandaSuperadmin />
      ) : (
        <Card className="p-5 text-sm">
          Kelola pembayaran di <Link className="font-semibold text-brand hover:underline" href="/admin-keuangan">Rekap Pembayaran</Link> dan
          izin KRS di <Link className="font-semibold text-brand hover:underline" href="/admin-keuangan/izin-krs">Izin KRS</Link>.
        </Card>
      )}
    </>
  );
}

async function BerandaDosen({ user, ta }: { user: SessionUser; ta: TahunAkademik }) {
  const dosen = await getDosenByUser(user.userId);
  if (!dosen) return <EmptyState>Akun ini belum terhubung dengan data dosen. Hubungi BAAK.</EmptyState>;
  const [kelas, statusKrs, belumKrs, menunggu] = await Promise.all([
    getKelasAmpu(dosen.id, ta.id),
    getStatusKrsBimbingan(dosen.id, ta.id),
    getBimbinganBelumKrs(dosen.id, ta.id),
    getKrsBimbingan(dosen.id, ta.id, "diajukan"),
  ]);
  const jumlah = (s: string) => statusKrs.find((h) => h.kunci === s)?.jumlah ?? 0;

  return (
    <div className="space-y-5">
      <KartuAngka
        items={[
          { label: "KRS menunggu persetujuan", nilai: jumlah("diajukan"), catatan: "Mahasiswa bimbingan" },
          { label: "KRS disetujui", nilai: jumlah("disetujui") },
          { label: "Bimbingan belum isi KRS", nilai: belumKrs },
          { label: "Kelas diampu", nilai: kelas.length, catatan: `${kelas.reduce((n, k) => n + k.sks, 0)} SKS` },
        ]}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="KRS Menunggu Persetujuan" action={<CardLink href="/staf/perwalian">Lihat semua</CardLink>} />
          <div className="p-4 pt-1 sm:px-5">
            {menunggu.length === 0 ? (
              <EmptyState>Tidak ada KRS yang menunggu persetujuan.</EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {menunggu.slice(0, 6).map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{k.nama}</span>
                      <span className="text-xs text-muted">
                        {k.nim} · {k.total_sks} SKS · diajukan {formatTanggal(k.diajukan_at)}
                      </span>
                    </span>
                    <Link href={`/staf/perwalian/${k.id}`} className="shrink-0 text-[13px] font-semibold text-brand hover:underline">
                      Tinjau
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Kelas yang Diampu" action={<CardLink href="/staf/kelas">Detail</CardLink>} />
          <div className="p-4 pt-1 sm:px-5">
            {kelas.length === 0 ? (
              <EmptyState>Tidak ada kelas pada semester ini.</EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {kelas.map((k) => (
                  <li key={k.kelas_id} className="py-2.5 text-sm">
                    <p className="font-semibold">
                      {k.kode_mk} {k.nama_mk} · Kelas {k.kelas}
                    </p>
                    <p className="text-xs text-muted">
                      {k.jadwal ?? "Jadwal belum diatur"} · {k.terisi}/{k.kuota} mahasiswa
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

async function BerandaKaprodi({ user, ta }: { user: SessionUser; ta: TahunAkademik }) {
  const prodi = await getProdiKaprodi(user.userId);
  if (!prodi) return <EmptyState>Role kaprodi belum dikaitkan dengan program studi. Hubungi Superadmin.</EmptyState>;
  const [statusMhs, statusKrs, penuh] = await Promise.all([
    getStatusMahasiswa(prodi.id),
    getStatusKrs(ta.id, prodi.id),
    getKelasHampirPenuh(ta.id, prodi.id),
  ]);
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">
        Program Studi {prodi.jenjang} {prodi.nama}
      </h2>
      <section aria-label="Status mahasiswa">
        <h3 className="mb-2 text-sm font-semibold text-muted">Status mahasiswa</h3>
        <KartuAngka items={hitunganKeAngka(statusMhs, LABEL_STATUS_MAHASISWA)} />
      </section>
      <section aria-label="Status KRS">
        <h3 className="mb-2 text-sm font-semibold text-muted">KRS mahasiswa aktif semester ini</h3>
        <KartuAngka items={hitunganKeAngka(statusKrs, LABEL_STATUS_KRS)} />
      </section>
      <TabelKelasPenuh penuh={penuh} />
      <p className="text-sm text-muted">
        Persetujuan KRS mahasiswa bimbingan Anda sendiri: ganti role ke <strong>Dosen</strong>.
      </p>
    </div>
  );
}

async function BerandaBaak({ ta }: { ta: TahunAkademik }) {
  const [statusMhs, statusKrs, penuh] = await Promise.all([getStatusMahasiswa(), getStatusKrs(ta.id), getKelasHampirPenuh(ta.id)]);
  const periode = [
    ["Pengisian KRS", ta.krs_mulai, ta.krs_selesai],
    ["Tambah/batal", ta.perubahan_mulai, ta.perubahan_selesai],
    ["Perkuliahan", ta.kuliah_mulai, ta.kuliah_selesai],
    ["UTS", ta.uts_mulai, ta.uts_selesai],
    ["UAS", ta.uas_mulai, ta.uas_selesai],
    ["Input nilai", ta.nilai_mulai, ta.nilai_selesai],
  ] as const;
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={`Kalender ${labelTahunAkademik(ta)}`} />
        <dl className="grid gap-x-6 gap-y-2 p-4 pt-1 text-sm sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
          {periode.map(([label, mulai, selesai]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-semibold">
                {mulai && selesai ? `${formatTanggal(mulai)} – ${formatTanggal(selesai)}` : "Belum diatur"}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
      <section aria-label="Status KRS">
        <h3 className="mb-2 text-sm font-semibold text-muted">KRS mahasiswa aktif (seluruh prodi)</h3>
        <KartuAngka items={hitunganKeAngka(statusKrs, LABEL_STATUS_KRS)} />
      </section>
      <section aria-label="Status mahasiswa">
        <h3 className="mb-2 text-sm font-semibold text-muted">Status mahasiswa</h3>
        <KartuAngka items={hitunganKeAngka(statusMhs, LABEL_STATUS_MAHASISWA)} />
      </section>
      <TabelKelasPenuh penuh={penuh} />
    </div>
  );
}

async function BerandaPimpinan({ ta }: { ta: TahunAkademik }) {
  const statistik = await getStatistikFakultas(ta.id, ta.tahun, ta.periode);
  const persen = (a: number, b: number) => (b > 0 ? `${Math.round((Number(a) / Number(b)) * 100)}%` : "-");
  return (
    <Card>
      <CardHeader title="Statistik per Fakultas" />
      <div className="overflow-x-auto p-4 pt-1 sm:px-5">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="bg-canvas text-[13px]">
              <th scope="col" className="px-3 py-2.5">Fakultas</th>
              <th scope="col" className="px-3 py-2.5 text-right">Mahasiswa aktif</th>
              <th scope="col" className="px-3 py-2.5 text-right">KRS disetujui</th>
              <th scope="col" className="px-3 py-2.5 text-right">UKT lunas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {statistik.map((s) => (
              <tr key={s.fakultas}>
                <td className="px-3 py-2.5 font-semibold">{s.fakultas}</td>
                <td className="px-3 py-2.5 text-right">{Number(s.mahasiswa_aktif)}</td>
                <td className="px-3 py-2.5 text-right">
                  {Number(s.krs_disetujui)} ({persen(s.krs_disetujui, s.mahasiswa_aktif)})
                </td>
                <td className="px-3 py-2.5 text-right">
                  {Number(s.tagihan_lunas)}/{Number(s.tagihan)} ({persen(s.tagihan_lunas, s.tagihan)})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

async function BerandaSuperadmin() {
  const perRole = await getPenggunaPerRole();
  return (
    <div className="space-y-5">
      <section aria-label="Pengguna per role">
        <h3 className="mb-2 text-sm font-semibold text-muted">Pengguna per role</h3>
        <KartuAngka items={hitunganKeAngka(perRole, LABEL_ROLE)} />
      </section>
      <Card className="p-5 text-sm">
        Jejak aktivitas tersedia di <Link href="/staf/audit" className="font-semibold text-brand hover:underline">Audit Log</Link>.
        Pengelolaan pengguna & role (buat, nonaktifkan, reset password) dijadwalkan pada fase berikutnya.
      </Card>
    </div>
  );
}

function TabelKelasPenuh({ penuh }: { penuh: Awaited<ReturnType<typeof getKelasHampirPenuh>> }) {
  return (
    <Card>
      <CardHeader title="Kelas Hampir/Sudah Penuh (≥ 90%)" />
      <div className="p-4 pt-1 sm:px-5">
        {penuh.length === 0 ? (
          <EmptyState>Belum ada kelas yang hampir penuh.</EmptyState>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {penuh.map((k) => (
              <li key={`${k.kode_mk}-${k.kelas}`} className="flex justify-between gap-3 py-2">
                <span>
                  {k.kode_mk} {k.nama_mk} · Kelas {k.kelas} <span className="text-xs text-muted">({k.prodi})</span>
                </span>
                <span className={`shrink-0 font-semibold ${k.terisi >= k.kuota ? "text-danger" : "text-ink"}`}>
                  {k.terisi}/{k.kuota}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
