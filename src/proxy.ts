// src/proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function isPublicPath(pathname: string) {
  if (
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/authenticate") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/billing")
  ) {
    return true;
  }
  return false;
}

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/assignments") ||
    pathname.startsWith("/profile")
  );
}

// Try to detect the actual cookie name present on the request (v4 + v5 + secure cookies)
const POSSIBLE_SESSION_COOKIES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
] as const;

export default async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublicPath(pathname) || !isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // IMPORTANT: middleware must use the same secret your auth uses
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!secret) {
    // Fail closed if prod env is missing the secret (otherwise token decode will always be null)
    const url = req.nextUrl.clone();
    url.pathname = "/authenticate";
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  const cookieName =
    POSSIBLE_SESSION_COOKIES.find((name) => req.cookies.get(name)) ?? undefined;

  // Build options (Auth.js v5 may need salt=cookieName in some environments)
  const opts: any = { req, secret };
  if (cookieName) {
    opts.cookieName = cookieName;
    opts.salt = cookieName;
  }

  const token = await getToken(opts);

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/authenticate";
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
