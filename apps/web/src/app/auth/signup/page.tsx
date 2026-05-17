"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Start your onboarding journey with Xara
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            Our onboarding flow will guide you through role selection, profile creation, and preference setup.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-input)] bg-[var(--color-primary)] px-6 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-light)]"
          >
            Begin Onboarding →
          </Link>
          <div className="mt-6 text-sm text-[var(--muted-foreground)]">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-[var(--color-accent)] hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
