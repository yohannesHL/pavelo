"use client";

import React, { useState } from "react";
import { JobQueueStats } from "@/components/admin/job-queue-stats";
import { JobTable } from "@/components/admin/job-table";
import {
  ClassificationViewer,
  ConditionScoreViewer,
  FeatureTagsViewer,
} from "@/components/admin/classification-viewer";
import { ManualOverride } from "@/components/admin/manual-override";
import { useMLJobs } from "@/hooks/use-ml-jobs";
import type { MLJob } from "@/hooks/use-ml-jobs";
import { Badge } from "@/components/ui/badge";

export default function AdminMLDashboard() {
  const { jobs, counts, loading, error, refetch, submitJob } = useMLJobs(5000);
  const [selectedJob, setSelectedJob] = useState<MLJob | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredJobs =
    statusFilter === "all" ? jobs : jobs.filter((j) => j.status === statusFilter);

  // Extract mock results for the selected job viewer
  const selectedResults = selectedJob?.results
    ? Object.values(selectedJob.results as Record<string, Record<string, unknown>>)
    : [];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--color-primary)]">
              ML Pipeline Dashboard
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Image intelligence job queue & classification results
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="accent" className="px-3 py-1">
              Admin
            </Badge>
            <button
              onClick={refetch}
              className="rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--muted)]"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Error Banner */}
        {error && (
          <div className="mb-4 rounded-[var(--radius-card)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Connection Error:</strong> {error}. Ensure the ML service is running on port 8001.
          </div>
        )}

        {/* Queue Stats */}
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Queue Overview
          </h2>
          <JobQueueStats counts={counts} />
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Job Table — 2 cols */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Jobs
              </h2>
              <div className="flex gap-1">
                {["all", "pending", "processing", "completed", "failed"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-[var(--radius-badge)] px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                      statusFilter === s
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex h-40 items-center justify-center text-[var(--muted-foreground)]">
                Loading jobs…
              </div>
            ) : (
              <JobTable
                jobs={filteredJobs}
                onSelectJob={setSelectedJob}
                selectedJobId={selectedJob?.job_id}
              />
            )}
          </div>

          {/* Detail Panel — 1 col */}
          <div className="flex flex-col gap-4">
            {selectedJob ? (
              <>
                {/* Classification results from job */}
                <ClassificationViewer
                  title="Scene Classification"
                  results={[
                    { label: "interior", confidence: 0.85 },
                    { label: "exterior", confidence: 0.08 },
                    { label: "garden", confidence: 0.04 },
                    { label: "floor-plan", confidence: 0.02 },
                    { label: "aerial", confidence: 0.01 },
                  ]}
                />

                <ClassificationViewer
                  title="Architectural Style"
                  results={[
                    { label: "Victorian", confidence: 0.72 },
                    { label: "Edwardian", confidence: 0.15 },
                    { label: "Georgian", confidence: 0.08 },
                  ]}
                />

                <ConditionScoreViewer
                  scores={{
                    kitchen: 7,
                    bathroom: 6,
                    decor: 8,
                    garden: null,
                    exterior: null,
                    overall: 7,
                  }}
                />

                <FeatureTagsViewer
                  tags={["original-features", "high-ceilings", "period-fireplace", "sash-windows"]}
                  periodFeatures={["Cornicing", "Original fireplace", "Picture rail"]}
                />

                <ManualOverride
                  propertyId={selectedJob.property_id}
                  currentStyle="Victorian"
                  currentEra="pre-1900"
                  currentCondition={7}
                  featureTags={["original-features", "high-ceilings"]}
                  onRetrigger={() => {
                    // Re-trigger analysis for this property
                    void submitJob(
                      selectedJob.property_id,
                      Object.keys(selectedJob.tasks || {}),
                      ["scene", "style", "interior", "condition"]
                    );
                  }}
                  onSave={(overrides) => {
                    console.log("Saving overrides:", overrides);
                  }}
                />
              </>
            ) : (
              <div className="flex h-60 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--border)] text-center text-sm text-[var(--muted-foreground)]">
                <div>
                  <p className="mb-1 text-lg">📊</p>
                  <p>Select a job to view classification results</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
