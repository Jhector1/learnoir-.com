// src/app/[locale]/practice/page.tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

type PartId = "part-1" | "part-2";

type Part = {
  id: PartId;
  badgeKey: string;
  titleKey: string;
  subtitleKey: string;
  learnHref: string;
  practiceHref: string;
  bulletsCount: number; // we’ll read bullets as an indexed list
};

const parts: Part[] = [
  {
    id: "part-1",
    badgeKey: "parts.part1.badge",
    titleKey: "parts.part1.title",
    subtitleKey: "parts.part1.subtitle",
    learnHref: "/practice/review/vectors_part1",
    practiceHref:
      "/practice?section=module-0-vectors-part-1&difficulty=all&topic=vectors_part1",
    bulletsCount: 8,
  },
  {
    id: "part-2",
    badgeKey: "parts.part2.badge",
    titleKey: "parts.part2.title",
    subtitleKey: "parts.part2.subtitle",
    learnHref: "/practice/review/vectors_part2",
    practiceHref:
      "/practice?section=module-0-vectors-part-2&difficulty=all&topic=vectors_part2",
    bulletsCount: 8,
  },
];

function PartCard({ part }: { part: Part }) {
  const t = useTranslations("VectorsLanding");

  const badge = t(part.badgeKey as any);
  const title = t(part.titleKey as any);
  const subtitle = t(part.subtitleKey as any);

  const bullets = Array.from({ length: part.bulletsCount }, (_, i) =>
    t(`parts.${part.id === "part-1" ? "part1" : "part2"}.bullets.${i}` as any)
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-black tracking-tight text-white/90">
              {title}
            </div>
            <div className="mt-1 text-sm text-white/70">{subtitle}</div>
          </div>

          <span
            className={[
              "shrink-0 rounded-full border px-3 py-1 text-[11px] font-extrabold",
              part.id === "part-1"
                ? "border-emerald-300/30 bg-emerald-300/10 text-white"
                : "border-sky-300/30 bg-sky-300/10 text-white",
            ].join(" ")}
          >
            {badge}
          </span>
        </div>

        <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs font-extrabold text-white/70">
            {t("whatYouLearn")}
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-white/70">
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>

        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <Link
            href={part.learnHref}
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15"
          >
            {t("readMaterial")}
          </Link>

          <Link
            href={part.practiceHref}
            className={[
              "rounded-xl border px-3 py-2 text-xs font-extrabold transition",
              part.id === "part-1"
                ? "border-emerald-300/30 bg-emerald-300/10 text-white hover:bg-emerald-300/15"
                : "border-sky-300/30 bg-sky-300/10 text-white hover:bg-sky-300/15",
            ].join(" ")}
          >
            {t("practiceNow")}
          </Link>
        </div>

        <div className="text-xs text-white/50">{t("practiceNowHint")}</div>
      </div>
    </div>
  );
}

export default function VectorsLandingPage() {
  const t = useTranslations("VectorsLanding");

  return (
    <div className="min-h-screen p-4 md:p-6 bg-[radial-gradient(1200px_700px_at_20%_0%,#151a2c_0%,#0b0d12_50%)] text-white/90">
      <div className="mx-auto max-w-5xl">
        {/* header */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="text-lg font-black tracking-tight">
                {t("pageTitle")}
              </div>
              <div className="mt-1 text-sm text-white/70">{t("pageIntro")}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/practice?section=module-0-vectors-part-1&difficulty=easy&topic=vectors_part1"
                className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-300/15"
              >
                {t("quickStartPart1Easy")}
              </Link>

              <Link
                href="/practice?section=module-0-vectors-part-2&difficulty=easy&topic=vectors_part2"
                className="rounded-xl border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-xs font-extrabold text-white hover:bg-sky-300/15"
              >
                {t("jumpPart2Easy")}
              </Link>
            </div>
          </div>
        </div>

        {/* cards */}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {parts.map((p) => (
            <PartCard key={p.id} part={p} />
          ))}
        </div>

        {/* recommended path */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5">
          <div className="text-sm font-black text-white/90">
            {t("recommendedPathTitle")}
          </div>

          <ol className="mt-3 space-y-2 text-sm text-white/70">
            <li className="flex gap-2">
              <span className="font-extrabold text-white/90">1.</span>
              <span>{t("recommended.0")}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-extrabold text-white/90">2.</span>
              <span>{t("recommended.1")}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-extrabold text-white/90">3.</span>
              <span>{t("recommended.2")}</span>
            </li>
          </ol>
        </div>

        <div className="mt-4 text-xs text-white/50">{t("routeHint")}</div>
      </div>
    </div>
  );
}
