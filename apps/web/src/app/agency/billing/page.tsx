/**
 * Agency Billing Page (S9-07)
 *
 * Current plan, usage meters, plan comparison, invoices,
 * upgrade/downgrade actions. Clean Stripe-like design.
 */

"use client";

import { useState } from "react";

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  limits: { properties: number; voiceMinutes: number; teamMembers: number };
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    limits: { properties: 50, voiceMinutes: 100, teamMembers: 3 },
    features: [
      "Up to 50 properties",
      "100 voice minutes/month",
      "3 team members",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 149,
    limits: { properties: 250, voiceMinutes: 500, teamMembers: 10 },
    features: [
      "Up to 250 properties",
      "500 voice minutes/month",
      "10 team members",
      "Advanced analytics",
      "CRM webhooks",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 399,
    limits: { properties: -1, voiceMinutes: -1, teamMembers: -1 },
    features: [
      "Unlimited properties",
      "Unlimited voice minutes",
      "Unlimited team members",
      "Custom branding",
      "Custom domain",
      "API access",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
];

// Mock current state
const currentPlan = "starter";
const mockUsage = {
  properties: { used: 32, limit: 50 },
  voiceMinutes: { used: 67, limit: 100 },
  teamMembers: { used: 3, limit: 3 },
};

const mockInvoices = [
  { id: "inv_001", date: "1 Mar 2024", amount: 49, status: "paid" },
  { id: "inv_002", date: "1 Feb 2024", amount: 49, status: "paid" },
  { id: "inv_003", date: "1 Jan 2024", amount: 49, status: "paid" },
];

function UsageMeter({ label, used, limit, color }: { label: string; used: number; limit: number; color: string }) {
  const pct = limit === -1 ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = pct > 80;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--muted-foreground)]">{label}</span>
        <span
          className={`text-xs font-bold ${isNearLimit ? "text-[var(--color-warning)]" : "text-[#0D1B2A]"}`}
          style={{ fontFamily: "var(--font-data)" }}
        >
          {used}{limit === -1 ? "" : ` / ${limit}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: limit === -1 ? "5%" : `${pct}%`,
            backgroundColor: isNearLimit ? "var(--color-warning)" : color,
          }}
        />
      </div>
      {isNearLimit && (
        <p className="mt-1 text-[10px] text-[var(--color-warning)]">
          Approaching limit — consider upgrading
        </p>
      )}
    </div>
  );
}

export default function AgencyBillingPage() {
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0D1B2A]">Billing & Subscription</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Manage your subscription plan and view usage.
        </p>
      </div>

      {/* Current Plan Badge */}
      <div className="mb-6 rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--muted-foreground)]">Current Plan</p>
            <p className="text-xl font-bold text-[#0D1B2A]">
              {plans.find((p) => p.id === currentPlan)?.name}
              <span className="ml-2 text-sm font-normal text-[var(--muted-foreground)]">
                £{plans.find((p) => p.id === currentPlan)?.price}/mo
              </span>
            </p>
          </div>
          <span className="rounded-full bg-[var(--color-success)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-success)]">
            Active
          </span>
        </div>
      </div>

      {/* Usage Meters */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <UsageMeter
          label="Properties Listed"
          used={mockUsage.properties.used}
          limit={mockUsage.properties.limit}
          color="var(--color-primary)"
        />
        <UsageMeter
          label="Voice Minutes"
          used={mockUsage.voiceMinutes.used}
          limit={mockUsage.voiceMinutes.limit}
          color="var(--color-accent)"
        />
        <UsageMeter
          label="Team Members"
          used={mockUsage.teamMembers.used}
          limit={mockUsage.teamMembers.limit}
          color="var(--color-gold)"
        />
      </div>

      {/* Plan Comparison */}
      <h2 className="mb-4 text-lg font-bold text-[#0D1B2A]">Plans</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isPopular = plan.id === "growth";

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 bg-white p-5 shadow-sm transition-all ${
                isCurrent
                  ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20"
                  : "border-[var(--border)] hover:border-[var(--color-accent)]/50"
              }`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-gold)] px-3 py-0.5 text-[10px] font-bold text-white">
                  Most Popular
                </span>
              )}

              <h3 className="text-lg font-bold text-[#0D1B2A]">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span
                  className="text-3xl font-bold text-[#0D1B2A]"
                  style={{ fontFamily: "var(--font-data)" }}
                >
                  £{plan.price}
                </span>
                <span className="text-sm text-[var(--muted-foreground)]">/month</span>
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs text-[#0D1B2A]">
                    <span className="text-[var(--color-success)]">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedPlan(plan.id)}
                className={`mt-5 w-full rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  isCurrent
                    ? "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-default"
                    : "bg-[var(--color-accent)] text-white hover:opacity-90 shadow-sm"
                }`}
                disabled={isCurrent}
              >
                {isCurrent ? "Current Plan" : plan.price > (plans.find((p) => p.id === currentPlan)?.price || 0) ? "Upgrade" : "Downgrade"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Invoices */}
      <h2 className="mb-4 text-lg font-bold text-[#0D1B2A]">Invoices</h2>
      <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[#F8F9FC]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Invoice</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Date</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Amount</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockInvoices.map((inv) => (
              <tr key={inv.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-[#0D1B2A]">{inv.id}</td>
                <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{inv.date}</td>
                <td className="px-4 py-3 text-xs font-semibold" style={{ fontFamily: "var(--font-data)" }}>
                  £{inv.amount}.00
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-200">
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
