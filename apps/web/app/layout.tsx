import type { ReactNode } from "react";
import Link from "next/link";
import { Newsreader, Karla, Inconsolata } from "next/font/google";

import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});

const karla = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body",
});

const inconsolata = Inconsolata({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata = {
  title: "SARA-Scope",
  description: "Systematic Analysis & Research Annotation — Scope",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${karla.variable} ${inconsolata.variable}`}
    >
      <body>
        <div className="container">
          <header className="header">
            <Link href="/" className="brand">
              sara<span className="brand-dot">-</span>scope
            </Link>
            <nav className="nav">
              <Link href="/papers" className="nav-link">
                Papers
              </Link>
              <Link href="/export" className="nav-link">
                Export
              </Link>
            </nav>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
