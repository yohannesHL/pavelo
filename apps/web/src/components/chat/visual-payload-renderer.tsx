"use client";

/**
 * VisualPayloadRenderer — dispatch visual payloads to React components (S5-07)
 *
 * Receives JSON visual directives from the agent and renders
 * the correct component: property cards, carousels, charts, tables, etc.
 */

import { motion } from "framer-motion";
import { ChatPropertyCard } from "./chat-property-card";
import { ChatPropertyCarousel } from "./chat-property-carousel";
import { ChatComparisonTable } from "./chat-comparison-table";
import type { VisualPayload } from "@/stores/chat-store";

interface VisualPayloadRendererProps {
  payload: VisualPayload;
}

const enterVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

export function VisualPayloadRenderer({ payload }: VisualPayloadRendererProps) {
  return (
    <motion.div
      variants={enterVariants}
      initial="hidden"
      animate="visible"
    >
      {renderPayload(payload)}
    </motion.div>
  );
}

function renderPayload(payload: VisualPayload) {
  switch (payload.type) {
    case "property_card":
      return (
        <ChatPropertyCard
          property={payload.data as any}
          title={payload.title}
        />
      );

    case "property_carousel":
    case "property_grid":
      return (
        <ChatPropertyCarousel
          properties={(payload.data as any)?.properties || []}
          title={payload.title}
        />
      );

    case "comparison_table":
      return (
        <ChatComparisonTable
          properties={(payload.data as any)?.properties || []}
          title={payload.title}
        />
      );

    case "mortgage_estimate":
      return <MortgageEstimateCard data={payload.data} />;

    case "map_view":
      return <MapPlaceholder data={payload.data} title={payload.title} />;

    case "price_chart":
      return <ChartPlaceholder data={payload.data} title={payload.title} />;

    default:
      return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4 text-xs text-[var(--muted-foreground)]">
          <p className="font-medium">Visual: {payload.type}</p>
          <pre className="mt-1 overflow-auto">
            {JSON.stringify(payload.data, null, 2)}
          </pre>
        </div>
      );
  }
}

// --- Inline Sub-Components ---

function MortgageEstimateCard({ data }: { data: Record<string, unknown> }) {
  const price = (data.price as number) || 0;
  const deposit = (data.deposit as number) || 0;
  const rate = (data.rate as number) || 4.5;
  const term = (data.term as number) || 25;
  const monthlyPayment = (data.monthlyPayment as number) || 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        Mortgage Estimate
      </h4>
      <p className="mt-2 font-[var(--font-heading)] text-2xl font-bold text-[var(--color-primary)]">
        £{monthlyPayment.toLocaleString("en-GB")}/mo
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--muted-foreground)]">
        <div>
          <span className="block font-medium text-[var(--foreground)]">
            £{price.toLocaleString("en-GB")}
          </span>
          Property price
        </div>
        <div>
          <span className="block font-medium text-[var(--foreground)]">
            £{deposit.toLocaleString("en-GB")}
          </span>
          Deposit
        </div>
        <div>
          <span className="block font-medium text-[var(--foreground)]">
            {rate}%
          </span>
          Interest rate
        </div>
        <div>
          <span className="block font-medium text-[var(--foreground)]">
            {term} years
          </span>
          Term
        </div>
      </div>
    </div>
  );
}

function MapPlaceholder({
  data,
  title,
}: {
  data: Record<string, unknown>;
  title?: string;
}) {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--color-primary)]/5 to-[var(--color-accent)]/5">
      <div className="text-center">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">
          🗺️ {title || "Map View"}
        </p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Map rendering available in Sprint 7
        </p>
      </div>
    </div>
  );
}

function ChartPlaceholder({
  data,
  title,
}: {
  data: Record<string, unknown>;
  title?: string;
}) {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--color-gold)]/5 to-[var(--color-accent)]/5">
      <div className="text-center">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">
          📊 {title || "Price Chart"}
        </p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Chart rendering available in Sprint 7
        </p>
      </div>
    </div>
  );
}
