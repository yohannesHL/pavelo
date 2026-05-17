"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OnboardingData } from "@/app/onboarding/page";

interface ProfileFormProps {
  data: OnboardingData;
  onChange: (partial: Partial<OnboardingData>) => void;
  onBack: () => void;
  onNext: () => void;
  onComplete?: () => void;
  submitting: boolean;
  error: string | null;
}

export function ProfileForm({
  data,
  onChange,
  onBack,
  onNext,
  onComplete,
  submitting,
  error,
}: ProfileFormProps) {
  const isValid =
    data.name.trim().length > 0 &&
    data.email.includes("@") &&
    data.password.length >= 8;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    if (onComplete) {
      onComplete();
    } else {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create your profile</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Tell us about yourself so Xara can personalise your experience.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            placeholder="John Smith"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            required
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Minimum 8 characters"
            value={data.password}
            onChange={(e) => onChange({ password: e.target.value })}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+44 7700 900000"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            autoComplete="tel"
          />
        </div>

        {error && (
          <p className="text-sm text-[var(--color-error)]" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          <Button type="submit" disabled={!isValid || submitting}>
            {submitting
              ? "Creating account…"
              : onComplete
                ? "Create Account"
                : "Continue →"}
          </Button>
        </div>
      </form>
    </div>
  );
}
