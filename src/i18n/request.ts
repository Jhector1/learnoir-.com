import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

type AnyObj = Record<string, any>;

function isObject(v: any): v is AnyObj {
  return v && typeof v === "object" && !Array.isArray(v);
}

// Deep merge so nested keys merge correctly (Header, Module0, etc.)
function deepMerge<T extends AnyObj>(base: T, override: AnyObj): T {
  const out: AnyObj = { ...base };

  for (const k of Object.keys(override ?? {})) {
    const bv = out[k];
    const ov = override[k];

    if (isObject(bv) && isObject(ov)) out[k] = deepMerge(bv, ov);
    else out[k] = ov;
  }

  return out as T;
}

async function loadBundles(locale: string) {
  // Add/remove bundles here (this is your “per page” modularization)
  const bundles = await Promise.all([
    import(`./messages/${locale}/common.json`),
    import(`./messages/${locale}/playground.json`),
    import(`./messages/${locale}/spanBasis.json`),
    import(`./messages/${locale}/module0.json`),
    import(`./messages/${locale}/practice.json`),
    import(`./messages/${locale}/practiceSection.json`),
    import(`./messages/${locale}/sketchesVectorPart1.json`),
    import(`./messages/${locale}/matricesPart2Landing.json`)
  ]);

  // Merge all bundle defaults into one big messages object
  return bundles.reduce((acc, mod) => deepMerge(acc, mod.default), {} as AnyObj);
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!hasLocale(routing.locales, locale)) {
    locale = routing.defaultLocale;
  }

  // ✅ fallback: merge defaultLocale first, then override with current locale
  const base = await loadBundles(routing.defaultLocale);

  // If locale === defaultLocale, don’t load twice
  const localized =
    locale === routing.defaultLocale ? {} : await loadBundles(locale);

  return {
    locale,
    messages: deepMerge(base, localized)
  };
});
