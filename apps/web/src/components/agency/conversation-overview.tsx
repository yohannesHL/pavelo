/**
 * Conversation Overview (S9-01)
 *
 * Lists all conversations handled by Xara for this agency,
 * with summary stats.
 */

"use client";

interface Conversation {
  id: string;
  userName: string;
  startedAt: string;
  messageCount: number;
  intent: string;
  status: "active" | "completed" | "handed_over";
  propertiesViewed: number;
  duration: string;
}

const mockConversations: Conversation[] = [
  { id: "1", userName: "Sarah M.", startedAt: "2024-03-15T10:30:00Z", messageCount: 24, intent: "property_search", status: "active", propertiesViewed: 5, duration: "12m" },
  { id: "2", userName: "James C.", startedAt: "2024-03-15T09:15:00Z", messageCount: 18, intent: "viewing_booking", status: "completed", propertiesViewed: 3, duration: "8m" },
  { id: "3", userName: "Priya S.", startedAt: "2024-03-14T16:45:00Z", messageCount: 31, intent: "valuation", status: "completed", propertiesViewed: 0, duration: "15m" },
  { id: "4", userName: "Tom W.", startedAt: "2024-03-14T14:20:00Z", messageCount: 12, intent: "property_search", status: "handed_over", propertiesViewed: 7, duration: "22m" },
  { id: "5", userName: "Emma P.", startedAt: "2024-03-14T11:00:00Z", messageCount: 8, intent: "general_inquiry", status: "completed", propertiesViewed: 1, duration: "4m" },
  { id: "6", userName: "David K.", startedAt: "2024-03-13T15:30:00Z", messageCount: 42, intent: "property_search", status: "active", propertiesViewed: 11, duration: "35m" },
];

const statusBadge: Record<Conversation["status"], { label: string; color: string }> = {
  active: { label: "Active", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { label: "Completed", color: "bg-gray-50 text-gray-600 border-gray-200" },
  handed_over: { label: "Handed Over", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

const intentLabel: Record<string, string> = {
  property_search: "Property Search",
  viewing_booking: "Viewing Booking",
  valuation: "Valuation",
  general_inquiry: "General Inquiry",
};

export function ConversationOverview({ agencyId }: { agencyId: string }) {
  const totalMessages = mockConversations.reduce((s, c) => s + c.messageCount, 0);
  const avgMessages = Math.round(totalMessages / mockConversations.length);

  return (
    <div>
      {/* Summary Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-[var(--border)] bg-white p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Total Conversations</p>
          <p className="mt-1 text-xl font-bold text-[#0D1B2A]" style={{ fontFamily: "var(--font-data)" }}>
            {mockConversations.length}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-white p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Total Messages</p>
          <p className="mt-1 text-xl font-bold text-[#0D1B2A]" style={{ fontFamily: "var(--font-data)" }}>
            {totalMessages}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-white p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Avg Messages / Session</p>
          <p className="mt-1 text-xl font-bold text-[#0D1B2A]" style={{ fontFamily: "var(--font-data)" }}>
            {avgMessages}
          </p>
        </div>
      </div>

      {/* Conversation Table */}
      <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[#F8F9FC]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">User</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Intent</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Status</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Messages</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Properties</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Duration</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Started</th>
            </tr>
          </thead>
          <tbody>
            {mockConversations.map((conv) => (
              <tr
                key={conv.id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[#F8F9FC]/50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 font-medium text-[#0D1B2A]">{conv.userName}</td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-[var(--muted)] px-2 py-1 text-xs">
                    {intentLabel[conv.intent] || conv.intent}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusBadge[conv.status].color}`}>
                    {statusBadge[conv.status].label}
                  </span>
                </td>
                <td className="px-4 py-3 text-center" style={{ fontFamily: "var(--font-data)" }}>
                  {conv.messageCount}
                </td>
                <td className="px-4 py-3 text-center" style={{ fontFamily: "var(--font-data)" }}>
                  {conv.propertiesViewed}
                </td>
                <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{conv.duration}</td>
                <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                  {new Date(conv.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
