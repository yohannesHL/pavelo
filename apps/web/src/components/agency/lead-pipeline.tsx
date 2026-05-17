/**
 * Lead Pipeline (S9-01)
 *
 * Table of leads with status (new/contacted/qualified/converted/lost),
 * source, date. Status change via dropdown.
 */

"use client";

import { useState } from "react";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  source: string;
  budget: number | null;
  propertyId: string | null;
  notes: string | null;
  createdAt: string;
}

const mockLeads: Lead[] = [
  { id: "1", name: "Sarah Mitchell", email: "sarah@email.com", phone: "07700 123456", status: "new", source: "xara", budget: 450000, propertyId: null, notes: "Looking for 3-bed in Islington", createdAt: "2024-03-15T10:30:00Z" },
  { id: "2", name: "James Clarke", email: "james.c@gmail.com", phone: null, status: "contacted", source: "website", budget: 600000, propertyId: null, notes: "First-time buyer, pre-approved", createdAt: "2024-03-14T14:22:00Z" },
  { id: "3", name: "Priya Sharma", email: "priya.s@outlook.com", phone: "07711 987654", status: "qualified", source: "xara", budget: 350000, propertyId: null, notes: "Relocating from Manchester", createdAt: "2024-03-13T09:15:00Z" },
  { id: "4", name: "Tom Walker", email: "twalker@proton.me", phone: "07700 555111", status: "converted", source: "referral", budget: 800000, propertyId: null, notes: "Purchased 4-bed in Richmond", createdAt: "2024-03-10T16:45:00Z" },
  { id: "5", name: "Emma Price", email: "emma.p@yahoo.com", phone: null, status: "lost", source: "xara", budget: 275000, propertyId: null, notes: "Budget too low for area", createdAt: "2024-03-08T11:00:00Z" },
  { id: "6", name: "David Kim", email: "dkim@email.co.uk", phone: "07722 333444", status: "new", source: "xara", budget: 520000, propertyId: null, notes: "Interested in Victorian terraces", createdAt: "2024-03-15T08:12:00Z" },
  { id: "7", name: "Laura Bennett", email: "l.bennett@work.com", phone: null, status: "contacted", source: "manual", budget: 700000, propertyId: null, notes: "Looking at Clapham / Brixton", createdAt: "2024-03-12T13:30:00Z" },
];

const statusConfig: Record<Lead["status"], { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  contacted: { label: "Contacted", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  qualified: { label: "Qualified", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  converted: { label: "Converted", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  lost: { label: "Lost", color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
};

const statusOrder: Lead["status"][] = ["new", "contacted", "qualified", "converted", "lost"];

export function LeadPipeline({ agencyId }: { agencyId: string }) {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [filterStatus, setFilterStatus] = useState<Lead["status"] | "all">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", budget: "", notes: "" });

  const filtered = filterStatus === "all" ? leads : leads.filter((l) => l.status === filterStatus);

  const handleStatusChange = (leadId: string, newStatus: Lead["status"]) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatBudget = (n: number | null) => {
    if (!n) return "—";
    return `£${(n / 1000).toFixed(0)}k`;
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterStatus === "all"
                ? "bg-[#0D1B2A] text-white"
                : "bg-white text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--muted)]"
            }`}
          >
            All ({leads.length})
          </button>
          {statusOrder.map((s) => {
            const count = leads.filter((l) => l.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterStatus === s
                    ? "bg-[#0D1B2A] text-white"
                    : "bg-white text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--muted)]"
                }`}
              >
                {statusConfig[s].label} ({count})
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
        >
          + Add Lead
        </button>
      </div>

      {/* Add Lead Form */}
      {showAddForm && (
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[#0D1B2A]">Add New Lead</h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <input
              placeholder="Name *"
              value={newLead.name}
              onChange={(e) => setNewLead((prev) => ({ ...prev, name: e.target.value }))}
              className="rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
            <input
              placeholder="Email"
              type="email"
              value={newLead.email}
              onChange={(e) => setNewLead((prev) => ({ ...prev, email: e.target.value }))}
              className="rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
            <input
              placeholder="Phone"
              value={newLead.phone}
              onChange={(e) => setNewLead((prev) => ({ ...prev, phone: e.target.value }))}
              className="rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
            <input
              placeholder="Budget (£)"
              type="number"
              value={newLead.budget}
              onChange={(e) => setNewLead((prev) => ({ ...prev, budget: e.target.value }))}
              className="rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
          </div>
          <textarea
            placeholder="Notes..."
            rows={2}
            value={newLead.notes}
            onChange={(e) => setNewLead((prev) => ({ ...prev, notes: e.target.value }))}
            className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                if (!newLead.name.trim()) return;
                const lead: Lead = {
                  id: String(Date.now()),
                  name: newLead.name.trim(),
                  email: newLead.email || null,
                  phone: newLead.phone || null,
                  status: "new",
                  source: "manual",
                  budget: newLead.budget ? parseInt(newLead.budget, 10) : null,
                  propertyId: null,
                  notes: newLead.notes || null,
                  createdAt: new Date().toISOString(),
                };
                setLeads((prev) => [lead, ...prev]);
                setNewLead({ name: "", email: "", phone: "", budget: "", notes: "" });
                setShowAddForm(false);
              }}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white"
            >
              Save Lead
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-lg px-4 py-2 text-xs font-medium text-[var(--muted-foreground)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Lead Table */}
      <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[#F8F9FC]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Name</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Contact</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Status</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Source</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Budget</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[#F8F9FC]/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-[#0D1B2A]">{lead.name}</p>
                  {lead.notes && (
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)] truncate max-w-[200px]">
                      {lead.notes}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs">{lead.email || "—"}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{lead.phone || ""}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={lead.status}
                    onChange={(e) => handleStatusChange(lead.id, e.target.value as Lead["status"])}
                    className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusConfig[lead.status].color} ${statusConfig[lead.status].bg} cursor-pointer outline-none`}
                  >
                    {statusOrder.map((s) => (
                      <option key={s} value={s}>{statusConfig[s].label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-[var(--muted)] px-2 py-1 text-xs capitalize">
                    {lead.source}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span style={{ fontFamily: "var(--font-data)" }} className="text-xs font-semibold text-[#0D1B2A]">
                    {formatBudget(lead.budget)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                  {formatDate(lead.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-[var(--muted-foreground)]">
            No leads found for this filter.
          </div>
        )}
      </div>
    </div>
  );
}
