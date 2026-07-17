import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AppToaster } from "@/components/AppToaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-x-clip antialiased`}
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
