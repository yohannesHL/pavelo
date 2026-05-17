"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * ML Job type definition
 */
export interface MLJob {
  job_id: string;
  property_id: string;
  status: "pending" | "processing" | "completed" | "failed" | "retrying";
  submitted_at: string;
  completed_at: string | null;
  tasks: Record<string, Record<string, string>>;
  results: Record<string, unknown> | null;
  error: string | null;
  retry_count: number;
}

export interface JobCounts {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export interface ClassificationResult {
  label: string;
  confidence: number;
}

export interface PropertyMLAttributes {
  property_id: string;
  primary_style: string | null;
  primary_scene: string | null;
  era: string | null;
  era_confidence: number;
  condition: {
    kitchen: number | null;
    bathroom: number | null;
    decor: number;
    garden: number | null;
    exterior: number | null;
    overall: number;
  };
  feature_tags: string[];
  renovation_quality: string;
  period_features: string[];
  rooms_detected: string[];
  images_analysed: number;
}

const ML_API_BASE = process.env.NEXT_PUBLIC_ML_API_URL || "http://localhost:8001";

/**
 * Hook for fetching and managing ML job queue data
 */
export function useMLJobs(pollInterval = 5000) {
  const [jobs, setJobs] = useState<MLJob[]>([]);
  const [counts, setCounts] = useState<JobCounts>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${ML_API_BASE}/api/v1/jobs?limit=100`);
      if (!res.ok) throw new Error(`Failed to fetch jobs: ${res.status}`);
      const data = await res.json();

      setJobs(data.jobs || []);
      setCounts({
        pending: data.pending || 0,
        processing: data.processing || 0,
        completed: data.completed || 0,
        failed: data.failed || 0,
        total: data.total || 0,
      });
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, pollInterval);
    return () => clearInterval(interval);
  }, [fetchJobs, pollInterval]);

  const submitJob = useCallback(
    async (propertyId: string, imageUrls: string[], tasks: string[] = ["scene", "style"]) => {
      const res = await fetch(`${ML_API_BASE}/api/v1/jobs/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          image_urls: imageUrls,
          tasks,
        }),
      });
      if (!res.ok) throw new Error(`Failed to submit job: ${res.status}`);
      const job = await res.json();
      await fetchJobs();
      return job;
    },
    [fetchJobs]
  );

  return { jobs, counts, loading, error, refetch: fetchJobs, submitJob };
}
