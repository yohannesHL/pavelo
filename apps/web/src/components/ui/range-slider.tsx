"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatLabel?: (value: number) => string;
  className?: string;
  "aria-label"?: string;
}

/**
 * Dual-range slider for price/number ranges.
 * Uses native HTML range inputs with custom styling.
 */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatLabel,
  className,
  ...props
}: SliderProps) {
  const [localMin, localMax] = value;

  const minPercent = ((localMin - min) / (max - min)) * 100;
  const maxPercent = ((localMax - min) / (max - min)) * 100;

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), localMax - step);
    onChange([newMin, localMax]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), localMin + step);
    onChange([localMin, newMax]);
  };

  const format = formatLabel || ((v: number) => v.toLocaleString());

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <span className="font-[var(--font-data)]">{format(localMin)}</span>
        <span className="font-[var(--font-data)]">{format(localMax)}</span>
      </div>
      <div className="relative h-6">
        {/* Track background */}
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-[var(--muted)]" />
        {/* Active track */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[var(--color-accent)]"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMin}
          onChange={handleMinChange}
          className="slider-thumb absolute top-0 h-6 w-full appearance-none bg-transparent pointer-events-none"
          style={{ zIndex: localMin > max - 100 ? 5 : 3 }}
          aria-label={`${props["aria-label"] || "Range"} minimum`}
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMax}
          onChange={handleMaxChange}
          className="slider-thumb absolute top-0 h-6 w-full appearance-none bg-transparent pointer-events-none"
          style={{ zIndex: 4 }}
          aria-label={`${props["aria-label"] || "Range"} maximum`}
        />
      </div>
    </div>
  );
}
