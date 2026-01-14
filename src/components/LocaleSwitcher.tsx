// src/components/LanguageSwitcher.tsx
"use client";

import React from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { routing } from "@/i18n/routing";
import { stripLocale } from "@/i18n/stripLocale";

function persistLocale(nextLocale: string) {
  try {
    localStorage.setItem("learnoir:locale", nextLocale);
  } catch {}

  // Optional but useful if you want server/middleware preference
  document.cookie = `NEXT_LOCALE=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const sp = useSearchParams();

  // IMPORTANT: read from the real URL (not a locale-aware helper)
  const rawPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const basePath = stripLocale(rawPath); // "/assignments" (no locale)

  const search = sp.toString();
  const href = search ? `${basePath}?${search}` : basePath;

  const changeTo = (nextLocale: string) => {
    if (nextLocale === locale) return;
    persistLocale(nextLocale);

    // KEY: next-intl will prefix the locale for you
    router.replace(href, { locale: nextLocale });
  };

  return (
    <div className="flex items-center gap-2">
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => changeTo(l)}
          className={[
            "rounded-xl border px-3 py-2 text-xs font-extrabold",
            l === locale
              ? "border-emerald-300/30 bg-emerald-300/15 text-white"
              : "border-white/10 bg-white/10 text-white/80 hover:bg-white/15",
          ].join(" ")}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
