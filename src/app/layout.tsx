import type { Metadata } from "next";
import { Space_Grotesk, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const playfair = Playfair_Display({
  variable: "--font-accent",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "InCaseOf | Your Emergency Info, Sorted",
  description:
    "Fill in your emergency info once. Share it with the people who matter. Free, guided, and stored on your own Google Drive.",
  verification: {
    google: "kKTDEiUX7tJ4b6y2YBTpvG2mhaU7eUuXlapX_eKajVc",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${playfair.variable}`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
