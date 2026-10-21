import { NextResponse, type NextRequest } from "next/server";

// Pemeriksaan optimis: tanpa cookie session langsung ke /login.
// Validasi session yang sebenarnya (ke database) dilakukan di layout portal.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("sidik_session")) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/biodata/:path*",
    "/keuangan/:path*",
    "/pengumuman/:path*",
    "/coming-soon/:path*",
    "/portal-staf/:path*",
    "/admin-keuangan/:path*",
  ],
};
