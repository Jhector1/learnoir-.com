import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import "./globals.css";
import HeaderSlick from "../components/HeaderSlick";
import Providers from "./providers";
import { auth } from "@/lib/auth";

const SITE_NAME = "Learnoir";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"; // TODO: replace with your real domain
const OG_IMAGE = `${SITE_URL}/og.png`;   // TODO: create this image (1200x630)

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: `${SITE_NAME} — Practice Math & Programming`,
    template: `%s — ${SITE_NAME}`,
  },

  description:
    "Learnoir is an interactive learning platform where students practice math and programming with quizzes, assignments, and visual simulations—covering algebra, calculus, linear algebra, and more.",

  applicationName: SITE_NAME,
  category: "education",

  keywords: [
    "Learnoir",
    "math practice",
    "programming practice",
    "interactive learning",
    "quizzes",
    "assignments",
    "algebra",
    "calculus",
    "linear algebra",
    "vectors",
    "matrices",
    "Python practice",
    "JavaScript practice",
  ],

  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,

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

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Practice Math & Programming`,
    description:
      "Practice math and programming with interactive quizzes, assignments, and simulations.",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Practice Math & Programming`,
      },
    ],
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Practice Math & Programming`,
    description:
      "Interactive platform for students to learn and practice math and programming with quizzes, assignments, and simulations.",
    images: [OG_IMAGE],
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png", // optional
  },

  manifest: "/site.webmanifest", // optional
  // themeColor is supported but often better placed in viewport export for Next 14/15+,
  // still okay here if your version accepts it:
  // themeColor: "#000000",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="en">
      <body className="bg-black">
        <Providers session={session}>
          <HeaderSlick brand="Learnoir" badge="MVP" />
          {children}
        </Providers>
      </body>
    </html>
  );
}
