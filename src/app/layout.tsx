import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { AppToaster } from "@/components/AppToaster";
import { I18nProvider } from "@/i18n/client";
import { directionFor } from "@/i18n/locales";
import { getLocale } from "@/i18n/server";
import "./globals.css";

// Brand fonts (Loyalty Card UAE guidelines): Comfortaa for headings and short
// lines, Nunito for body text and app screens. Both are SIL Open Font License
// variable fonts, served from the app itself (no Google Fonts request).
const comfortaa = localFont({
  src: "./fonts/Comfortaa-Variable.woff2",
  variable: "--font-comfortaa",
  weight: "300 700",
  display: "swap",
  fallback: ["Arial Rounded MT Bold", "Arial", "sans-serif"],
});

const nunito = localFont({
  src: "./fonts/Nunito-Variable.woff2",
  variable: "--font-nunito",
  weight: "200 1000",
  display: "swap",
  fallback: ["Segoe UI", "Arial", "sans-serif"],
});

// Arabic UI text: IBM Plex Sans Arabic (OFL). Comfortaa and Nunito have no
// Arabic glyphs, so html[lang="ar"] switches both font tokens to this one.
const plexArabic = localFont({
  src: [
    { path: "./fonts/IBMPlexSansArabic-400.woff2", weight: "400" },
    { path: "./fonts/IBMPlexSansArabic-500.woff2", weight: "500" },
    { path: "./fonts/IBMPlexSansArabic-600.woff2", weight: "600" },
    { path: "./fonts/IBMPlexSansArabic-700.woff2", weight: "700" },
  ],
  variable: "--font-arabic",
  display: "swap",
  fallback: ["Segoe UI", "Tahoma", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://loyaltycarduae.com"),
  title: {
    default: "Loyalty Card UAE | Digital Loyalty Platform",
    template: "%s | Loyalty Card UAE",
  },
  description: "Digital loyalty cards for restaurants, cafes, retail stores and businesses across the UAE.",
  openGraph: {
    title: "Loyalty Card UAE | Digital Loyalty Platform",
    description: "Digital loyalty cards for restaurants, cafes, retail stores and businesses across the UAE.",
    url: "https://loyaltycarduae.com",
    siteName: "Loyalty Card UAE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Loyalty Card UAE | Digital Loyalty Platform",
    description: "Digital loyalty cards for restaurants, cafes, retail stores and businesses across the UAE.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#141210",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      dir={directionFor(locale)}
      className={`${comfortaa.variable} ${nunito.variable} ${plexArabic.variable} h-full overflow-x-clip antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-clip">
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <Suspense>
          <AppToaster />
        </Suspense>
      </body>
    </html>
  );
}
