"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ClassificationResultProps {
  label: string;
  confidence: number;
  isTop?: boolean;
}

function ConfidenceBar({ confidence, isTop }: { confidence: number; isTop?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--muted)]">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            isTop ? "bg-[var(--color-accent)]" : "bg-[var(--color-primary)]"
          )}
          style={{ width: `${Math.round(confidence * 100)}%` }}
        />
      </div>
      <span className="w-12 text-right font-[family-name:var(--font-data)] text-xs text-[var(--muted-foreground)]">
        {Math.round(confidence * 100)}%
      </span>
    </div>
  );
}

function ClassificationItem({ label, confidence, isTop }: ClassificationResultProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium capitalize">{label}</span>
        {isTop && (
          <Badge variant="accent" className="text-[10px]">
            TOP
          </Badge>
        )}
      </div>
      <ConfidenceBar confidence={confidence} isTop={isTop} />
    </div>
  );
}

interface ClassificationViewerProps {
  title: string;
  results: { label: string; confidence: number }[];
  imageUrl?: string;
  className?: string;
}

export function ClassificationViewer({
  title,
  results,
  imageUrl,
  className,
}: ClassificationViewerProps) {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {imageUrl && (
            <div className="hidden shrink-0 sm:block">
              <div className="h-24 w-24 overflow-hidden rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--muted)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Property"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          )}
          <div className="flex flex-1 flex-col gap-3">
            {results.map((result, i) => (
              <ClassificationItem
                key={result.label}
                label={result.label}
                confidence={result.confidence}
                isTop={i === 0}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ConditionScoreViewerProps {
  scores: {
    kitchen?: number | null;
    bathroom?: number | null;
    decor: number;
    garden?: number | null;
    exterior?: number | null;
    overall: number;
  };
  className?: string;
}

function ScoreDot({ score, label }: { score: number | null | undefined; label: string }) {
  if (score == null) return null;

  const color =
    score >= 8
      ? "bg-emerald-500"
      : score >= 6
        ? "bg-[var(--color-accent)]"
        : score >= 4
          ? "bg-[var(--color-gold)]"
          : "bg-red-500";

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white",
          color
        )}
      >
        {score}
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </span>
    </div>
  );
}

export function ConditionScoreViewer({ scores, className }: ConditionScoreViewerProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Condition Scores</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
          <ScoreDot score={scores.overall} label="Overall" />
          <ScoreDot score={scores.kitchen} label="Kitchen" />
          <ScoreDot score={scores.bathroom} label="Bathroom" />
          <ScoreDot score={scores.decor} label="Decor" />
          <ScoreDot score={scores.garden} label="Garden" />
          <ScoreDot score={scores.exterior} label="Exterior" />
        </div>
      </CardContent>
    </Card>
  );
}

interface FeatureTagsViewerProps {
  tags: string[];
  periodFeatures?: string[];
  className?: string;
}

export function FeatureTagsViewer({ tags, periodFeatures, className }: FeatureTagsViewerProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Feature Tags</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="accent" className="capitalize">
                  {tag.replace(/-/g, " ")}
                </Badge>
              ))}
            </div>
          )}
          {periodFeatures && periodFeatures.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                Period Features
              </p>
              <div className="flex flex-wrap gap-1.5">
                {periodFeatures.map((feat) => (
                  <Badge key={feat} variant="gold" className="capitalize">
                    {feat}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {tags.length === 0 && (!periodFeatures || periodFeatures.length === 0) && (
            <p className="text-sm text-[var(--muted-foreground)]">No features detected</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
