// src/proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function isPublicPath(pathname: string) {
  // public pages + next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/authenticate") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/billing") ||
    pathname === "/"
  ) return true;

  return false;
}

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/assignments") ||
    pathname.startsWith("/profile")
  );
}

export default async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/authenticate";
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// (Optional) limit where proxy runs
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
