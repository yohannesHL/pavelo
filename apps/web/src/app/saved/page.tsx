"use client";

/**
 * Saved Properties Board — /saved (S8-09)
 *
 * Kanban-style board with columns:
 * Interested / Shortlisted / Visited / Rejected
 *
 * Features:
 * - Click to move between columns
 * - Property cards with quick actions: notes, compare, remove
 * - Add notes per property
 * - Custom tags
 * - Share shortlist link
 * - Comparison mode: select 2-4 → compare
 *
 * Design: Kanban-style, navy headers, subtle card shadows
 */

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PropertyComparisonTable } from "@/components/chat/property-comparison-table";

// --- Types ---

type ColumnId = "interested" | "shortlisted" | "visited" | "rejected";

interface SavedPropertyItem {
  id: string;
  propertyId: string;
  title: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number | null;
  propertyType: string;
  postcode: string;
  image?: string;
  column: ColumnId;
  notes: string;
  tags: string[];
  addedAt: string;
}

const COLUMNS: { id: ColumnId; label: string; icon: string; color: string }[] = [
  { id: "interested", label: "Interested", icon: "👀", color: "var(--color-accent)" },
  { id: "shortlisted", label: "Shortlisted", icon: "⭐", color: "var(--color-gold)" },
  { id: "visited", label: "Visited", icon: "🏠", color: "var(--color-success)" },
  { id: "rejected", label: "Rejected", icon: "❌", color: "var(--color-error)" },
];

// Demo data
const DEMO_PROPERTIES: SavedPropertyItem[] = [
  {
    id: "sp1", propertyId: "p1", title: "34 Lavender Hill, SW11",
    price: 650000, bedrooms: 3, bathrooms: 2, squareFeet: 1100,
    propertyType: "terraced", postcode: "SW11 1JQ",
    column: "interested", notes: "", tags: ["period"], addedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "sp2", propertyId: "p2", title: "12 Falcon Road, SW11",
    price: 575000, bedrooms: 2, bathrooms: 1, squareFeet: 850,
    propertyType: "flat", postcode: "SW11 2LR",
    column: "interested", notes: "Good transport links", tags: [], addedAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "sp3", propertyId: "p3", title: "89 St John's Road, SW11",
    price: 720000, bedrooms: 4, bathrooms: 2, squareFeet: 1350,
    propertyType: "semi_detached", postcode: "SW11 1QE",
    column: "shortlisted", notes: "Viewing booked for next week", tags: ["garden", "period"], addedAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: "sp4", propertyId: "p4", title: "7 Wandsworth Road, SW8",
    price: 480000, bedrooms: 2, bathrooms: 1, squareFeet: 750,
    propertyType: "flat", postcode: "SW8 2JH",
    column: "visited", notes: "Nice but small kitchen", tags: ["modern"], addedAt: new Date(Date.now() - 432000000).toISOString(),
  },
  {
    id: "sp5", propertyId: "p5", title: "45 Queenstown Rd, SW8",
    price: 550000, bedrooms: 3, bathrooms: 1, squareFeet: 950,
    propertyType: "terraced", postcode: "SW8 3RX",
    column: "rejected", notes: "Too much work needed", tags: [], addedAt: new Date(Date.now() - 518400000).toISOString(),
  },
];

export default function SavedPropertiesPage() {
  const [properties, setProperties] = useState<SavedPropertyItem[]>(DEMO_PROPERTIES);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);

  const columnGroups = useMemo(() => {
    const groups: Record<ColumnId, SavedPropertyItem[]> = {
      interested: [], shortlisted: [], visited: [], rejected: [],
    };
    for (const p of properties) groups[p.column].push(p);
    return groups;
  }, [properties]);

  const moveProperty = useCallback((id: string, newColumn: ColumnId) => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, column: newColumn } : p)));
  }, []);

  const removeProperty = useCallback((id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
    setCompareIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }, []);

  const updateNotes = useCallback((id: string, notes: string) => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, notes } : p)));
  }, []);

  const removeTag = useCallback((id: string, tag: string) => {
    setProperties((prev) => prev.map((p) => p.id === id ? { ...p, tags: p.tags.filter((t) => t !== tag) } : p));
  }, []);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }, []);

  const compareProperties = useMemo(() => {
    return properties.filter((p) => compareIds.has(p.id)).map((p) => ({
      id: p.propertyId, title: p.title, price: p.price, bedrooms: p.bedrooms,
      bathrooms: p.bathrooms, squareFeet: p.squareFeet, propertyType: p.propertyType,
      postcode: p.postcode,
      pricePerSqFt: p.squareFeet ? Math.round(p.price / p.squareFeet) : null,
    }));
  }, [properties, compareIds]);

  const handleShareShortlist = useCallback(() => {
    const shortlisted = properties.filter((p) => p.column === "shortlisted");
    const shareData = shortlisted.map((p) => p.title).join(", ");
    navigator.clipboard.writeText(`My shortlist: ${shareData}`);
  }, [properties]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold text-[var(--foreground)]">
            Saved Properties
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {properties.length} properties saved · Click 📂 to move between columns
          </p>
        </div>
        <div className="flex items-center gap-2">
          {compareIds.size >= 2 && (
            <button
              onClick={() => setShowComparison(true)}
              className="rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-light)] transition-colors"
            >
              Compare ({compareIds.size})
            </button>
          )}
          <button
            onClick={handleShareShortlist}
            className="rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            🔗 Share Shortlist
          </button>
        </div>
      </div>

      {/* Comparison Overlay */}
      <AnimatePresence>
        {showComparison && compareProperties.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">Comparison</h2>
              <button onClick={() => setShowComparison(false)} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                Close ✕
              </button>
            </div>
            <PropertyComparisonTable properties={compareProperties} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="kanban-column">
            {/* Column Header */}
            <div
              className="flex items-center justify-between rounded-t-[var(--radius-card)] px-3 py-2"
              style={{ backgroundColor: `color-mix(in srgb, ${col.color} 10%, white)`, borderBottom: `2px solid ${col.color}` }}
            >
              <div className="flex items-center gap-1.5">
                <span>{col.icon}</span>
                <span className="text-sm font-semibold text-[var(--foreground)]">{col.label}</span>
              </div>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                {columnGroups[col.id].length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2 rounded-b-[var(--radius-card)] border border-t-0 border-[var(--border)] bg-[var(--muted)]/30 p-2 min-h-[200px]">
              <AnimatePresence>
                {columnGroups[col.id].map((prop) => (
                  <SavedPropertyCard
                    key={prop.id}
                    property={prop}
                    currentColumn={col.id}
                    isSelected={compareIds.has(prop.id)}
                    isEditingNotes={editingNotes === prop.id}
                    onMove={moveProperty}
                    onRemove={removeProperty}
                    onToggleCompare={toggleCompare}
                    onEditNotes={(id) => setEditingNotes(editingNotes === id ? null : id)}
                    onUpdateNotes={updateNotes}
                    onRemoveTag={removeTag}
                  />
                ))}
              </AnimatePresence>
              {columnGroups[col.id].length === 0 && (
                <div className="flex items-center justify-center py-8 text-xs text-[var(--muted-foreground)]">
                  No properties
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Property Card ---

function SavedPropertyCard({
  property, currentColumn, isSelected, isEditingNotes,
  onMove, onRemove, onToggleCompare, onEditNotes, onUpdateNotes, onRemoveTag,
}: {
  property: SavedPropertyItem; currentColumn: ColumnId; isSelected: boolean;
  isEditingNotes: boolean;
  onMove: (id: string, col: ColumnId) => void;
  onRemove: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onEditNotes: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const otherColumns = COLUMNS.filter((c) => c.id !== currentColumn);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`kanban-card rounded-[var(--radius-card)] border bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
        isSelected ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30" : "border-[var(--border)]"
      }`}
    >
      {/* Title & Price */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[var(--foreground)] line-clamp-1">{property.title}</p>
          <p className="mt-0.5 text-sm font-bold" style={{ fontFamily: "var(--font-data)", color: "var(--color-gold)" }}>
            £{property.price.toLocaleString("en-GB")}
          </p>
        </div>
        <button
          onClick={() => onToggleCompare(property.id)}
          className={`ml-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs transition-all ${
            isSelected ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--color-accent)]"
          }`}
          aria-label={isSelected ? "Remove from comparison" : "Add to comparison"}
        >
          {isSelected ? "✓" : "⊞"}
        </button>
      </div>

      {/* Stats */}
      <div className="mt-2 flex gap-3 text-[10px] text-[var(--muted-foreground)]">
        <span>{property.bedrooms} bed</span>
        <span>{property.bathrooms} bath</span>
        <span>{property.propertyType.replace("_", " ")}</span>
      </div>

      {/* Tags */}
      {property.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {property.tags.map((tag) => (
            <span key={tag} className="group inline-flex items-center rounded-full bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
              {tag}
              <button onClick={() => onRemoveTag(property.id, tag)} className="ml-0.5 hidden group-hover:inline text-[var(--color-primary)]/50 hover:text-[var(--color-error)]" aria-label={`Remove tag ${tag}`}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {(property.notes || isEditingNotes) && (
        <div className="mt-2">
          {isEditingNotes ? (
            <textarea
              value={property.notes}
              onChange={(e) => onUpdateNotes(property.id, e.target.value)}
              placeholder="Add notes..."
              rows={2}
              className="w-full rounded-[var(--radius-input)] border border-[var(--border)] px-2 py-1 text-xs focus:border-[var(--color-accent)] focus:outline-none resize-none"
              autoFocus
            />
          ) : (
            property.notes && (
              <p className="text-[10px] text-[var(--muted-foreground)] italic line-clamp-2">📝 {property.notes}</p>
            )
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 flex items-center justify-between border-t border-[var(--border)] pt-2">
        <div className="flex gap-1">
          <button onClick={() => onEditNotes(property.id)} className="rounded px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors" title="Notes">📝</button>
          <button onClick={() => setShowActions(!showActions)} className="rounded px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors" title="Move to...">📂</button>
          <button onClick={() => onRemove(property.id)} className="rounded px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)] hover:bg-red-50 hover:text-[var(--color-error)] transition-colors" title="Remove">🗑️</button>
        </div>
        <span className="text-[9px] text-[var(--muted-foreground)]">
          {new Date(property.addedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </span>
      </div>

      {/* Move dropdown */}
      {showActions && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-1 flex flex-wrap gap-1">
          {otherColumns.map((col) => (
            <button
              key={col.id}
              onClick={() => { onMove(property.id, col.id); setShowActions(false); }}
              className="rounded-[var(--radius-badge)] border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              {col.icon} {col.label}
            </button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
