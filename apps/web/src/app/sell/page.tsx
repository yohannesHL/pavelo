"use client";

/**
 * Seller Onboarding Flow — /sell (S8-03)
 *
 * Multi-step property submission wizard:
 * 1. Address lookup (postcode search → select address)
 * 2. Property details (type, beds, baths, sqft, year built)
 * 3. Photo upload (drag & drop, multi-file, preview grid)
 * 4. Description (AI-assisted generation)
 * 5. Review & submit
 *
 * Design: clean, professional, trust-building (navy + white)
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SellerStepAddress } from "@/components/seller/step-address";
import { SellerStepDetails } from "@/components/seller/step-details";
import { SellerStepPhotos } from "@/components/seller/step-photos";
import { SellerStepDescription } from "@/components/seller/step-description";
import { SellerStepReview } from "@/components/seller/step-review";

// --- Types ---

export interface SellerFormData {
  // Step 1: Address
  postcode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;

  // Step 2: Details
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  yearBuilt: number | null;
  tenure: string;
  epcRating: string;
  features: string[];

  // Step 3: Photos
  photos: File[];
  photoPreviewUrls: string[];

  // Step 4: Description
  description: string;
}

const INITIAL_FORM: SellerFormData = {
  postcode: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  county: "",
  propertyType: "",
  bedrooms: 3,
  bathrooms: 1,
  squareFeet: null,
  yearBuilt: null,
  tenure: "",
  epcRating: "",
  features: [],
  photos: [],
  photoPreviewUrls: [],
  description: "",
};

const STEPS = [
  { id: 1, label: "Address", icon: "📍" },
  { id: 2, label: "Details", icon: "🏠" },
  { id: 3, label: "Photos", icon: "📸" },
  { id: 4, label: "Description", icon: "✍️" },
  { id: 5, label: "Review", icon: "✅" },
];

export default function SellPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<SellerFormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const updateForm = useCallback(
    (updates: Partial<SellerFormData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const handleNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, 5));
  }, []);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    // In production: call tRPC property.create with formData
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setIsSubmitted(true);
  }, []);

  if (isSubmitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success)]/10">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="font-[var(--font-heading)] text-2xl font-bold text-[var(--foreground)]">
            Property Submitted!
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Your property has been submitted for review. Xara will generate a
            valuation report shortly.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <a
              href="/dashboard"
              className="rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-light)] transition-colors"
            >
              Go to Dashboard
            </a>
            <button
              onClick={() => {
                setFormData(INITIAL_FORM);
                setStep(1);
                setIsSubmitted(false);
              }}
              className="rounded-[var(--radius-input)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              Submit Another
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="font-[var(--font-heading)] text-3xl font-bold text-[var(--color-primary)]">
          Sell Your Property
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Get an instant AI valuation. Fill in your property details and Xara
          will do the rest.
        </p>
      </div>

      {/* Progress Steps */}
      <StepIndicator currentStep={step} steps={STEPS} />

      {/* Step Content */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              <SellerStepAddress formData={formData} onUpdate={updateForm} />
            )}
            {step === 2 && (
              <SellerStepDetails formData={formData} onUpdate={updateForm} />
            )}
            {step === 3 && (
              <SellerStepPhotos formData={formData} onUpdate={updateForm} />
            )}
            {step === 4 && (
              <SellerStepDescription formData={formData} onUpdate={updateForm} />
            )}
            {step === 5 && <SellerStepReview formData={formData} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="rounded-[var(--radius-input)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Back
        </button>

        <span className="text-xs text-[var(--muted-foreground)]">
          Step {step} of {STEPS.length}
        </span>

        {step < 5 ? (
          <button
            onClick={handleNext}
            className="rounded-[var(--radius-input)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-light)]"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-[var(--radius-input)] bg-[var(--color-gold)] px-5 py-2.5 text-sm font-bold text-[var(--color-primary)] transition-all hover:bg-[var(--color-gold-light)] disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Property ✨"}
          </button>
        )}
      </div>

      {/* Save Draft */}
      <div className="mt-4 text-center">
        <button className="text-xs text-[var(--muted-foreground)] hover:text-[var(--color-accent)] transition-colors underline">
          Save as draft
        </button>
      </div>
    </div>
  );
}

// --- Step Indicator ---

function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: { id: number; label: string; icon: string }[];
}) {
  return (
    <div className="flex items-center justify-center" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={steps.length}>
      {steps.map((s, idx) => (
        <div key={s.id} className="flex items-center">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all ${
              s.id < currentStep
                ? "bg-[var(--color-success)] text-white"
                : s.id === currentStep
                ? "bg-[var(--color-primary)] text-white shadow-md"
                : "bg-[var(--muted)] text-[var(--muted-foreground)]"
            }`}
          >
            {s.id < currentStep ? "✓" : s.icon}
          </div>
          <span
            className={`ml-2 hidden text-xs font-medium sm:inline ${
              s.id === currentStep
                ? "text-[var(--color-primary)]"
                : "text-[var(--muted-foreground)]"
            }`}
          >
            {s.label}
          </span>
          {idx < steps.length - 1 && (
            <div
              className={`mx-3 h-px w-8 sm:w-12 ${
                s.id < currentStep
                  ? "bg-[var(--color-success)]"
                  : "bg-[var(--border)]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
