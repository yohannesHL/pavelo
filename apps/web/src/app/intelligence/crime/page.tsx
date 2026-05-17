"use client";

/**
 * Crime Intelligence Page (S7-01)
 *
 * Standalone page at /intelligence/crime
 * Demonstrates the CrimeMap component with mock data.
 */

import { useState, useMemo } from "react";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CrimeMap } from "@/components/intelligence/crime-map";
import Link from "next/link";

// Generate demo crime data
function generateDemoCrimeData(months: number) {
  const categories = [
    "anti-social-behaviour",
    "burglary",
    "robbery",
    "vehicle-crime",
    "violent-crime",
    "criminal-damage-arson",
    "shoplifting",
    "other-theft",
    "drugs",
    "public-order",
    "bicycle-theft",
    "theft-from-the-person",
  ];

  const categoryLabels: Record<string, string> = {
    "anti-social-behaviour": "Anti-Social Behaviour",
    burglary: "Burglary",
    robbery: "Robbery",
    "vehicle-crime": "Vehicle Crime",
    "violent-crime": "Violent Crime",
    "criminal-damage-arson": "Criminal Damage & Arson",
    shoplifting: "Shoplifting",
    "other-theft": "Other Theft",
    drugs: "Drugs",
    "public-order": "Public Order",
    "bicycle-theft": "Bicycle Theft",
    "theft-from-the-person": "Theft from Person",
  };

  const center = { lat: 51.5074, lng: -0.1278 };
  const streets = [
    { id: 1, name: "Oxford Street" },
    { id: 2, name: "Regent Street" },
    { id: 3, name: "Baker Street" },
    { id: 4, name: "Bond Street" },
    { id: 5, name: "Tottenham Court Road" },
    { id: 6, name: "Carnaby Street" },
    { id: 7, name: "Marylebone Road" },
    { id: 8, name: "Edgware Road" },
  ];

  const crimes = [];
  const count = months * 40;

  for (let i = 0; i < count; i++) {
    const cat = categories[i % categories.length];
    const street = streets[i % streets.length];
    const dLat = (Math.sin(i * 0.7) * 0.01) + (Math.cos(i * 1.3) * 0.005);
    const dLng = (Math.cos(i * 0.5) * 0.01) + (Math.sin(i * 1.1) * 0.005);
    const monthOffset = i % months;
    const d = new Date();
    d.setMonth(d.getMonth() - 2 - monthOffset);

    crimes.push({
      id: `crime-${i}`,
      category: cat,
      location: {
        latitude: (center.lat + dLat).toString(),
        longitude: (center.lng + dLng).toString(),
        street,
      },
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
  }

  const catCounts: Record<string, number> = {};
  for (const c of crimes) {
    catCounts[c.category] = (catCounts[c.category] || 0) + 1;
  }

  const categoryCounts = Object.entries(catCounts)
    .map(([category, count]) => ({
      category,
      count,
      label: categoryLabels[category] || category,
    }))
    .sort((a, b) => b.count - a.count);

  const now = new Date();
  now.setMonth(now.getMonth() - 2);
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const fromDate = new Date(now);
  fromDate.setMonth(fromDate.getMonth() - months + 1);
  const from = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}`;

  return {
    crimes,
    categories: categoryCounts,
    center,
    total: crimes.length,
    dateRange: { from, to },
  };
}

export default function CrimePage() {
  const [months, setMonths] = useState(3);
  const data = useMemo(() => generateDemoCrimeData(months), [months]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Back to Dashboard
          </Link>
        </div>

        <CrimeMap
          crimes={data.crimes}
          categories={data.categories}
          center={data.center}
          dateRange={data.dateRange}
          total={data.total}
          currentMonths={months}
          onMonthsChange={setMonths}
        />
      </div>
    </div>
  );
}
