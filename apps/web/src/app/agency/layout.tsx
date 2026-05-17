/**
 * Agency Dashboard Layout (S9-01)
 *
 * Sidebar navigation for agency admin section.
 * Professional, data-dense design with navy + white.
 */

import Link from "next/link";

const navItems = [
  { href: "/agency", label: "Dashboard", icon: "📊" },
  { href: "/agency/analytics", label: "Analytics", icon: "📈" },
  { href: "/agency/settings/branding", label: "Branding", icon: "🎨" },
  { href: "/agency/billing", label: "Billing", icon: "💳" },
];

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="agency-dashboard flex min-h-[calc(100vh-65px)]">
      {/* Sidebar */}
      <aside className="agency-sidebar w-56 shrink-0 border-r border-[var(--border)] bg-[#0D1B2A]">
        <div className="px-4 py-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8899AA]">
            Agency Portal
          </h2>
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#C0D0E0] transition-colors hover:bg-[#1B3A6B]/40 hover:text-white"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Plan indicator */}
        <div className="mt-auto border-t border-[#1B3A6B] px-4 py-4 mt-8">
          <div className="rounded-lg bg-[#1B3A6B]/30 px-3 py-2">
            <p className="text-xs font-medium text-[#8899AA]">Current Plan</p>
            <p className="font-[var(--font-data)] text-sm font-bold text-[var(--color-gold)]">
              Starter
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-[#F8F9FC]">
        {children}
      </main>
    </div>
  );
}
