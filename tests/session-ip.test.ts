import { describe, expect, it } from "vitest";
import { ipDariHeader } from "@/lib/session";

const header = (isi: Record<string, string>) => new Headers(isi);

describe("IP klien dari header proxy (audit S2)", () => {
  it("tanpa TRUST_PROXY, header IP dari klien diabaikan", () => {
    expect(ipDariHeader(header({ "x-forwarded-for": "1.2.3.4" }), false)).toBeNull();
    expect(ipDariHeader(header({ "x-real-ip": "1.2.3.4" }), false)).toBeNull();
  });

  it("dengan TRUST_PROXY, X-Real-IP dari proxy dipakai lebih dulu", () => {
    expect(ipDariHeader(header({ "x-real-ip": "10.1.1.1", "x-forwarded-for": "6.6.6.6, 10.1.1.1" }), true)).toBe(
      "10.1.1.1",
    );
  });

  it("dengan TRUST_PROXY tanpa X-Real-IP, entri terakhir X-Forwarded-For (ditambahkan proxy) yang dipakai", () => {
    // Entri pertama bisa dipalsukan klien; yang terakhir ditambahkan oleh proxy kita.
    expect(ipDariHeader(header({ "x-forwarded-for": "6.6.6.6, 10.1.1.1" }), true)).toBe("10.1.1.1");
  });

  it("tanpa header sama sekali menghasilkan null", () => {
    expect(ipDariHeader(header({}), true)).toBeNull();
  });
});
