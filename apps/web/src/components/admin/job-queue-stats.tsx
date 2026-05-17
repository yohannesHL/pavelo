"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { JobCounts } from "@/hooks/use-ml-jobs";

interface JobQueueStatsProps {
  counts: JobCounts;
  className?: string;
}

const statItems = [
  {
    key: "pending" as const,
    label: "Pending",
    icon: "⏳",
    colorClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-400",
  },
  {
    key: "processing" as const,
    label: "Processing",
    icon: "⚙️",
    colorClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-400 animate-pulse",
  },
  {
    key: "completed" as const,
    label: "Completed",
    icon: "✅",
    colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-400",
  },
  {
    key: "failed" as const,
    label: "Failed",
    icon: "❌",
    colorClass: "bg-red-50 text-red-700 border-red-200",
    dotClass: "bg-red-400",
  },
];

export function JobQueueStats({ counts, className }: JobQueueStatsProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {statItems.map((item) => (
        <div
          key={item.key}
          className={cn(
            "flex items-center gap-3 rounded-[var(--radius-card)] border p-4 transition-all duration-[var(--motion-ui)]",
            item.colorClass
          )}
        >
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wider opacity-70">
              {item.label}
            </span>
            <span className="font-[family-name:var(--font-data)] text-2xl font-bold">
              {counts[item.key]}
            </span>
          </div>
          <div className={cn("ml-auto h-3 w-3 rounded-full", item.dotClass)} />
        </div>
      ))}
    </div>
  );
}
