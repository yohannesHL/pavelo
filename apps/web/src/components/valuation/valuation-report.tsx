"use client";

/**
 * Valuation Report Component (S8-05)
 *
 * Premium PDF-style report rendered in-browser.
 * Sections: property summary, estimated value, confidence indicator,
 * comparable properties, area price chart, methodology.
 *
 * Design: Playfair Display for values, gold accent for estimate, print-friendly
 */

import { motion } from "framer-motion";

// --- Types ---

interface Comparable {
  id: string;
  address: string;
  price: number;
  squareFeet: number;
  bedrooms: number;
  distance: number;
  dateSold: string;
  pricePerSqft: number | null;
}

interface Adjustment {
  factor: string;
  impact: number;
  direction: "up" | "down";
}

interface ValuationData {
  address: string;
  postcode: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  estimateLow: number;
  estimateMid: number;
  estimateHigh: number;
  confidence: number;
  pricePerSqft: number | null;
  marketTrend: string;
  marketTrendLabel: string;
  comparables: Comparable[];
  adjustments: { items: Adjustment[]; total: number };
  methodology: string;
  generatedAt: string;
}

interface ValuationReportProps {
  valuation: ValuationData;
  shareUrl?: string;
}

// --- Component ---

export function ValuationReport({ valuation, shareUrl }: ValuationReportProps) {
  const confidencePercent = Math.round(valuation.confidence * 100);
  const confidenceLabel =
    confidencePercent >= 70 ? "High" : confidencePercent >= 40 ? "Moderate" : "Low";
  const confidenceColor =
    confidencePercent >= 70
      ? "var(--color-success)"
      : confidencePercent >= 40
      ? "var(--color-gold)"
      : "var(--color-error)";

  const trendIcon =
    valuation.marketTrend === "up" ? "📈" : valuation.marketTrend === "down" ? "📉" : "➡️";

  return (
    <div className="valuation-report mx-auto max-w-4xl">
      {/* Print Header */}
      <div className="print-only mb-6 hidden text-center print:block">
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">Pavelo</h1>
        <p className="text-xs text-[var(--muted-foreground)]">AI Property Valuation Report</p>
      </div>

      {/* Hero Section — Estimated Value */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[var(--radius-card)] bg-gradient-to-br from-[var(--color-primary)] to-[#0D1B2A] p-8 text-center text-white shadow-lg"
      >
        <p className="text-sm font-medium uppercase tracking-wider text-white/60">
          Estimated Market Value
        </p>
        <p
          className="mt-3 text-5xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <span className="text-[var(--color-gold)]">
            £{valuation.estimateMid.toLocaleString("en-GB")}
          </span>
        </p>
        <div className="mt-3 flex items-center justify-center gap-6 text-sm text-white/70">
          <span>
            Low: £{valuation.estimateLow.toLocaleString("en-GB")}
          </span>
          <span className="h-3 w-px bg-white/30" />
          <span>
            High: £{valuation.estimateHigh.toLocaleString("en-GB")}
          </span>
        </div>

        {/* Confidence Bar */}
        <div className="mx-auto mt-6 max-w-xs">
          <div className="flex items-center justify-between text-xs">
            <span>Confidence</span>
            <span
              className="font-semibold"
              style={{ color: confidenceColor }}
            >
              {confidenceLabel} ({confidencePercent}%)
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidencePercent}%` }}
              transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: confidenceColor }}
            />
          </div>
        </div>

        {/* Market Trend */}
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs">
          <span>{trendIcon}</span>
          <span>{valuation.marketTrendLabel}</span>
        </div>
      </motion.div>

      {/* Property Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-6 shadow-sm"
      >
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Property Summary
        </h3>
        <p className="mt-2 font-[var(--font-heading)] text-xl font-bold text-[var(--foreground)]">
          {valuation.address}
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">{valuation.postcode}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Type"
            value={valuation.propertyType.replace("_", " ")}
          />
          <StatCard
            label="Bedrooms"
            value={String(valuation.bedrooms)}
            isNumber
          />
          <StatCard
            label="Bathrooms"
            value={String(valuation.bathrooms)}
            isNumber
          />
          <StatCard
            label="Floor Area"
            value={`${valuation.squareFeet.toLocaleString()} sqft`}
            isNumber
          />
        </div>

        {valuation.pricePerSqft && (
          <div className="mt-3 text-center">
            <span className="text-xs text-[var(--muted-foreground)]">Price per sq ft: </span>
            <span
              className="text-sm font-bold"
              style={{
                fontFamily: "var(--font-data)",
                color: "var(--color-gold)",
              }}
            >
              £{valuation.pricePerSqft.toLocaleString("en-GB")}
            </span>
          </div>
        )}
      </motion.div>

      {/* Value Adjustments */}
      {valuation.adjustments.items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-6 shadow-sm"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Value Adjustments
          </h3>
          <div className="mt-3 space-y-2">
            {valuation.adjustments.items.map((adj, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg bg-[var(--muted)] px-3 py-2"
              >
                <span className="text-sm text-[var(--foreground)]">
                  {adj.factor}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{
                    fontFamily: "var(--font-data)",
                    color:
                      adj.direction === "up"
                        ? "var(--color-success)"
                        : "var(--color-error)",
                  }}
                >
                  {adj.direction === "up" ? "+" : "-"}£
                  {adj.impact.toLocaleString("en-GB")}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Comparable Properties */}
      {valuation.comparables.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-6 shadow-sm"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Comparable Sold Properties
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-2 text-left text-xs font-medium text-[var(--muted-foreground)]">
                    Address
                  </th>
                  <th className="pb-2 text-right text-xs font-medium text-[var(--muted-foreground)]">
                    Price
                  </th>
                  <th className="hidden pb-2 text-right text-xs font-medium text-[var(--muted-foreground)] sm:table-cell">
                    Sq ft
                  </th>
                  <th className="hidden pb-2 text-right text-xs font-medium text-[var(--muted-foreground)] sm:table-cell">
                    £/sqft
                  </th>
                  <th className="pb-2 text-right text-xs font-medium text-[var(--muted-foreground)]">
                    Distance
                  </th>
                  <th className="hidden pb-2 text-right text-xs font-medium text-[var(--muted-foreground)] sm:table-cell">
                    Date Sold
                  </th>
                </tr>
              </thead>
              <tbody>
                {valuation.comparables.map((comp) => (
                  <tr
                    key={comp.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="py-2.5 pr-3 text-[var(--foreground)]">
                      {comp.address}
                    </td>
                    <td
                      className="py-2.5 text-right font-semibold"
                      style={{ fontFamily: "var(--font-data)" }}
                    >
                      £{comp.price.toLocaleString("en-GB")}
                    </td>
                    <td
                      className="hidden py-2.5 text-right text-[var(--muted-foreground)] sm:table-cell"
                      style={{ fontFamily: "var(--font-data)" }}
                    >
                      {comp.squareFeet.toLocaleString()}
                    </td>
                    <td
                      className="hidden py-2.5 text-right text-[var(--muted-foreground)] sm:table-cell"
                      style={{ fontFamily: "var(--font-data)" }}
                    >
                      {comp.pricePerSqft
                        ? `£${comp.pricePerSqft.toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="py-2.5 text-right text-[var(--muted-foreground)]">
                      {comp.distance} mi
                    </td>
                    <td className="hidden py-2.5 text-right text-[var(--muted-foreground)] sm:table-cell">
                      {new Date(comp.dateSold).toLocaleDateString("en-GB", {
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Methodology */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-6 shadow-sm"
      >
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Methodology
        </h3>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted-foreground)] chat-markdown">
          {valuation.methodology}
        </div>
      </motion.div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-[var(--radius-input)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          🖨️ Print Report
        </button>
        {shareUrl && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
            }}
            className="rounded-[var(--radius-input)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            🔗 Copy Share Link
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-[var(--border)] pt-4 text-center text-xs text-[var(--muted-foreground)]">
        <p>
          Generated by Pavelo AI on{" "}
          {new Date(valuation.generatedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <p className="mt-1">
          This is an automated estimate and should not be relied upon as a
          formal valuation. Please seek a professional RICS valuation for
          financial decisions.
        </p>
      </div>
    </div>
  );
}

// --- Sub-components ---

function StatCard({
  label,
  value,
  isNumber = false,
}: {
  label: string;
  value: string;
  isNumber?: boolean;
}) {
  return (
    <div className="rounded-lg bg-[var(--muted)] px-3 py-2 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-semibold text-[var(--foreground)] capitalize ${
          isNumber ? "font-[var(--font-data)]" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
