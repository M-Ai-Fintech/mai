import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Public_Sans } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/Navigation/AppShell";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "M&A Low-Touch Middleware",
  description: "Web Dashboard for M&A Middleware",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakartaSans.variable} ${publicSans.variable} bg-background font-sans text-foreground antialiased`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
