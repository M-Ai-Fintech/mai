import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

export const metadata: Metadata = {
  title: "M&Ai Frontend Foundation",
  description: "Neutral frontend foundation pending governed implementation.",
};

/**
 * Provides the minimal document and i18n boundary for the frontend foundation.
 *
 * @example <RootLayout><Page /></RootLayout>
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><I18nProvider>{children}</I18nProvider></body>
    </html>
  );
}
