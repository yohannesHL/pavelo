"use client";

/**
 * RecordingConsent — Session recording consent checkbox (S6-10)
 *
 * GDPR-compliant consent flow for voice session recording.
 * Must be checked before starting a voice session if recording is enabled.
 */

import { Shield } from "lucide-react";

interface RecordingConsentProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function RecordingConsent({
  checked,
  onChange,
  className = "",
}: RecordingConsentProps) {
  return (
    <label
      className={`
        flex items-start gap-3 cursor-pointer
        text-white/50 hover:text-white/70 transition-colors
        ${className}
      `}
    >
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div
          className="
            h-5 w-5 rounded border-2
            border-white/30 peer-checked:border-[#F4A261]
            peer-checked:bg-[#F4A261]
            transition-all duration-200
            flex items-center justify-center
          "
        >
          {checked && (
            <svg
              className="h-3 w-3 text-[#0D1B2A]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
      <div className="flex items-start gap-2">
        <Shield className="h-4 w-4 shrink-0 mt-0.5 text-white/30" />
        <span className="text-xs leading-relaxed">
          I consent to session recording for quality improvement.
          No audio is stored — only text transcripts may be retained.
        </span>
      </div>
    </label>
  );
}
