"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Preferences {
  locations: string[];
  budgetMin: number;
  budgetMax: number;
  propertyTypes: string[];
  bedroomsMin: number;
  bedroomsMax: number;
  features: string[];
}

interface PreferenceWizardProps {
  preferences: Preferences;
  onChange: (prefs: Preferences) => void;
  onBack: () => void;
  onComplete: () => void;
  submitting: boolean;
  error: string | null;
}

const PROPERTY_TYPES = [
  "Detached",
  "Semi-Detached",
  "Terraced",
  "Flat",
  "Bungalow",
  "Cottage",
  "Mansion",
];

const FEATURES = [
  "Garden",
  "Garage",
  "Parking",
  "En-suite",
  "Open Plan Kitchen",
  "Period Features",
  "Modern Kitchen",
  "South-Facing Garden",
  "Conservatory",
  "Loft Conversion",
  "Double Glazing",
  "Central Heating",
];

export function PreferenceWizard({
  preferences,
  onChange,
  onBack,
  onComplete,
  submitting,
  error,
}: PreferenceWizardProps) {
  const toggleItem = (
    field: "propertyTypes" | "features",
    value: string
  ) => {
    const current = preferences[field];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...preferences, [field]: updated });
  };

  const addLocation = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      if (val && !preferences.locations.includes(val)) {
        onChange({ ...preferences, locations: [...preferences.locations, val] });
        e.currentTarget.value = "";
      }
    }
  };

  const removeLocation = (loc: string) => {
    onChange({
      ...preferences,
      locations: preferences.locations.filter((l) => l !== loc),
    });
  };

  const formatCurrency = (v: number) =>
    `£${v.toLocaleString("en-GB")}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Your Property Preferences
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Help Xara understand what you&apos;re looking for. You can always update
          these later.
        </p>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label>Preferred Locations</Label>
        <Input
          placeholder="Type a city or area and press Enter"
          onKeyDown={addLocation}
          aria-label="Add preferred location"
        />
        {preferences.locations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {preferences.locations.map((loc) => (
              <Badge
                key={loc}
                variant="accent"
                className="cursor-pointer gap-1"
                onClick={() => removeLocation(loc)}
              >
                {loc} <span aria-label={`Remove ${loc}`}>×</span>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Budget Range */}
      <div className="space-y-2">
        <Label>Budget Range</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              type="number"
              placeholder="Min"
              value={preferences.budgetMin || ""}
              onChange={(e) =>
                onChange({
                  ...preferences,
                  budgetMin: Number(e.target.value) || 0,
                })
              }
              min={0}
              aria-label="Minimum budget"
            />
            <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
              {formatCurrency(preferences.budgetMin)}
            </span>
          </div>
          <div>
            <Input
              type="number"
              placeholder="Max"
              value={preferences.budgetMax || ""}
              onChange={(e) =>
                onChange({
                  ...preferences,
                  budgetMax: Number(e.target.value) || 0,
                })
              }
              min={0}
              aria-label="Maximum budget"
            />
            <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
              {formatCurrency(preferences.budgetMax)}
            </span>
          </div>
        </div>
      </div>

      {/* Bedrooms */}
      <div className="space-y-2">
        <Label>Bedrooms</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-[var(--muted-foreground)]">
              Min
            </Label>
            <Input
              type="number"
              value={preferences.bedroomsMin}
              onChange={(e) =>
                onChange({
                  ...preferences,
                  bedroomsMin: Number(e.target.value) || 0,
                })
              }
              min={0}
              max={10}
              aria-label="Minimum bedrooms"
            />
          </div>
          <div>
            <Label className="text-xs text-[var(--muted-foreground)]">
              Max
            </Label>
            <Input
              type="number"
              value={preferences.bedroomsMax}
              onChange={(e) =>
                onChange({
                  ...preferences,
                  bedroomsMax: Number(e.target.value) || 0,
                })
              }
              min={0}
              max={20}
              aria-label="Maximum bedrooms"
            />
          </div>
        </div>
      </div>

      {/* Property Types */}
      <div className="space-y-2">
        <Label>Property Types</Label>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleItem("propertyTypes", type)}
              className={cn(
                "rounded-[var(--radius-input)] border px-3 py-1.5 text-sm transition-all duration-[200ms] ease-out",
                preferences.propertyTypes.includes(type)
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                  : "border-[var(--border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              )}
              aria-pressed={preferences.propertyTypes.includes(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="space-y-2">
        <Label>Desired Features</Label>
        <div className="flex flex-wrap gap-2">
          {FEATURES.map((feat) => (
            <button
              key={feat}
              type="button"
              onClick={() => toggleItem("features", feat)}
              className={cn(
                "rounded-[var(--radius-badge)] border px-2.5 py-1 text-xs transition-all duration-[200ms] ease-out",
                preferences.features.includes(feat)
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-white"
                  : "border-[var(--border)] hover:border-[var(--color-gold)]"
              )}
              aria-pressed={preferences.features.includes(feat)}
            >
              {feat}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={onComplete} disabled={submitting}>
          {submitting ? "Creating account…" : "Get Started with Xara →"}
        </Button>
      </div>
    </div>
  );
}
