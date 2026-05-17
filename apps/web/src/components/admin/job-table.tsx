"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { MLJob } from "@/hooks/use-ml-jobs";

interface JobTableProps {
  jobs: MLJob[];
  onSelectJob?: (job: MLJob) => void;
  selectedJobId?: string | null;
  className?: string;
}

const statusVariant: Record<string, "default" | "accent" | "gold" | "outline"> = {
  pending: "gold",
  processing: "accent",
  completed: "default",
  failed: "outline",
  retrying: "gold",
};

const statusLabel: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  retrying: "Retrying",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function JobTable({ jobs, onSelectJob, selectedJobId, className }: JobTableProps) {
  if (jobs.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--border)] p-12 text-[var(--muted-foreground)]",
          className
        )}
      >
        <p className="text-sm">No jobs in queue. Submit a job to get started.</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)]", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Job ID</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Property</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Status</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Images</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Retries</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const imageCount = Object.keys(job.tasks || {}).length;
              return (
                <tr
                  key={job.job_id}
                  onClick={() => onSelectJob?.(job)}
                  className={cn(
                    "cursor-pointer border-b border-[var(--border)] transition-colors duration-[var(--motion-ui)] hover:bg-[var(--muted)]",
                    selectedJobId === job.job_id && "bg-blue-50"
                  )}
                >
                  <td className="px-4 py-3">
                    <code className="font-[family-name:var(--font-data)] text-xs">
                      {job.job_id.slice(0, 8)}…
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <code className="font-[family-name:var(--font-data)] text-xs">
                      {job.property_id.slice(0, 8)}…
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[job.status] || "outline"}>
                      {statusLabel[job.status] || job.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-data)]">{imageCount}</td>
                  <td className="px-4 py-3 font-[family-name:var(--font-data)]">{job.retry_count}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {formatDate(job.submitted_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
