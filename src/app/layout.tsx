import type { Metadata } from "next";
import { Inter, Anton, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MMSPL — Markham Men's Slo-Pitch League",
    template: "%s | MMSPL",
  },
  description:
    "Markham's longest active men's softball league, established 1968. Standings, schedules, awards, registration and more.",
  metadataBase: new URL("https://mmspl.ca"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${anton.variable} ${spaceMono.variable} font-sans antialiased text-foreground bg-background`}
      >
        {children}
      </body>
    </html>
  );
}
