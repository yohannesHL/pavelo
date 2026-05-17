"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { RoleSelection } from "@/components/onboarding/role-selection";
import { ProfileForm } from "@/components/onboarding/profile-form";
import { PreferenceWizard } from "@/components/onboarding/preference-wizard";
import { useAuthStore } from "@/stores/auth-store";

export type OnboardingRole = "buyer" | "seller" | "agent";

export interface OnboardingData {
  role: OnboardingRole;
  name: string;
  email: string;
  password: string;
  phone: string;
  preferences: {
    locations: string[];
    budgetMin: number;
    budgetMax: number;
    propertyTypes: string[];
    bedroomsMin: number;
    bedroomsMax: number;
    features: string[];
  };
}

const INITIAL_DATA: OnboardingData = {
  role: "buyer",
  name: "",
  email: "",
  password: "",
  phone: "",
  preferences: {
    locations: [],
    budgetMin: 0,
    budgetMax: 1000000,
    propertyTypes: [],
    bedroomsMin: 1,
    bedroomsMax: 5,
    features: [],
  },
};

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);
  const router = useRouter();

  const updateData = (partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const handleComplete = async () => {
    setSubmitting(true);
    setError(null);

    const { error: authError } = await signUp(data.email, data.password, {
      name: data.name,
      role: data.role,
      phone: data.phone,
      preferences: data.role === "buyer" ? data.preferences : undefined,
    });

    if (authError) {
      setError(authError);
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
  };

  const steps = [
    <RoleSelection
      key="role"
      selected={data.role}
      onSelect={(role) => {
        updateData({ role });
        setStep(1);
      }}
    />,
    <ProfileForm
      key="profile"
      data={data}
      onChange={updateData}
      onBack={() => setStep(0)}
      onNext={() => setStep(data.role === "buyer" ? 2 : -1)}
      onComplete={data.role !== "buyer" ? handleComplete : undefined}
      submitting={submitting}
      error={error}
    />,
    data.role === "buyer" && (
      <PreferenceWizard
        key="prefs"
        preferences={data.preferences}
        onChange={(prefs) => updateData({ preferences: prefs })}
        onBack={() => setStep(1)}
        onComplete={handleComplete}
        submitting={submitting}
        error={error}
      />
    ),
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* Progress indicator */}
      <div className="mb-8 flex items-center gap-2" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length}>
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-[var(--motion-ui)] ${
              i <= step ? "bg-[var(--color-accent)]" : "bg-[var(--muted)]"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {steps[step]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
