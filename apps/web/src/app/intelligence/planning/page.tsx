/**
 * Planning Applications Page (S9-09)
 *
 * Standalone page at /intelligence/planning.
 */

import { PlanningApplicationsMap } from "@/components/intelligence/planning-applications";

export default function PlanningPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0D1B2A]">Planning Applications</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          View recent planning applications near a property, powered by local authority data.
        </p>
      </div>
      <PlanningApplicationsMap />
    </div>
  );
}
