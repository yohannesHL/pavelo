import type { Metadata } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-data",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pavelo — AI Estate Agent",
  description:
    "Your AI estate agent that listens, remembers, and delivers. Voice-first property search powered by Xara.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-[var(--border)] px-6 py-4">
            <nav className="mx-auto flex max-w-7xl items-center justify-between">
              <a href="/" className="text-xl font-bold text-[var(--color-primary)]">
                Pavelo
              </a>
              <span className="text-sm text-[var(--muted-foreground)]">
                v0.1.0 — Sprint 1
              </span>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
