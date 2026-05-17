import type { Metadata } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";

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
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <header className="border-b border-[var(--border)] px-6 py-4">
              <nav className="mx-auto flex max-w-7xl items-center justify-between">
                <a href="/" className="text-xl font-bold text-[var(--color-primary)]">
                  Pavelo
                </a>
                <div className="flex items-center gap-4">
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
                    href="/dashboard"
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Dashboard
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
            <main className="flex-1">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
