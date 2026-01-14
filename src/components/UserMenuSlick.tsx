"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Props = {
  name: string;
  email?: string | null;
  image?: string | null;
  profileHref?: string;
  onSignOut: () => void;
};

function cn(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(" ");
}

export default function UserMenuSlick({
  name,
  email,
  image,
  profileHref = "/profile",
  onSignOut,
}: Props) {
  const t = useTranslations("UserMenu");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const initials =
    (name || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-2.5 py-2",
          "text-xs font-extrabold text-white/85 shadow-[0_12px_30px_rgba(0,0,0,0.20)]",
          "hover:bg-white/[0.10] focus:outline-none focus:ring-2 focus:ring-white/15"
        )}
        aria-expanded={open}
        aria-label={t("ariaLabel")}
      >
        <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
          {image ? (
            <Image
              src={image}
              alt={t("avatarAlt", { name })}
              width={32}
              height={32}
              className="h-8 w-8 object-cover"
              unoptimized
            />
          ) : (
            <span className="text-[11px] font-black text-white/85">{initials}</span>
          )}
        </span>

        <span className="hidden lg:block max-w-[140px] truncate">{name}</span>

        <svg
          className={cn("h-3 w-3 text-white/60 transition", open && "rotate-180")}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown */}
      <div
        className={cn(
          "absolute right-0 mt-2 w-64 origin-top-right",
          "transition-[opacity,transform] duration-150",
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-1 pointer-events-none"
        )}
      >
        <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.55)] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="text-sm font-extrabold text-white/90 truncate">{name}</div>
            {email ? (
              <div className="mt-0.5 text-[12px] text-white/55 truncate">{email}</div>
            ) : null}
          </div>

          <div className="p-2">
            <Link
              href={profileHref}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-bold text-white/80 hover:bg-white/[0.08] hover:text-white/90"
            >
              {t("profile")}
            </Link>

            <Link
              href="/progress"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-bold text-white/80 hover:bg-white/[0.08] hover:text-white/90"
            >
              {t("progress")}
            </Link>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="mt-1 w-full text-left rounded-xl px-3 py-2 text-sm font-bold text-white/80 hover:bg-white/[0.08] hover:text-white/90"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
