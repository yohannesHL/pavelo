/**
 * Agency Branding Settings Page (S9-05)
 *
 * White-label configuration: logo, primary color, accent color,
 * persona name override, custom domain.
 * CSS custom property overrides applied via style attribute.
 */

"use client";

import { useState } from "react";

interface BrandingConfig {
  logo: string | null;
  primaryColor: string;
  accentColor: string;
  personaName: string;
  customDomain: string | null;
}

const defaultConfig: BrandingConfig = {
  logo: null,
  primaryColor: "#1B3A6B",
  accentColor: "#2E86AB",
  personaName: "Xara",
  customDomain: null,
};

export default function BrandingSettingsPage() {
  const [config, setConfig] = useState<BrandingConfig>(defaultConfig);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Would call tRPC agency.updateConfig
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setConfig(defaultConfig);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0D1B2A]">Branding & White-label</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Customise the look and feel of your AI agent experience.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Config Form */}
        <div className="space-y-6">
          {/* Logo */}
          <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-[#0D1B2A]">Agency Logo</h3>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--muted)]">
                {config.logo ? (
                  <img src={config.logo} alt="Logo" className="h-12 w-12 object-contain" />
                ) : (
                  <span className="text-2xl">🏢</span>
                )}
              </div>
              <div>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={config.logo || ""}
                  onChange={(e) => setConfig({ ...config, logo: e.target.value || null })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                />
                <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">PNG or SVG, max 512px width</p>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-[#0D1B2A]">Brand Colors</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="h-10 w-10 cursor-pointer rounded-lg border border-[var(--border)]"
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm font-mono outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                    className="h-10 w-10 cursor-pointer rounded-lg border border-[var(--border)]"
                  />
                  <input
                    type="text"
                    value={config.accentColor}
                    onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm font-mono outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Persona Name */}
          <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-[#0D1B2A]">AI Persona Name</h3>
            <input
              type="text"
              value={config.personaName}
              onChange={(e) => setConfig({ ...config, personaName: e.target.value })}
              placeholder="Xara"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
            <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
              This name replaces &quot;Xara&quot; in all conversations and system prompts.
            </p>
          </div>

          {/* Custom Domain */}
          <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-[#0D1B2A]">Custom Domain</h3>
            <input
              type="text"
              value={config.customDomain || ""}
              onChange={(e) => setConfig({ ...config, customDomain: e.target.value || null })}
              placeholder="ai.youragency.com"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
            <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
              Enterprise plan only. Point a CNAME to pavelo.app.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
            >
              {saved ? "✓ Saved!" : "Save Changes"}
            </button>
            <button
              onClick={handleReset}
              className="rounded-lg border border-[var(--border)] px-6 py-2.5 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              Reset to Default
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#0D1B2A]">Live Preview</h3>
          <div
            className="rounded-xl border border-[var(--border)] bg-white shadow-lg overflow-hidden"
            style={{
              "--preview-primary": config.primaryColor,
              "--preview-accent": config.accentColor,
            } as React.CSSProperties}
          >
            {/* Mock Chat Header */}
            <div
              className="px-5 py-4 text-white"
              style={{ backgroundColor: config.primaryColor }}
            >
              <div className="flex items-center gap-3">
                {config.logo ? (
                  <img src={config.logo} alt="" className="h-8 w-8 rounded-lg bg-white/20 object-contain p-1" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-bold">
                    {config.personaName[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">{config.personaName}</p>
                  <p className="text-[10px] opacity-80">AI Estate Agent</p>
                </div>
              </div>
            </div>

            {/* Mock Chat Messages */}
            <div className="p-4 space-y-3" style={{ minHeight: "300px", backgroundColor: "#f9fafb" }}>
              <div className="flex justify-end">
                <div
                  className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white max-w-[70%]"
                  style={{ backgroundColor: config.accentColor }}
                >
                  I&apos;m looking for a 3-bed house in Islington
                </div>
              </div>

              <div className="flex gap-2">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: config.primaryColor }}
                >
                  {config.personaName[0]}
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-white border border-gray-200 px-4 py-2.5 text-sm max-w-[75%] shadow-sm">
                  <p>Great choice! I&apos;ve found <strong>12 properties</strong> matching your criteria in Islington.</p>
                  <p className="mt-1 text-[var(--muted-foreground)]">Would you like me to show you the top matches?</p>
                </div>
              </div>

              {/* Mock Property Card */}
              <div className="ml-9 rounded-xl border bg-white p-3 shadow-sm max-w-[75%]">
                <div className="h-24 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 mb-2" />
                <p className="font-semibold text-sm">42 Richmond Hill, N1</p>
                <p
                  className="font-bold"
                  style={{ color: config.accentColor, fontFamily: "var(--font-data)" }}
                >
                  £485,000
                </p>
                <p className="text-xs text-gray-500">3 bed • 2 bath • 1,250 sqft</p>
              </div>
            </div>

            {/* Mock Input */}
            <div className="border-t px-4 py-3 flex gap-2">
              <input
                disabled
                placeholder={`Ask ${config.personaName} anything...`}
                className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm"
              />
              <button
                disabled
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: config.accentColor }}
              >
                Send
              </button>
            </div>
          </div>

          {/* CSS Override Info */}
          <div className="mt-4 rounded-lg bg-[var(--muted)] p-3">
            <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
              CSS Custom Properties
            </p>
            <pre className="text-[11px] text-[#0D1B2A]" style={{ fontFamily: "var(--font-data)" }}>
{`:root {
  --color-primary: ${config.primaryColor};
  --color-accent: ${config.accentColor};
  --persona-name: "${config.personaName}";
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
