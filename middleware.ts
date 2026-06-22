import { NextRequest, NextResponse } from "next/server";

const AUTH_PAGES = ["/login", "/signup"];
const PROTECTED = ["/dashboard"];

export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get("session")?.value);
  const { pathname } = req.nextUrl;
  if (PROTECTED.some((p) => pathname.startsWith(p)) && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (AUTH_PAGES.some((p) => pathname.startsWith(p)) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/login", "/signup/:path*", "/signup"] };
