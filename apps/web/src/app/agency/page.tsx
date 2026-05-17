/**
 * Agency Dashboard Page (S9-01)
 *
 * KPI cards, lead pipeline, team management, AI conversation overview.
 * Professional, data-dense, navy + white, JetBrains Mono for stats.
 */

"use client";

import { useState } from "react";
import { AgencyKPICards } from "@/components/agency/kpi-cards";
import { LeadPipeline } from "@/components/agency/lead-pipeline";
import { TeamManagement } from "@/components/agency/team-management";
import { ConversationOverview } from "@/components/agency/conversation-overview";
import { HandoverAlerts } from "@/components/agency/handover-alerts";

// Mock agency ID — in production from auth context
const MOCK_AGENCY_ID = "00000000-0000-0000-0000-000000000001";

type Tab = "leads" | "conversations" | "team";

export default function AgencyDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("leads");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "leads", label: "Lead Pipeline", icon: "🎯" },
    { id: "conversations", label: "AI Conversations", icon: "💬" },
    { id: "team", label: "Team", icon: "👥" },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0D1B2A]">Agency Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Manage your portfolio, leads, and team from one place.
        </p>
      </div>

      {/* KPI Cards */}
      <AgencyKPICards agencyId={MOCK_AGENCY_ID} />

      {/* Handover Alerts */}
      <HandoverAlerts agencyId={MOCK_AGENCY_ID} />

      {/* Tab Navigation */}
      <div className="mt-8 mb-6 flex gap-1 rounded-xl bg-white p-1 shadow-sm border border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-[#0D1B2A] text-white shadow-sm"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "leads" && <LeadPipeline agencyId={MOCK_AGENCY_ID} />}
        {activeTab === "conversations" && <ConversationOverview agencyId={MOCK_AGENCY_ID} />}
        {activeTab === "team" && <TeamManagement agencyId={MOCK_AGENCY_ID} />}
      </div>
    </div>
  );
}
