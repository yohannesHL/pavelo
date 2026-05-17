"use client";

/**
 * Memory Settings Page — /settings/memory (S8-02)
 *
 * Accessible from user profile/settings. Shows:
 * - MemoryProfileCard with full edit capabilities
 * - Consolidation trigger
 */

import { useState, useCallback } from "react";
import { MemoryProfileCard } from "@/components/memory/memory-profile-card";

// Mock profile for development — replaced by tRPC call in production
const MOCK_PROFILE = {
  id: "1",
  userId: "user-1",
  budgetMin: 350000,
  budgetMax: 550000,
  preferredAreas: ["Clapham", "Brixton", "Dulwich"],
  propertyStyles: ["Victorian", "Period"],
  propertyTypes: ["terraced", "semi-detached"],
  dealBreakers: ["No garden", "Ground floor flat"],
  memories: [
    {
      id: "m1",
      fact: "Looking for a 3-bed Victorian terrace in South London",
      category: "property_type",
      learnedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      source: "conversation",
    },
    {
      id: "m2",
      fact: "Budget between £350k and £550k",
      category: "budget",
      learnedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      source: "conversation",
    },
    {
      id: "m3",
      fact: "Prefers Clapham and Brixton areas",
      category: "area",
      learnedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      source: "conversation",
    },
    {
      id: "m4",
      fact: "Must have a garden — deal breaker",
      category: "deal_breaker",
      learnedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      source: "conversation",
    },
    {
      id: "m5",
      fact: "Interested in period features and original fireplaces",
      category: "style",
      learnedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      source: "conversation",
    },
    {
      id: "m6",
      fact: "Works in Central London, commute time important",
      category: "amenity",
      learnedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      source: "conversation",
    },
  ],
  sentimentScore: 0.7,
  lastConsolidatedAt: new Date(Date.now() - 3600000).toISOString(),
  consolidationCount: 3,
  preferences: {},
};

export default function MemorySettingsPage() {
  const [profile, setProfile] = useState(MOCK_PROFILE);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdatePreference = useCallback(
    (field: string, value: unknown) => {
      setProfile((prev) => ({
        ...prev,
        [field]: value,
      }));
      // In production: call tRPC memory.updatePreference
    },
    []
  );

  const handleDeleteMemory = useCallback(
    (memoryId: string) => {
      setProfile((prev) => ({
        ...prev,
        memories: prev.memories.filter((m) => m.id !== memoryId),
      }));
      // In production: call tRPC memory.deleteMemory
    },
    []
  );

  const handleConsolidate = useCallback(async () => {
    setIsLoading(true);
    // In production: call tRPC memory.consolidate
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-2xl font-bold text-[var(--foreground)]">
          Memory & Preferences
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          See what Xara has learned about you across your conversations.
          Edit or delete anything that&apos;s incorrect.
        </p>
      </div>

      <MemoryProfileCard
        profile={profile}
        userName="there"
        onUpdatePreference={handleUpdatePreference}
        onDeleteMemory={handleDeleteMemory}
        onConsolidate={handleConsolidate}
        isLoading={isLoading}
      />

      <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--muted)] p-4">
        <h3 className="text-sm font-medium text-[var(--foreground)]">
          🔒 Privacy
        </h3>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Your memories are private and only used to personalize your experience.
          You can delete any memory at any time, and Xara will forget it immediately.
        </p>
      </div>
    </div>
  );
}
