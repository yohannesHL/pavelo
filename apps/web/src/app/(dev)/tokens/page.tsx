/**
 * Design Tokens — Living Style Guide
 * Dev-only route at /(dev)/tokens
 * Renders all design tokens visually for team reference
 */
export default function TokensPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 space-y-16">
      <header>
        <h1 className="text-3xl font-bold">Design Tokens</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Pavelo design system — Sprint 1 foundation
        </p>
      </header>

      {/* Colors */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Colors</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <ColorSwatch name="Primary" variable="--color-primary" hex="#1B3A6B" />
          <ColorSwatch name="Accent" variable="--color-accent" hex="#2E86AB" />
          <ColorSwatch name="Gold" variable="--color-gold" hex="#F4A261" />
          <ColorSwatch name="Primary Light" variable="--color-primary-light" hex="#2a5298" />
          <ColorSwatch name="Accent Light" variable="--color-accent-light" hex="#45a0c4" />
          <ColorSwatch name="Gold Light" variable="--color-gold-light" hex="#f6b87a" />
          <ColorSwatch name="Success" variable="--color-success" hex="#10b981" />
          <ColorSwatch name="Warning" variable="--color-warning" hex="#f59e0b" />
          <ColorSwatch name="Error" variable="--color-error" hex="#ef4444" />
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Typography</h2>
        <div className="space-y-6 rounded-[var(--radius-card)] border border-[var(--border)] p-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              Headings — Playfair Display
            </p>
            <p className="mt-2 text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
              The quick brown fox jumps over the lazy dog
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              UI Text — Inter
            </p>
            <p className="mt-2 text-lg" style={{ fontFamily: "var(--font-ui)" }}>
              The quick brown fox jumps over the lazy dog
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              Data Values — JetBrains Mono
            </p>
            <p className="mt-2 text-lg" style={{ fontFamily: "var(--font-data)" }}>
              £1,250,000 · 3 bed · 1,450 sqft · SW1A 1AA
            </p>
          </div>
        </div>
      </section>

      {/* Radii */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Border Radius</h2>
        <div className="flex flex-wrap gap-6">
          <RadiusSample name="Card" variable="--radius-card" value="12px" size="120px" />
          <RadiusSample name="Input" variable="--radius-input" value="8px" size="80px" />
          <RadiusSample name="Badge" variable="--radius-badge" value="4px" size="60px" />
        </div>
      </section>

      {/* Shadows */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Shadows</h2>
        <div className="flex flex-wrap gap-6">
          <ShadowSample name="sm" variable="--shadow-sm" />
          <ShadowSample name="md" variable="--shadow-md" />
          <ShadowSample name="lg" variable="--shadow-lg" />
          <ShadowSample name="card" variable="--shadow-card" />
        </div>
      </section>

      {/* Motion */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Motion</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
            <p className="text-sm font-medium">UI Transitions</p>
            <p className="font-mono text-xs text-[var(--muted-foreground)]">200ms ease-out</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
            <p className="text-sm font-medium">Map Animations</p>
            <p className="font-mono text-xs text-[var(--muted-foreground)]">600ms ease-in-out</p>
          </div>
        </div>
      </section>

      {/* Spacing */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Spacing Scale</h2>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((n) => (
            <div key={n} className="flex items-center gap-4">
              <span className="w-12 text-right font-mono text-xs text-[var(--muted-foreground)]">
                {n * 4}px
              </span>
              <div
                className="h-4 rounded bg-[var(--color-accent)]"
                style={{ width: `${n * 4}px` }}
              />
              <span className="text-xs text-[var(--muted-foreground)]">--space-{n}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ColorSwatch({
  name,
  variable,
  hex,
}: {
  name: string;
  variable: string;
  hex: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-input)] border border-[var(--border)] p-3">
      <div
        className="h-12 w-12 rounded-[var(--radius-input)] border border-[var(--border)]"
        style={{ backgroundColor: `var(${variable})` }}
      />
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="font-mono text-xs text-[var(--muted-foreground)]">{hex}</p>
        <p className="font-mono text-xs text-[var(--muted-foreground)]">{variable}</p>
      </div>
    </div>
  );
}

function RadiusSample({
  name,
  variable,
  value,
  size,
}: {
  name: string;
  variable: string;
  value: string;
  size: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="border-2 border-[var(--color-primary)] bg-[var(--muted)]"
        style={{
          width: size,
          height: size,
          borderRadius: `var(${variable})`,
        }}
      />
      <p className="text-sm font-medium">{name}</p>
      <p className="font-mono text-xs text-[var(--muted-foreground)]">{value}</p>
    </div>
  );
}

function ShadowSample({ name, variable }: { name: string; variable: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="h-20 w-20 rounded-[var(--radius-card)] bg-white"
        style={{ boxShadow: `var(${variable})` }}
      />
      <p className="text-sm font-medium">{name}</p>
      <p className="font-mono text-xs text-[var(--muted-foreground)]">{variable}</p>
    </div>
  );
}
