import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { MobileNav } from "@/components/layout/mobile-nav";
import { I18nProvider } from "@/i18n";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#1B3A6B",
};

export const metadata: Metadata = {
  title: "Pavelo — AI Estate Agent",
  description:
    "Your AI estate agent that listens, remembers, and delivers. Voice-first property search powered by Xara.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pavelo",
  },
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
        <AuthProvider>
          <I18nProvider>
          {/* Skip to content — accessibility (S10-06) */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none"
          >
            Skip to main content
          </a>
          <div className="flex min-h-screen flex-col">
            <header className="border-b border-[var(--border)] px-6 py-4" role="banner">
              <nav className="mx-auto flex max-w-7xl items-center justify-between" aria-label="Main navigation" role="navigation">
                <a href="/" className="text-xl font-bold text-[var(--color-primary)]">
                  Pavelo
                </a>
                <div className="hidden items-center gap-4 md:flex">
                  <a
                    href="/property"
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Properties
                  </a>
                  <a
                    href="/chat"
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Chat
                  </a>
                  <a
                    href="/chat?voice=true"
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Voice
                  </a>
                  <a
                    href="/dashboard"
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/sell"
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Sell
                  </a>
                  <a
                    href="/saved"
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Saved
                  </a>
                  <a
                    href="/agency"
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Agency
                  </a>
                  <a
                    href="/auth/login"
                    className="text-sm font-medium text-[var(--color-accent)] hover:underline"
                  >
                    Sign In
                  </a>
                </div>
              </nav>
            </header>
            <main id="main-content" className="flex-1 pb-16 md:pb-0" role="main">{children}</main>
            <MobileNav />
          </div>
        </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
