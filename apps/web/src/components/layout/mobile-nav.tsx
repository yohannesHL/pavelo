/**
 * Mobile Navigation (S10-07)
 *
 * Bottom navigation bar for mobile viewports (< 768px).
 * Collapses the top nav into a persistent bottom bar with icons.
 * Includes touch-friendly hit targets (48px minimum).
 */

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  activeIcon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: "🏠", activeIcon: "🏠" },
  { href: "/property", label: "Search", icon: "🔍", activeIcon: "🔍" },
  { href: "/chat", label: "Chat", icon: "💬", activeIcon: "💬" },
  { href: "/voice", label: "Voice", icon: "🎙️", activeIcon: "🎙️" },
  { href: "/dashboard", label: "Me", icon: "👤", activeIcon: "👤" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-white/95 backdrop-blur-sm md:hidden"
      aria-label="Mobile navigation"
      role="navigation"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[48px] min-w-[48px] flex-col items-center justify-center px-3 py-2 text-center transition-colors ${
                isActive
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--muted-foreground)]"
              }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="text-lg" aria-hidden="true">
                {isActive ? item.activeIcon : item.icon}
              </span>
              <span className="mt-0.5 text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[var(--color-primary)]" />
              )}
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for notched devices */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
