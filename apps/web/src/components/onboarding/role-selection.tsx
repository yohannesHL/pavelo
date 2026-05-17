"use client";

import { Home, TrendingUp, Briefcase } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OnboardingRole } from "@/app/onboarding/page";

interface RoleOption {
  role: OnboardingRole;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ROLES: RoleOption[] = [
  {
    role: "buyer",
    icon: <Home className="h-8 w-8" />,
    title: "Buyer",
    description:
      "Find your dream property with AI-powered search. Xara remembers your preferences and gets smarter with every conversation.",
  },
  {
    role: "seller",
    icon: <TrendingUp className="h-8 w-8" />,
    title: "Seller",
    description:
      "Get AI-driven valuations, market intelligence, and connect with buyers through your own AI-powered listing.",
  },
  {
    role: "agent",
    icon: <Briefcase className="h-8 w-8" />,
    title: "Agent",
    description:
      "Manage your listings, track buyer activity, and leverage AI insights to close deals faster.",
  },
];

interface RoleSelectionProps {
  selected: OnboardingRole;
  onSelect: (role: OnboardingRole) => void;
}

export function RoleSelection({ selected, onSelect }: RoleSelectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
          Welcome to Pavelo
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Choose your role to get started with Xara, your AI estate agent.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Select your role">
        {ROLES.map(({ role, icon, title, description }) => (
          <button
            key={role}
            onClick={() => onSelect(role)}
            aria-checked={selected === role}
            role="radio"
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded-[var(--radius-card)]"
          >
            <Card
              className={cn(
                "cursor-pointer transition-all duration-[200ms] ease-out hover:shadow-lg hover:-translate-y-0.5",
                selected === role &&
                  "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)] ring-offset-2"
              )}
            >
              <CardHeader className="items-center text-center">
                <div
                  className={cn(
                    "mb-2 flex h-14 w-14 items-center justify-center rounded-full transition-colors",
                    selected === role
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--muted)] text-[var(--color-primary)]"
                  )}
                >
                  {icon}
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {description}
                </CardDescription>
              </CardHeader>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
