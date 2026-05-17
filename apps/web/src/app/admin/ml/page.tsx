"use client";

import React, { useState, useMemo } from "react";
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

/* ─── Result extraction helpers ─── */

interface ClassificationEntry {
  label: string;
  confidence: number;
}

interface ConditionScores {
  kitchen: number | null;
  bathroom: number | null;
  decor: number;
  garden: number | null;
  exterior: number | null;
  overall: number;
}

interface ExtractedResults {
  sceneResults: ClassificationEntry[];
  styleResults: ClassificationEntry[];
  conditionScores: ConditionScores | null;
  featureTags: string[];
  periodFeatures: string[];
  primaryStyle: string | null;
  primaryEra: string | null;
  overallCondition: number | null;
}

/**
 * Extract ML results from a completed job's results payload.
 *
 * Job results are keyed: { [imageUrl]: { [taskName]: taskResult } }
 * Each taskResult has: { results: ... , task: string, status: string }
 */
function extractJobResults(job: MLJob): ExtractedResults {
  const empty: ExtractedResults = {
    sceneResults: [],
    styleResults: [],
    conditionScores: null,
    featureTags: [],
    periodFeatures: [],
    primaryStyle: null,
    primaryEra: null,
    overallCondition: null,
  };

  if (!job.results || job.status !== "completed") return empty;

  const imageResults = Object.values(
    job.results as Record<string, Record<string, { results?: unknown; task?: string }>>
  );

  let sceneResults: ClassificationEntry[] = [];
  let styleResults: ClassificationEntry[] = [];
  let conditionScores: ConditionScores | null = null;
  const periodFeatures = new Set<string>();
  const featureTags = new Set<string>();
  let primaryStyle: string | null = null;
  let primaryEra: string | null = null;
  let overallCondition: number | null = null;

  for (const taskMap of imageResults) {
    // Scene classification
    if (taskMap.scene?.results && Array.isArray(taskMap.scene.results)) {
      // Take the first image's scene results (most complete)
      if (sceneResults.length === 0) {
        sceneResults = (taskMap.scene.results as ClassificationEntry[]).map((r) => ({
          label: r.label,
          confidence: r.confidence,
        }));
      }
    }

    // Style classification
    if (taskMap.style?.results && Array.isArray(taskMap.style.results)) {
      if (styleResults.length === 0) {
        styleResults = (taskMap.style.results as ClassificationEntry[]).map((r) => ({
          label: r.label,
          confidence: r.confidence,
        }));
        primaryStyle = styleResults[0]?.label ?? null;
      }
    }

    // Interior analysis
    if (taskMap.interior?.results) {
      const interior = taskMap.interior.results as Record<string, unknown>;
      if (Array.isArray(interior.period_features)) {
        for (const f of interior.period_features) periodFeatures.add(f as string);
      }
    }

    // Condition analysis
    if (taskMap.condition?.results) {
      const condResult = taskMap.condition.results as Record<string, unknown>;
      if (condResult.condition) {
        const c = condResult.condition as ConditionScores;
        conditionScores = {
          kitchen: c.kitchen ?? null,
          bathroom: c.bathroom ?? null,
          decor: c.decor ?? 5,
          garden: c.garden ?? null,
          exterior: c.exterior ?? null,
          overall: c.overall ?? 5,
        };
        overallCondition = conditionScores.overall;
      }
      if (condResult.era) {
        const era = condResult.era as { era?: string };
        primaryEra = era.era ?? null;
      }
    }
  }

  return {
    sceneResults,
    styleResults,
    conditionScores,
    featureTags: Array.from(featureTags),
    periodFeatures: Array.from(periodFeatures),
    primaryStyle,
    primaryEra,
    overallCondition,
  };
}

export default function AdminMLDashboard() {
  const { jobs, counts, loading, error, refetch, submitJob } = useMLJobs(5000);
  const [selectedJob, setSelectedJob] = useState<MLJob | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredJobs =
    statusFilter === "all" ? jobs : jobs.filter((j) => j.status === statusFilter);

  // Extract real results from the selected job
  const extracted = useMemo(
    () => (selectedJob ? extractJobResults(selectedJob) : null),
    [selectedJob]
  );

  const hasResults = selectedJob?.status === "completed" && extracted !== null;
  const isPending = selectedJob?.status === "pending" || selectedJob?.status === "processing";

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
                {isPending && (
                  <div className="flex h-24 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--border)] text-center text-sm text-[var(--muted-foreground)]">
                    <div>
                      <p className="mb-1 animate-pulse text-lg">⏳</p>
                      <p>Job {selectedJob.status}… results will appear when complete.</p>
                    </div>
                  </div>
                )}

                {selectedJob.status === "failed" && (
                  <div className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <strong>Job failed</strong>
                    {selectedJob.error && <p className="mt-1">{selectedJob.error}</p>}
                  </div>
                )}

                {/* Classification results from job */}
                {hasResults && extracted.sceneResults.length > 0 && (
                  <ClassificationViewer
                    title="Scene Classification"
                    results={extracted.sceneResults}
                  />
                )}

                {hasResults && extracted.styleResults.length > 0 && (
                  <ClassificationViewer
                    title="Architectural Style"
                    results={extracted.styleResults}
                  />
                )}

                {hasResults && extracted.conditionScores && (
                  <ConditionScoreViewer scores={extracted.conditionScores} />
                )}

                {hasResults && (extracted.featureTags.length > 0 || extracted.periodFeatures.length > 0) && (
                  <FeatureTagsViewer
                    tags={extracted.featureTags}
                    periodFeatures={extracted.periodFeatures}
                  />
                )}

                {hasResults && extracted.sceneResults.length === 0 && extracted.styleResults.length === 0 && !extracted.conditionScores && (
                  <div className="flex h-24 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--border)] text-center text-sm text-[var(--muted-foreground)]">
                    <div>
                      <p className="mb-1 text-lg">📊</p>
                      <p>Job completed but no classification results found.</p>
                    </div>
                  </div>
                )}

                <ManualOverride
                  propertyId={selectedJob.property_id}
                  currentStyle={extracted?.primaryStyle ?? undefined}
                  currentEra={extracted?.primaryEra ?? undefined}
                  currentCondition={extracted?.overallCondition ?? undefined}
                  featureTags={extracted?.featureTags ?? []}
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
