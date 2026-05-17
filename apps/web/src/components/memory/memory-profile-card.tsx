"use client";

/**
 * MemoryProfileCard — "What Xara knows about you" (S8-02)
 *
 * Displays the user's consolidated memory profile with:
 * - Name, budget range, preferred areas, property types
 * - Style preferences, deal-breakers
 * - Inline editing for any preference
 * - Memory timeline showing when each fact was learned
 * - Delete incorrect memories
 *
 * Design: navy header, gold accent for key preferences, Inter font
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---

interface MemoryItem {
  id: string;
  fact: string;
  category: string;
  learnedAt: string;
  source: string;
}

interface UserProfile {
  id: string;
  userId: string;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredAreas: string[];
  propertyStyles: string[];
  propertyTypes: string[];
  dealBreakers: string[];
  memories: MemoryItem[];
  sentimentScore: number | null;
  lastConsolidatedAt: string | null;
  consolidationCount: number;
  preferences: Record<string, unknown>;
}

interface MemoryProfileCardProps {
  profile: UserProfile | null;
  userName?: string;
  onUpdatePreference?: (field: string, value: unknown) => void;
  onDeleteMemory?: (memoryId: string) => void;
  onConsolidate?: () => void;
  isLoading?: boolean;
}

// --- Category Config ---

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  budget: { icon: "💰", label: "Budget", color: "var(--color-gold)" },
  area: { icon: "📍", label: "Location", color: "var(--color-accent)" },
  property_type: { icon: "🏠", label: "Property Type", color: "var(--color-primary)" },
  style: { icon: "🎨", label: "Style", color: "#8b5cf6" },
  deal_breaker: { icon: "🚫", label: "Deal Breaker", color: "var(--color-error)" },
  amenity: { icon: "✨", label: "Amenity", color: "var(--color-success)" },
  general: { icon: "💬", label: "General", color: "var(--muted-foreground)" },
  other: { icon: "📝", label: "Other", color: "var(--muted-foreground)" },
};

// --- Component ---

export function MemoryProfileCard({
  profile,
  userName,
  onUpdatePreference,
  onDeleteMemory,
  onConsolidate,
  isLoading = false,
}: MemoryProfileCardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline">("overview");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleEdit = useCallback(
    (field: string, currentValue: string) => {
      setEditingField(field);
      setEditValue(currentValue);
    },
    []
  );

  const handleSave = useCallback(
    (field: string) => {
      if (onUpdatePreference) {
        // Parse arrays vs numbers
        if (["preferredAreas", "propertyStyles", "propertyTypes", "dealBreakers"].includes(field)) {
          const arr = editValue
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          onUpdatePreference(field, arr);
        } else if (["budgetMin", "budgetMax"].includes(field)) {
          const num = parseInt(editValue.replace(/[^0-9]/g, ""), 10);
          onUpdatePreference(field, isNaN(num) ? null : num);
        }
      }
      setEditingField(null);
      setEditValue("");
    },
    [editValue, onUpdatePreference]
  );

  if (!profile && !isLoading) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white overflow-hidden">
        <div className="bg-[var(--color-primary)] px-6 py-4">
          <h3 className="font-[var(--font-heading)] text-lg text-white">
            What Xara Knows About You
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-3 text-4xl">🧠</div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Xara hasn&apos;t learned your preferences yet.
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Start a conversation and she&apos;ll remember what matters to you.
          </p>
          {onConsolidate && (
            <button
              onClick={onConsolidate}
              className="mt-4 rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--color-primary-light)]"
            >
              Sync Memories
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white shadow-[var(--shadow-card)] overflow-hidden">
      {/* Navy Header */}
      <div className="bg-[var(--color-primary)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-[var(--font-heading)] text-lg text-white">
              What Xara Knows About You
            </h3>
            {userName && (
              <p className="mt-0.5 text-sm text-white/70">
                Hey {userName} — here&apos;s what I&apos;ve learned
              </p>
            )}
          </div>
          {onConsolidate && (
            <button
              onClick={onConsolidate}
              disabled={isLoading}
              className="rounded-[var(--radius-input)] border border-white/30 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-white/10 disabled:opacity-50"
              aria-label="Refresh memory profile"
            >
              {isLoading ? "Syncing..." : "🔄 Sync"}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-3 flex gap-1">
          {(["overview", "timeline"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "bg-white text-[var(--color-primary)]"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
              aria-selected={activeTab === tab}
              role="tab"
            >
              {tab === "overview" ? "📋 Overview" : "📅 Timeline"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
          </div>
        ) : activeTab === "overview" ? (
          <OverviewTab
            profile={profile!}
            editingField={editingField}
            editValue={editValue}
            onEdit={handleEdit}
            onEditValueChange={setEditValue}
            onSave={handleSave}
            onCancel={() => setEditingField(null)}
          />
        ) : (
          <TimelineTab
            memories={profile?.memories || []}
            onDelete={onDeleteMemory}
          />
        )}
      </div>

      {/* Footer */}
      {profile?.lastConsolidatedAt && (
        <div className="border-t border-[var(--border)] px-6 py-3 text-xs text-[var(--muted-foreground)]">
          Last synced:{" "}
          {new Date(profile.lastConsolidatedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {profile.consolidationCount > 0 && (
            <span className="ml-2">
              · {profile.consolidationCount} sync{profile.consolidationCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// --- Overview Tab ---

function OverviewTab({
  profile,
  editingField,
  editValue,
  onEdit,
  onEditValueChange,
  onSave,
  onCancel,
}: {
  profile: UserProfile;
  editingField: string | null;
  editValue: string;
  onEdit: (field: string, currentValue: string) => void;
  onEditValueChange: (value: string) => void;
  onSave: (field: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Budget */}
      <PreferenceRow
        icon="💰"
        label="Budget Range"
        value={
          profile.budgetMin || profile.budgetMax
            ? `£${(profile.budgetMin || 0).toLocaleString("en-GB")} – £${(profile.budgetMax || 0).toLocaleString("en-GB")}`
            : "Not set"
        }
        field="budgetMin"
        isEditing={editingField === "budgetMin"}
        editValue={editValue}
        onEdit={onEdit}
        onEditValueChange={onEditValueChange}
        onSave={onSave}
        onCancel={onCancel}
        isGold
      />

      {/* Preferred Areas */}
      <TagRow
        icon="📍"
        label="Preferred Areas"
        tags={profile.preferredAreas}
        field="preferredAreas"
        isEditing={editingField === "preferredAreas"}
        editValue={editValue}
        onEdit={onEdit}
        onEditValueChange={onEditValueChange}
        onSave={onSave}
        onCancel={onCancel}
      />

      {/* Property Types */}
      <TagRow
        icon="🏠"
        label="Property Types"
        tags={profile.propertyTypes}
        field="propertyTypes"
        isEditing={editingField === "propertyTypes"}
        editValue={editValue}
        onEdit={onEdit}
        onEditValueChange={onEditValueChange}
        onSave={onSave}
        onCancel={onCancel}
      />

      {/* Styles */}
      <TagRow
        icon="🎨"
        label="Style Preferences"
        tags={profile.propertyStyles}
        field="propertyStyles"
        isEditing={editingField === "propertyStyles"}
        editValue={editValue}
        onEdit={onEdit}
        onEditValueChange={onEditValueChange}
        onSave={onSave}
        onCancel={onCancel}
      />

      {/* Deal Breakers */}
      <TagRow
        icon="🚫"
        label="Deal Breakers"
        tags={profile.dealBreakers}
        field="dealBreakers"
        isEditing={editingField === "dealBreakers"}
        editValue={editValue}
        onEdit={onEdit}
        onEditValueChange={onEditValueChange}
        onSave={onSave}
        onCancel={onCancel}
        tagColor="bg-red-50 text-red-700 border-red-200"
      />
    </div>
  );
}

// --- Preference Row ---

function PreferenceRow({
  icon,
  label,
  value,
  field,
  isEditing,
  editValue,
  onEdit,
  onEditValueChange,
  onSave,
  onCancel,
  isGold = false,
}: {
  icon: string;
  label: string;
  value: string;
  field: string;
  isEditing: boolean;
  editValue: string;
  onEdit: (field: string, currentValue: string) => void;
  onEditValueChange: (value: string) => void;
  onSave: (field: string) => void;
  onCancel: () => void;
  isGold?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--muted)]">
      <span className="mt-0.5 text-lg" aria-hidden="true">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
          {label}
        </p>
        {isEditing ? (
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              className="flex-1 rounded-[var(--radius-input)] border border-[var(--border)] px-2 py-1 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onSave(field);
                if (e.key === "Escape") onCancel();
              }}
              aria-label={`Edit ${label}`}
            />
            <button
              onClick={() => onSave(field)}
              className="rounded-[var(--radius-badge)] bg-[var(--color-success)] px-2 py-1 text-xs text-white"
            >
              ✓
            </button>
            <button
              onClick={onCancel}
              className="rounded-[var(--radius-badge)] bg-[var(--muted)] px-2 py-1 text-xs"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className={`text-sm font-semibold ${
                isGold
                  ? "text-[var(--color-gold)]"
                  : "text-[var(--foreground)]"
              }`}
              style={isGold ? { fontFamily: "var(--font-data)" } : undefined}
            >
              {value}
            </span>
            <button
              onClick={() => onEdit(field, value)}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--color-accent)] transition-colors"
              aria-label={`Edit ${label}`}
            >
              ✏️
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Tag Row ---

function TagRow({
  icon,
  label,
  tags,
  field,
  isEditing,
  editValue,
  onEdit,
  onEditValueChange,
  onSave,
  onCancel,
  tagColor = "bg-blue-50 text-blue-700 border-blue-200",
}: {
  icon: string;
  label: string;
  tags: string[];
  field: string;
  isEditing: boolean;
  editValue: string;
  onEdit: (field: string, currentValue: string) => void;
  onEditValueChange: (value: string) => void;
  onSave: (field: string) => void;
  onCancel: () => void;
  tagColor?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--muted)]">
      <span className="mt-0.5 text-lg" aria-hidden="true">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
            {label}
          </p>
          <button
            onClick={() => onEdit(field, tags.join(", "))}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--color-accent)] transition-colors"
            aria-label={`Edit ${label}`}
          >
            ✏️
          </button>
        </div>
        {isEditing ? (
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              placeholder="Comma-separated values"
              className="flex-1 rounded-[var(--radius-input)] border border-[var(--border)] px-2 py-1 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onSave(field);
                if (e.key === "Escape") onCancel();
              }}
              aria-label={`Edit ${label}`}
            />
            <button
              onClick={() => onSave(field)}
              className="rounded-[var(--radius-badge)] bg-[var(--color-success)] px-2 py-1 text-xs text-white"
            >
              ✓
            </button>
            <button
              onClick={onCancel}
              className="rounded-[var(--radius-badge)] bg-[var(--muted)] px-2 py-1 text-xs"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {tags.length > 0 ? (
              tags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex rounded-[var(--radius-badge)] border px-2 py-0.5 text-xs font-medium ${tagColor}`}
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-xs text-[var(--muted-foreground)] italic">
                None learned yet
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Timeline Tab ---

function TimelineTab({
  memories,
  onDelete,
}: {
  memories: MemoryItem[];
  onDelete?: (memoryId: string) => void;
}) {
  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          No memories recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {memories.map((memory, idx) => {
        const config = CATEGORY_CONFIG[memory.category] || CATEGORY_CONFIG.other;
        return (
          <motion.div
            key={memory.id || idx}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="group relative flex gap-3 py-3"
          >
            {/* Timeline line */}
            {idx < memories.length - 1 && (
              <div
                className="absolute left-[17px] top-[36px] bottom-0 w-px"
                style={{ backgroundColor: "var(--border)" }}
              />
            )}

            {/* Dot */}
            <div
              className="mt-1 h-[10px] w-[10px] flex-shrink-0 rounded-full border-2"
              style={{
                borderColor: config.color,
                backgroundColor: `${config.color}33`,
              }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-[var(--foreground)] leading-snug">
                  {memory.fact}
                </p>
                {onDelete && (
                  <button
                    onClick={() => onDelete(memory.id)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[var(--muted-foreground)] hover:text-[var(--color-error)]"
                    aria-label={`Delete memory: ${memory.fact}`}
                    title="Delete this memory"
                  >
                    🗑️
                  </button>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <span>{config.icon} {config.label}</span>
                <span>·</span>
                <time dateTime={memory.learnedAt}>
                  {new Date(memory.learnedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </time>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
