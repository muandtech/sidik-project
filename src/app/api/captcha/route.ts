import { NextResponse } from "next/server";
import { CAPTCHA_COOKIE, CAPTCHA_TTL_SECONDS, createCaptcha } from "@/lib/captcha";
import { renderCaptchaSvg } from "@/lib/captcha-glyph";

export async function GET() {
  const { code, token } = createCaptcha();
  const response = new NextResponse(renderCaptchaSvg(code), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store, max-age=0",
    },
  });
  response.cookies.set(CAPTCHA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: CAPTCHA_TTL_SECONDS,
  });
  return response;
}
