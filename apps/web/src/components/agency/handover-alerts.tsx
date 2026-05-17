/**
 * Handover Alerts (S9-03)
 *
 * Real-time alert banner when handover requested.
 * Shows pending handovers with accept/view actions.
 */

"use client";

import { useState } from "react";

interface HandoverAlert {
  id: string;
  userName: string;
  reason: string;
  contextSummary: string;
  propertiesDiscussed: string[];
  createdAt: string;
  status: "pending" | "accepted" | "in_progress" | "completed";
}

const mockHandovers: HandoverAlert[] = [
  {
    id: "1",
    userName: "Tom Walker",
    reason: "user_requested",
    contextSummary: "Buyer looking at 4-bed homes in Richmond, budget £800k. Interested in 3 specific properties. Requesting to speak to a human about scheduling multiple viewings.",
    propertiesDiscussed: ["42 Richmond Hill", "15 Park Lane", "8 Kew Gardens Rd"],
    createdAt: "2024-03-15T11:30:00Z",
    status: "pending",
  },
  {
    id: "2",
    userName: "Laura Bennett",
    reason: "booking_confirmation",
    contextSummary: "Wants to confirm a Saturday viewing for property at Clapham Common. Needs to coordinate with partner.",
    propertiesDiscussed: ["22 Clapham Common North"],
    createdAt: "2024-03-15T10:15:00Z",
    status: "pending",
  },
];

const reasonLabels: Record<string, string> = {
  user_requested: "User requested human",
  low_confidence: "Low agent confidence",
  booking_confirmation: "Booking confirmation",
};

export function HandoverAlerts({ agencyId }: { agencyId: string }) {
  const [handovers, setHandovers] = useState<HandoverAlert[]>(mockHandovers);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pendingHandovers = handovers.filter((h) => h.status === "pending");

  if (pendingHandovers.length === 0) return null;

  const handleAccept = (id: string) => {
    setHandovers((prev) =>
      prev.map((h) => (h.id === id ? { ...h, status: "accepted" as const } : h))
    );
  };

  return (
    <div className="mt-6">
      {/* Alert Banner */}
      <div className="rounded-xl border-2 border-[var(--color-gold)] bg-[var(--color-gold)]/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-gold)] opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--color-gold)]" />
          </span>
          <h3 className="text-sm font-bold text-[#0D1B2A]">
            {pendingHandovers.length} Handover Request{pendingHandovers.length > 1 ? "s" : ""}
          </h3>
        </div>

        <div className="space-y-3">
          {pendingHandovers.map((handover) => (
            <div
              key={handover.id}
              className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-[#0D1B2A]">{handover.userName}</span>
                    <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      {reasonLabels[handover.reason] || handover.reason}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {new Date(handover.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} today
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(handover.id)}
                    className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === handover.id ? null : handover.id)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                  >
                    {expandedId === handover.id ? "Hide" : "Context"}
                  </button>
                </div>
              </div>

              {/* Expanded Context */}
              {expandedId === handover.id && (
                <div className="mt-3 rounded-lg bg-[#F8F9FC] p-3 text-xs">
                  <p className="font-medium text-[#0D1B2A] mb-1">Conversation Summary:</p>
                  <p className="text-[var(--muted-foreground)] leading-relaxed">{handover.contextSummary}</p>
                  {handover.propertiesDiscussed.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-[#0D1B2A] mb-1">Properties Discussed:</p>
                      <div className="flex flex-wrap gap-1">
                        {handover.propertiesDiscussed.map((p) => (
                          <span key={p} className="rounded-md bg-white border border-[var(--border)] px-2 py-0.5 text-[10px]">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
