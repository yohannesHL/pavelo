import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative flex min-h-[calc(100vh-65px)] flex-col items-center justify-center px-6">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D1B2A] via-[#132B4D] to-[#1B3A6B] -z-10" />

      {/* Xara Avatar (CSS-only animated circle) */}
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-4xl font-bold shadow-xl animate-breathe motion-reduce:animate-none">
        X
      </div>

      <h1
        className="text-3xl sm:text-5xl font-bold text-white mb-3"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Hi, I&apos;m Xara
      </h1>
      <p className="text-white/60 text-base sm:text-lg max-w-lg text-center mb-10">
        Your AI estate agent. Let&apos;s find your perfect property.
      </p>

      {/* Primary CTA */}
      <Link
        href="/chat?voice=true"
        className="flex items-center gap-3 px-8 py-4 rounded-full bg-[#F4A261] hover:bg-[#F6B87A] text-[#0D1B2A] font-semibold text-lg transition-all duration-200 shadow-lg shadow-[#F4A261]/25 hover:shadow-xl hover:scale-105 motion-reduce:hover:scale-100"
      >
        🎙 Talk to Xara
      </Link>

      {/* Secondary CTAs */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <Link
          href="/chat"
          className="text-white/50 hover:text-white/80 text-sm transition-colors"
        >
          Or type instead →
        </Link>
        <Link
          href="/onboarding"
          className="text-[#2E86AB] hover:text-[#3A9DC0] text-sm transition-colors"
        >
          Set up manually
        </Link>
      </div>

      {/* Trust signals */}
      <div className="mt-16 flex flex-wrap justify-center gap-6 text-white/30 text-xs">
        <span>🎤 Voice-powered</span>
        <span>🧠 Remembers your preferences</span>
        <span>🇬🇧 UK property data</span>
      </div>
    </div>
  );
}
