"use client";

/**
 * LanguageSelector — Voice language picker (S6-08)
 *
 * Dropdown for selecting voice conversation language.
 * Shows native language names alongside English names.
 */

import { Globe } from "lucide-react";

const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "zh", name: "Mandarin", nativeName: "中文" },
] as const;

interface LanguageSelectorProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
}

export function LanguageSelector({
  value,
  onChange,
  disabled = false,
  className = "",
}: LanguageSelectorProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Globe className="h-4 w-4 text-white/40" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="
          bg-white/10 text-white text-sm
          border border-white/20 rounded-lg
          px-3 py-1.5
          focus:outline-none focus:ring-2 focus:ring-[#F4A261]/50
          disabled:opacity-40 disabled:cursor-not-allowed
          appearance-none cursor-pointer
        "
        aria-label="Select voice language"
      >
        {LANGUAGES.map((lang) => (
          <option
            key={lang.code}
            value={lang.code}
            className="bg-[#0D1B2A] text-white"
          >
            {lang.nativeName} ({lang.name})
          </option>
        ))}
      </select>
    </div>
  );
}
