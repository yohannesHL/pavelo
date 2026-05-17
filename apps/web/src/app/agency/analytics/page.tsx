/**
 * Agency Analytics Page (S9-02)
 *
 * Charts: message count over time, intent distribution (pie),
 * property interest heatmap, session duration histogram,
 * top queries, agent response satisfaction, date range picker.
 * Uses Recharts, brand colors, responsive grid.
 */

"use client";

import { useState, useMemo } from "react";

// ─── Mock Data ───

const generateMessageVolume = () => {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    data.push({
      date: d.toISOString().split("T")[0],
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      count: Math.floor(Math.random() * 40) + 10,
    });
  }
  return data;
};

const intentData = [
  { name: "Property Search", value: 42, color: "#1B3A6B" },
  { name: "Viewing Booking", value: 18, color: "#2E86AB" },
  { name: "Valuation", value: 15, color: "#F4A261" },
  { name: "General Inquiry", value: 12, color: "#10b981" },
  { name: "Mortgage", value: 8, color: "#8b5cf6" },
  { name: "Area Info", value: 5, color: "#ef4444" },
];

const propertyInterest = [
  { property: "42 Richmond Hill", views: 34, inquiries: 12 },
  { property: "15 Park Lane, SW1", views: 28, inquiries: 8 },
  { property: "8 Kew Gardens Rd", views: 25, inquiries: 10 },
  { property: "22 Clapham Common N", views: 21, inquiries: 6 },
  { property: "55 Islington High St", views: 19, inquiries: 5 },
  { property: "11 Brixton Road", views: 16, inquiries: 4 },
  { property: "7 Hackney Central", views: 14, inquiries: 7 },
  { property: "33 Shoreditch High", views: 12, inquiries: 3 },
];

const sessionDurations = [
  { range: "0-2m", count: 15 },
  { range: "2-5m", count: 28 },
  { range: "5-10m", count: 42 },
  { range: "10-20m", count: 31 },
  { range: "20-30m", count: 12 },
  { range: "30m+", count: 5 },
];

const topQueries = [
  { query: "3 bed house in Islington", count: 18 },
  { query: "properties under 500k London", count: 15 },
  { query: "Victorian terrace Clapham", count: 12 },
  { query: "garden flat zone 2", count: 10 },
  { query: "family home near good schools", count: 9 },
  { query: "modern apartment Shoreditch", count: 8 },
  { query: "property valuation SW11", count: 7 },
  { query: "book a viewing this weekend", count: 6 },
];

export default function AgencyAnalyticsPage() {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");
  const messageVolume = useMemo(() => generateMessageVolume(), []);
  const maxMessages = Math.max(...messageVolume.map((d) => d.count));

  // Satisfaction mock
  const satisfaction = { thumbsUp: 156, thumbsDown: 23, rate: 87 };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Conversation Analytics</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Insights into AI conversations, user intents, and agent performance.
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="flex rounded-lg border border-[var(--border)] bg-white p-0.5 shadow-sm">
          {(["7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                dateRange === range
                  ? "bg-[#0D1B2A] text-white"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Message Volume Over Time */}
        <div className="col-span-2 rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-[#0D1B2A]">Message Volume</h3>
          <div className="flex items-end gap-[2px] h-40">
            {messageVolume.map((d) => (
              <div key={d.date} className="group relative flex-1 flex flex-col items-center justify-end">
                <div
                  className="w-full rounded-t bg-[var(--color-accent)] transition-all hover:bg-[var(--color-primary)]"
                  style={{ height: `${(d.count / maxMessages) * 100}%`, minHeight: "2px" }}
                />
                {/* Tooltip */}
                <div className="absolute -top-10 hidden group-hover:block z-10">
                  <div className="rounded-md bg-[#0D1B2A] px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-lg">
                    <span style={{ fontFamily: "var(--font-data)" }}>{d.count}</span> msgs • {d.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-[var(--muted-foreground)]">
            <span>{messageVolume[0]?.label}</span>
            <span>{messageVolume[messageVolume.length - 1]?.label}</span>
          </div>
        </div>

        {/* Intent Distribution (Pie chart - SVG) */}
        <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-[#0D1B2A]">Intent Distribution</h3>
          <div className="flex items-center gap-6">
            {/* SVG Donut Chart */}
            <svg viewBox="0 0 100 100" className="h-40 w-40 shrink-0">
              {(() => {
                const total = intentData.reduce((s, d) => s + d.value, 0);
                let cumulative = 0;
                return intentData.map((segment) => {
                  const pct = segment.value / total;
                  const startAngle = cumulative * 360;
                  cumulative += pct;
                  const endAngle = cumulative * 360;
                  const largeArc = pct > 0.5 ? 1 : 0;

                  const startRad = ((startAngle - 90) * Math.PI) / 180;
                  const endRad = ((endAngle - 90) * Math.PI) / 180;

                  const x1 = 50 + 40 * Math.cos(startRad);
                  const y1 = 50 + 40 * Math.sin(startRad);
                  const x2 = 50 + 40 * Math.cos(endRad);
                  const y2 = 50 + 40 * Math.sin(endRad);

                  return (
                    <path
                      key={segment.name}
                      d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={segment.color}
                      stroke="white"
                      strokeWidth="1"
                      opacity="0.85"
                    />
                  );
                });
              })()}
              <circle cx="50" cy="50" r="20" fill="white" />
              <text x="50" y="48" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0D1B2A">
                {intentData.reduce((s, d) => s + d.value, 0)}
              </text>
              <text x="50" y="58" textAnchor="middle" fontSize="5" fill="#737373">
                total
              </text>
            </svg>
            {/* Legend */}
            <div className="flex flex-col gap-2">
              {intentData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-[var(--muted-foreground)]">{d.name}</span>
                  <span className="ml-auto text-xs font-semibold" style={{ fontFamily: "var(--font-data)" }}>
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Session Duration Histogram */}
        <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-[#0D1B2A]">Session Duration</h3>
          <div className="space-y-2">
            {sessionDurations.map((d) => {
              const maxCount = Math.max(...sessionDurations.map((s) => s.count));
              return (
                <div key={d.range} className="flex items-center gap-3">
                  <span className="w-14 text-xs text-[var(--muted-foreground)] text-right">{d.range}</span>
                  <div className="flex-1 h-6 rounded-md bg-[var(--muted)] overflow-hidden">
                    <div
                      className="h-full rounded-md bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] transition-all"
                      style={{ width: `${(d.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-xs font-semibold text-[#0D1B2A]" style={{ fontFamily: "var(--font-data)" }}>
                    {d.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Property Interest Heatmap */}
        <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-[#0D1B2A]">Property Interest</h3>
          <div className="space-y-2">
            {propertyInterest.map((p) => {
              const maxViews = Math.max(...propertyInterest.map((x) => x.views));
              return (
                <div key={p.property} className="flex items-center gap-3">
                  <span className="w-36 text-xs text-[#0D1B2A] truncate" title={p.property}>
                    {p.property}
                  </span>
                  <div className="flex-1 flex gap-1">
                    <div
                      className="h-5 rounded-sm bg-[var(--color-primary)]/70"
                      style={{ width: `${(p.views / maxViews) * 100}%` }}
                      title={`${p.views} views`}
                    />
                    <div
                      className="h-5 rounded-sm bg-[var(--color-gold)]"
                      style={{ width: `${(p.inquiries / maxViews) * 100}%` }}
                      title={`${p.inquiries} inquiries`}
                    />
                  </div>
                  <span className="w-12 text-right text-[10px] text-[var(--muted-foreground)]">
                    <span style={{ fontFamily: "var(--font-data)" }}>{p.views}</span>/{p.inquiries}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-[10px] text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-[var(--color-primary)]/70" /> Views
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-[var(--color-gold)]" /> Inquiries
            </span>
          </div>
        </div>

        {/* Top Queries */}
        <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-[#0D1B2A]">Top Queries</h3>
          <div className="space-y-2">
            {topQueries.map((q, i) => (
              <div key={q.query} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-[10px] font-semibold text-[var(--muted-foreground)]">
                  {i + 1}
                </span>
                <span className="flex-1 text-xs text-[#0D1B2A] truncate">{q.query}</span>
                <span className="text-xs font-semibold text-[var(--color-accent)]" style={{ fontFamily: "var(--font-data)" }}>
                  {q.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Satisfaction */}
        <div className="col-span-2 rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-[#0D1B2A]">Agent Response Satisfaction</h3>
          <div className="flex items-center gap-8">
            {/* Big Rate */}
            <div className="text-center">
              <p className="text-5xl font-bold text-[var(--color-success)]" style={{ fontFamily: "var(--font-data)" }}>
                {satisfaction.rate}%
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Satisfaction Rate</p>
            </div>

            {/* Breakdown Bar */}
            <div className="flex-1">
              <div className="flex h-8 rounded-lg overflow-hidden">
                <div
                  className="bg-emerald-500 flex items-center justify-center"
                  style={{ width: `${satisfaction.rate}%` }}
                >
                  <span className="text-[10px] font-bold text-white">👍 {satisfaction.thumbsUp}</span>
                </div>
                <div
                  className="bg-red-400 flex items-center justify-center"
                  style={{ width: `${100 - satisfaction.rate}%` }}
                >
                  <span className="text-[10px] font-bold text-white">👎 {satisfaction.thumbsDown}</span>
                </div>
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-[var(--muted-foreground)]">
                <span>Total responses rated: {satisfaction.thumbsUp + satisfaction.thumbsDown}</span>
                <span>Period: Last {dateRange === "7d" ? "7" : dateRange === "30d" ? "30" : "90"} days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
