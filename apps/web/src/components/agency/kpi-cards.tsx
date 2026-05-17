/**
 * Agency KPI Cards (S9-01)
 *
 * Dashboard KPI widgets: active conversations, properties listed,
 * leads this month, viewing bookings, conversion rate.
 * JetBrains Mono for stat values.
 */

"use client";

interface KPI {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: string;
}

// Mock KPIs (would come from tRPC agency.dashboardKpis)
const mockKpis: KPI[] = [
  { label: "Active Conversations", value: 47, change: "+12%", trend: "up", icon: "💬" },
  { label: "Properties Listed", value: 124, change: "+3", trend: "up", icon: "🏠" },
  { label: "Leads This Month", value: 38, change: "+18%", trend: "up", icon: "🎯" },
  { label: "Viewing Bookings", value: 15, change: "+5", trend: "up", icon: "📅" },
  { label: "Conversion Rate", value: "14.2%", change: "+2.1%", trend: "up", icon: "📈" },
  { label: "Pending Handovers", value: 3, change: "", trend: "neutral", icon: "🤝" },
];

export function AgencyKPICards({ agencyId }: { agencyId: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {mockKpis.map((kpi) => (
        <div
          key={kpi.label}
          className="agency-kpi-card rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">{kpi.icon}</span>
            {kpi.change && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  kpi.trend === "up"
                    ? "bg-emerald-50 text-emerald-600"
                    : kpi.trend === "down"
                    ? "bg-red-50 text-red-600"
                    : "bg-gray-50 text-gray-500"
                }`}
              >
                {kpi.change}
              </span>
            )}
          </div>
          <p
            className="mt-3 text-2xl font-bold text-[#0D1B2A]"
            style={{ fontFamily: "var(--font-data)" }}
          >
            {kpi.value}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
            {kpi.label}
          </p>
        </div>
      ))}
    </div>
  );
}
