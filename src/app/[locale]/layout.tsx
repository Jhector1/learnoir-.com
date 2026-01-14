import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

import type { Metadata } from "next";
import "../globals.css"; // 👈 note: relative changes (was "./globals.css" before)

import HeaderSlick from "@/components/HeaderSlick";
import Providers from "../providers";
import { auth } from "@/lib/auth";

import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";

const SITE_NAME = "Learnoir";
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const OG_IMAGE = `${SITE_URL}/og.png`;

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> }
): Promise<Metadata> {
  const { locale } = await params;

  // OPTIONAL: customize per locale (simple example)
  const isFr = locale === "fr";
  const isHt = locale === "ht";

  const titleDefault = isFr
    ? `${SITE_NAME} — Pratiquer les maths et la programmation`
    : isHt
    ? `${SITE_NAME} — Pratike Matematik & Pwogramasyon`
    : `${SITE_NAME} — Practice Math & Programming`;

  const description = isFr
    ? "Learnoir est une plateforme interactive où les étudiants pratiquent les maths et la programmation avec des quiz, des devoirs et des simulations."
    : isHt
    ? "Learnoir se yon platfòm entèaktif kote elèv pratike matematik ak pwogramasyon ak quiz, devwa, ak similasyon."
    : "Learnoir is an interactive learning platform where students practice math and programming with quizzes, assignments, and visual simulations—covering algebra, calculus, linear algebra, and more.";

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: titleDefault,
      template: `%s — ${SITE_NAME}`,
    },
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        fr: "/fr",
        ht: "/ht",
      },
    },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/${locale}`,
      siteName: SITE_NAME,
      title: titleDefault,
      description,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: titleDefault }],
      locale: locale === "fr" ? "fr_FR" : locale === "ht" ? "ht_HT" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: titleDefault,
      description,
      images: [OG_IMAGE],
    },
    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) notFound();

  // Helps keep rendering static when possible
  setRequestLocale(locale);

  const session = await auth();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="bg-black">
        <NextIntlClientProvider messages={messages}>
          <Providers session={session}>
            <HeaderSlick brand="Learnoir" badge="MVP" />
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
