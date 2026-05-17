"use client";

/**
 * Area Statistics Page (S7-03)
 *
 * Standalone page at /intelligence/area/[postcode]
 * Renders the AreaDashboard component with demo data.
 */

import { use, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { AreaDashboard } from "@/components/intelligence/area-dashboard";
import Link from "next/link";

function generateDemoAreaData(postcode: string) {
  const h = postcode.split("").reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
  const seed = Math.abs(h);

  return {
    demographics: {
      areaName: `${postcode} Area`,
      population: 5000 + (seed % 8000),
      populationDensity: 4000 + (seed % 10000),
      householdCount: 2000 + (seed % 4000),
      averageAge: 30 + (seed % 12),
      ageDistribution: [
        { band: "0-15", count: 800, percentage: 16 },
        { band: "16-24", count: 600, percentage: 12 },
        { band: "25-34", count: 1100, percentage: 22 },
        { band: "35-49", count: 950, percentage: 19 },
        { band: "50-64", count: 800, percentage: 16 },
        { band: "65+", count: 750, percentage: 15 },
      ],
      deprivationIndex: 1 + (seed % 10),
      employmentRate: 65 + (seed % 25),
      incomeScore: 25000 + (seed % 40000),
    },
    scores: {
      safety: 1 + (seed % 10),
      schools: 1 + ((seed + 3) % 10),
      transport: 1 + ((seed + 5) % 10),
      amenities: 1 + ((seed + 7) % 10),
      greenSpace: 1 + ((seed + 2) % 10),
      nightlife: 1 + ((seed + 9) % 10),
    },
  };
}

export default function AreaPage({
  params,
}: {
  params: Promise<{ postcode: string }>;
}) {
  const resolvedParams = use(params);
  const postcode = decodeURIComponent(resolvedParams.postcode).toUpperCase();
  const data = useMemo(() => generateDemoAreaData(postcode), [postcode]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Dashboard
          </Link>
        </div>

        <AreaDashboard
          demographics={data.demographics}
          scores={data.scores}
          postcode={postcode}
        />
      </div>
    </div>
  );
}
