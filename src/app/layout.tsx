import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { AppToaster } from "@/components/AppToaster";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${comfortaa.variable} ${nunito.variable} h-full overflow-x-clip antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-clip">
        {children}
        <Suspense>
          <AppToaster />
        </Suspense>
      </body>
    </html>
  );
}
