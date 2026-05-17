/**
 * Flood & Environmental Risk Page (S9-10)
 *
 * Standalone page at /intelligence/flood.
 */

import { FloodRiskMap } from "@/components/intelligence/flood-risk-map";

export default function FloodRiskPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0D1B2A]">Flood & Environmental Risk</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Assess flood risk from rivers, surface water, and reservoirs using Environment Agency data.
        </p>
      </div>
      <FloodRiskMap />
    </div>
  );
}
