/**
 * Team Management (S9-01)
 *
 * List agency users, invite new members, role assignment.
 */

"use client";

import { useState } from "react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent" | "viewer";
  joinedAt: string | null;
  invitedAt: string | null;
}

const mockTeam: TeamMember[] = [
  { id: "1", name: "Alex Johnson", email: "alex@agency.co.uk", role: "admin", joinedAt: "2024-01-15T00:00:00Z", invitedAt: null },
  { id: "2", name: "Maria Garcia", email: "maria@agency.co.uk", role: "agent", joinedAt: "2024-02-01T00:00:00Z", invitedAt: null },
  { id: "3", name: "Chris Patel", email: "chris@agency.co.uk", role: "agent", joinedAt: "2024-02-20T00:00:00Z", invitedAt: null },
  { id: "4", name: "Sophie Williams", email: "sophie@agency.co.uk", role: "viewer", joinedAt: null, invitedAt: "2024-03-10T00:00:00Z" },
];

const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: "Admin", color: "text-[#1B3A6B]", bg: "bg-[#1B3A6B]/10" },
  agent: { label: "Agent", color: "text-[#2E86AB]", bg: "bg-[#2E86AB]/10" },
  viewer: { label: "Viewer", color: "text-gray-600", bg: "bg-gray-100" },
};

export function TeamManagement({ agencyId }: { agencyId: string }) {
  const [members, setMembers] = useState<TeamMember[]>(mockTeam);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "agent" | "viewer">("agent");

  const handleInvite = () => {
    if (!inviteName || !inviteEmail) return;
    setMembers((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        joinedAt: null,
        invitedAt: new Date().toISOString(),
      },
    ]);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("agent");
    setShowInvite(false);
  };

  const handleRemove = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          {members.length} team member{members.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
        >
          + Invite Member
        </button>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[#0D1B2A]">Invite Team Member</h3>
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="Full Name *"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
            <input
              placeholder="Email *"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "agent" | "viewer")}
              className="rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm outline-none"
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInvite}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white"
            >
              Send Invite
            </button>
            <button
              onClick={() => setShowInvite(false)}
              className="rounded-lg px-4 py-2 text-xs font-medium text-[var(--muted-foreground)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Member Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar circle */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0D1B2A] text-sm font-bold text-white">
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="font-medium text-[#0D1B2A] text-sm">{member.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{member.email}</p>
                </div>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${roleConfig[member.role].color} ${roleConfig[member.role].bg}`}>
                {roleConfig[member.role].label}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {member.joinedAt
                  ? `Joined ${new Date(member.joinedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
                  : "Invite pending..."}
              </span>
              {member.role !== "admin" && (
                <button
                  onClick={() => handleRemove(member.id)}
                  className="text-[10px] text-red-500 hover:text-red-700 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
