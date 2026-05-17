"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function DashboardPage() {
  const { user, loading, initialized, signOut } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !user) {
      router.push("/auth/login");
    }
  }, [initialized, user, router]);

  if (!initialized || loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="mb-8 h-4 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  const role = (user.user_metadata?.role as string) || "buyer";
  const name = (user.user_metadata?.name as string) || "User";

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {name}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-[var(--muted-foreground)]">
              {user.email}
            </p>
            <Badge variant="accent" className="capitalize">
              {role}
            </Badge>
          </div>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/property">
          <Card className="cursor-pointer transition-all duration-[200ms] ease-out hover:shadow-lg hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                🏠 Properties
              </CardTitle>
              <CardDescription>
                Browse and search property listings
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/chat">
          <Card className="cursor-pointer transition-all duration-[200ms] ease-out hover:shadow-lg hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                💬 Chat with Xara
              </CardTitle>
              <CardDescription>
                Talk to your AI estate agent
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/voice">
          <Card className="cursor-pointer transition-all duration-[200ms] ease-out hover:shadow-lg hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                🎙️ Voice Session
              </CardTitle>
              <CardDescription>
                Speak with Xara using voice
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/saved">
          <Card className="cursor-pointer transition-all duration-[200ms] ease-out hover:shadow-lg hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                ⭐ Saved Properties
              </CardTitle>
              <CardDescription>
                View your saved and favourited properties
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/market">
          <Card className="cursor-pointer transition-all duration-[200ms] ease-out hover:shadow-lg hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                📊 Market Intel
              </CardTitle>
              <CardDescription>
                Area statistics, price trends, and insights
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {role === "agent" && (
          <Link href="/agent-dashboard">
            <Card className="cursor-pointer transition-all duration-[200ms] ease-out hover:shadow-lg hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  📋 Agent Dashboard
                </CardTitle>
                <CardDescription>
                  Manage listings and track buyer activity
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
