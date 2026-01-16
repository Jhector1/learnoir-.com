"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import UserMenuSlick from "./UserMenuSlick";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";

type NavItem = { href: string; label: string };

function cn(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(" ");
}

export default function HeaderSlick({
  brand = "Learnoir",
  badge = "BETA",
}: {
  brand?: string;
  badge?: string;
}) {
  const t = useTranslations("Header");
  const locale = useLocale(); // "en" | "fr" | "ht"
  const pathname = usePathname(); // locale-aware pathname
  const { data: session, status } = useSession();

  const user = session?.user;
  const isAuthed = !!user;

  const NAV: NavItem[] = useMemo(
    () => [
      { href: "/", label: t("home") },
      { href: "/practice/sections", label: t("practice") },
      { href: "/assignments", label: t("assignments") },
    ],
    [t]
  );

  const [open, setOpen] = useState(false);
  const [elevated, setElevated] = useState(false);

  useEffect(() => {
    const onScroll = () => setElevated(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const activeIndex = useMemo(() => {
    const idx = NAV.findIndex((n) =>
      n.href === "/" ? pathname === "/" : pathname?.startsWith(n.href)
    );
    return idx < 0 ? 0 : idx;
  }, [pathname, NAV]);

  return (
    <header className="sticky top-0 z-50">
      <div className="mt-2 flex items-center justify-between">
  <LocaleSwitcher  />
</div>

      <div
        className={cn(
          "border-b border-white/10",
          elevated ? "bg-black/55 backdrop-blur-xl" : "bg-black/20 backdrop-blur-md"
        )}
      >
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            {/* Brand */}
            <Link href="/" className="group flex items-center gap-2">
              <div className="relative grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_30%_20%,rgba(122,162,255,0.35)_0%,rgba(255,107,214,0.12)_35%,transparent_70%)] opacity-80" />
                <span className="relative text-sm font-black tracking-tight text-white">L</span>
              </div>

              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black tracking-tight text-white/90">{brand}</span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-2 py-[2px] text-[10px] font-extrabold text-white/70">
                    {badge}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-white/55">
                  {t("tagline")}
                </div>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-2">
              <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-1 shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
                <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(900px_280px_at_50%_0%,rgba(255,255,255,0.10)_0%,transparent_60%)]" />

                <div className="relative flex items-center gap-1">
                  <div
                    className="pointer-events-none absolute top-1 bottom-1 rounded-xl border border-white/10 bg-white/10 transition-all duration-300"
                    style={{
                      left: `calc(${activeIndex} * (100% / ${NAV.length}) + 4px)`,
                      width: `calc(100% / ${NAV.length} - 8px)`,
                    }}
                  />

                  {NAV.map((n) => {
                    const isActive = n.href === "/" ? pathname === "/" : pathname?.startsWith(n.href);
                    return (
                      <Link
                        key={n.href}
                        href={n.href}
                        className={cn(
                          "relative z-10 rounded-xl px-3 py-2 text-xs font-extrabold transition",
                          isActive ? "text-white/95" : "text-white/70 hover:text-white/90"
                        )}
                      >
                        {n.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* CTA */}
              <Link
                href="/practice"
                className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-extrabold text-white/90 hover:bg-emerald-300/15 active:translate-y-[1px]"
              >
                {t("startSession")}
              </Link>

              {/* User menu / Sign in */}
              {status !== "loading" && (
                isAuthed ? (
                  <UserMenuSlick
                    name={user?.name ?? "User"}
                    email={user?.email}
                    image={user?.image}
                    profileHref="/profile"
                    onSignOut={() => signOut({ callbackUrl: `/${locale}` })}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => signIn()}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-extrabold text-white/85 hover:bg-white/[0.10]"
                  >
                    {t("signIn")}
                  </button>
                )
              )}
            </nav>

            {/* Mobile button */}
            <button
              className="md:hidden rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-extrabold text-white/80 hover:bg-white/[0.10]"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label="Toggle menu"
            >
              {open ? t("close") : t("menu")}
            </button>
          </div>

          {/* Mobile panel */}
          <div
            className={cn(
              "md:hidden overflow-hidden transition-[max-height,opacity] duration-300",
              open ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="pb-4">
              <div className="mt-2 grid gap-2">
                {NAV.map((n) => {
                  const isActive = n.href === "/" ? pathname === "/" : pathname?.startsWith(n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-sm font-extrabold transition",
                        isActive
                          ? "border-emerald-300/30 bg-emerald-300/10 text-white/90"
                          : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                      )}
                    >
                      {n.label}
                    </Link>
                  );
                })}
                  <LocaleSwitcher />

                <Link
                  href="/practice"
                  className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-3 text-sm font-extrabold text-white/90 hover:bg-emerald-300/15"
                >
                  {t("startSession")}
                </Link>

                {status !== "loading" && (
                  isAuthed ? (
                    <>
                      <Link
                        href="/profile"
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-extrabold text-white/85 hover:bg-white/[0.08]"
                      >
                        {t("profile")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: `/${locale}` })}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-extrabold text-white/85 hover:bg-white/[0.08]"
                      >
                        {t("logout")}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => signIn()}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-extrabold text-white/85 hover:bg-white/[0.08]"
                    >
                      {t("signIn")}
                    </button>
                  )
                )}
              </div>

              <div className="mt-3 text-[11px] text-white/55">
                {t("tip")}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-[linear-gradient(90deg,transparent,rgba(122,162,255,0.45),rgba(255,107,214,0.35),transparent)]" />
    </header>
  );
}
