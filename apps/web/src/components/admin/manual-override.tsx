"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ManualOverrideProps {
  propertyId: string;
  currentStyle?: string | null;
  currentEra?: string | null;
  currentCondition?: number;
  featureTags?: string[];
  onRetrigger?: () => void;
  onSave?: (overrides: Record<string, unknown>) => void;
  className?: string;
}

const STYLES = [
  "Victorian", "Edwardian", "Art Deco", "Mid-Century", "Contemporary",
  "New Build", "Georgian", "Brutalist", "Tudor", "Regency",
];

const ERAS = [
  "pre-1900", "1900-1939", "1945-1979", "1980-1999", "2000-2015", "post-2015",
];

export function ManualOverride({
  propertyId,
  currentStyle,
  currentEra,
  currentCondition,
  featureTags = [],
  onRetrigger,
  onSave,
  className,
}: ManualOverrideProps) {
  const [style, setStyle] = useState(currentStyle || "");
  const [era, setEra] = useState(currentEra || "");
  const [condition, setCondition] = useState(currentCondition || 5);
  const [tags, setTags] = useState<string[]>(featureTags);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      onSave?.({
        property_id: propertyId,
        style,
        era,
        condition,
        feature_tags: tags,
      });
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Manual Override</CardTitle>
          <code className="font-[family-name:var(--font-data)] text-xs text-[var(--muted-foreground)]">
            {propertyId.slice(0, 12)}…
          </code>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Architectural Style */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">
              Architectural Style
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full rounded-[var(--radius-input)] border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none ring-[var(--ring)] transition-all focus:ring-2"
            >
              <option value="">Auto-detected</option>
              {STYLES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Era */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">
              Construction Era
            </label>
            <select
              value={era}
              onChange={(e) => setEra(e.target.value)}
              className="w-full rounded-[var(--radius-input)] border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none ring-[var(--ring)] transition-all focus:ring-2"
            >
              <option value="">Auto-detected</option>
              {ERAS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Condition Score */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">
              Overall Condition: <span className="font-[family-name:var(--font-data)] font-bold">{condition}/10</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={condition}
              onChange={(e) => setCondition(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-[var(--muted-foreground)]">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>

          {/* Feature Tags */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">
              Feature Tags
            </label>
            <div className="mb-2 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer hover:bg-red-50 hover:text-red-600"
                  onClick={() => removeTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="Add tag…"
                className="flex-1 rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-1.5 text-sm outline-none ring-[var(--ring)] transition-all focus:ring-2"
              />
              <button
                onClick={addTag}
                className="rounded-[var(--radius-input)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-primary-light)]"
              >
                Add
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t border-[var(--border)] pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex-1 rounded-[var(--radius-input)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-light)]",
                saving && "opacity-50"
              )}
            >
              {saving ? "Saving…" : "Save Overrides"}
            </button>
            <button
              onClick={onRetrigger}
              className="rounded-[var(--radius-input)] border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--muted)]"
            >
              Re-analyse
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
