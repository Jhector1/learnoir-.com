// src/middleware.ts (or src/proxy.ts if you’re using that name)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const handleI18n = createMiddleware(routing);

function stripLocale(pathname: string) {
  const parts = pathname.split("/");
  const maybeLocale = parts[1];
  if (routing.locales.includes(maybeLocale as any)) {
    const rest = "/" + parts.slice(2).join("/");
    return { locale: maybeLocale, path: rest === "/" ? "/" : rest };
  }
  return { locale: routing.defaultLocale, path: pathname };
}

function hasLocalePrefix(pathname: string) {
  const maybeLocale = pathname.split("/")[1];
  return routing.locales.includes(maybeLocale as any);
}

function isPublicPath(pathname: string) {
  // IMPORTANT: pathname here is locale-stripped
  return (
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/authenticate") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/billing")
  );
}

function isProtectedPath(pathname: string) {
  // IMPORTANT: pathname here is locale-stripped
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/assignments") ||
    pathname.startsWith("/profile")
  );
}

const POSSIBLE_SESSION_COOKIES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
] as const;

// If you used document.cookie = `NEXT_LOCALE=...` in the language switcher:
const LOCALE_COOKIE = "NEXT_LOCALE";

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ If user hits a non-locale URL (e.g. /assignments), redirect to their saved locale:
  // This is the part that makes "language for the current page" persist across refreshes and direct links.
  if (!hasLocalePrefix(pathname)) {
    const saved = req.cookies.get(LOCALE_COOKIE)?.value;

    if (saved && routing.locales.includes(saved as any)) {
      const url = req.nextUrl.clone();
      url.pathname = `/${saved}${pathname === "/" ? "" : pathname}`;
      return NextResponse.redirect(url);
    }
  }

  // 1) let next-intl do locale detection + redirects/rewrites
  const res = handleI18n(req);

  const { pathname: p2, search } = req.nextUrl;
  const { locale, path } = stripLocale(p2);

  // 2) apply your auth checks on locale-stripped path
  if (isPublicPath(path) || !isProtectedPath(path)) return res;

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!secret) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/authenticate`;
    url.searchParams.set("callbackUrl", p2 + search);
    return NextResponse.redirect(url);
  }

  const cookieName =
    POSSIBLE_SESSION_COOKIES.find((name) => req.cookies.get(name)) ?? undefined;

  const opts: any = { req, secret };
  if (cookieName) {
    opts.cookieName = cookieName;
    opts.salt = cookieName;
  }

  const token = await getToken(opts);

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/authenticate`;
    url.searchParams.set("callbackUrl", p2 + search);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  // exclude next internals + files; keep your style
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
};