"use client";

/**
 * Step 1: Address Lookup (S8-03)
 * Postcode search → select address
 */

import { useState, useCallback } from "react";
import type { SellerFormData } from "@/app/sell/page";

interface Props {
  formData: SellerFormData;
  onUpdate: (updates: Partial<SellerFormData>) => void;
}

// Demo addresses for postcode lookup simulation
const DEMO_ADDRESSES: Record<string, string[]> = {
  SW11: [
    "12 Lavender Hill, Battersea",
    "34 St John's Road, Battersea",
    "7 Wandsworth Road, Battersea",
    "89 Falcon Road, Battersea",
  ],
  SE22: [
    "15 Lordship Lane, East Dulwich",
    "42 Barry Road, East Dulwich",
    "8 Grove Vale, East Dulwich",
  ],
};

export function SellerStepAddress({ formData, onUpdate }: Props) {
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handlePostcodeSearch = useCallback(
    async (postcode: string) => {
      onUpdate({ postcode });
      if (postcode.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      // Simulate API call — in production: call postcode.io or Ordnance Survey
      await new Promise((r) => setTimeout(r, 500));

      const prefix = postcode.toUpperCase().replace(/\s/g, "").slice(0, 4);
      const results = DEMO_ADDRESSES[prefix] || [
        `1 ${postcode} High Street`,
        `23 ${postcode} Station Road`,
        `45 ${postcode} Church Lane`,
      ];
      setSearchResults(results);
      setIsSearching(false);
    },
    [onUpdate]
  );

  const handleSelectAddress = useCallback(
    (address: string) => {
      const parts = address.split(", ");
      onUpdate({
        addressLine1: parts[0] || address,
        city: parts[1] || "",
      });
      setSearchResults([]);
    },
    [onUpdate]
  );

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-6 shadow-sm">
      <h2 className="font-[var(--font-heading)] text-xl font-bold text-[var(--foreground)]">
        Where is your property?
      </h2>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Enter your postcode to find your address.
      </p>

      {/* Postcode Search */}
      <div className="mt-6">
        <label
          htmlFor="postcode"
          className="block text-sm font-medium text-[var(--foreground)]"
        >
          Postcode
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="postcode"
            type="text"
            value={formData.postcode}
            onChange={(e) => handlePostcodeSearch(e.target.value.toUpperCase())}
            placeholder="e.g. SW11 1AA"
            className="flex-1 rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2.5 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
            autoFocus
          />
          <button
            onClick={() => handlePostcodeSearch(formData.postcode)}
            disabled={isSearching || formData.postcode.length < 3}
            className="rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-50"
          >
            {isSearching ? "Searching..." : "Find"}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mt-3 rounded-[var(--radius-input)] border border-[var(--border)] bg-white overflow-hidden">
          {searchResults.map((addr) => (
            <button
              key={addr}
              onClick={() => handleSelectAddress(addr)}
              className={`w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--color-primary)]/5 border-b border-[var(--border)] last:border-0 ${
                formData.addressLine1 === addr.split(", ")[0]
                  ? "bg-[var(--color-primary)]/5 text-[var(--color-primary)] font-medium"
                  : "text-[var(--foreground)]"
              }`}
            >
              {addr}
            </button>
          ))}
          <button
            onClick={() => setSearchResults([])}
            className="w-full px-3 py-2 text-left text-xs text-[var(--color-accent)] hover:underline"
          >
            Enter address manually
          </button>
        </div>
      )}

      {/* Manual Address Fields */}
      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="addr1" className="block text-sm font-medium text-[var(--foreground)]">
            Address Line 1
          </label>
          <input
            id="addr1"
            type="text"
            value={formData.addressLine1}
            onChange={(e) => onUpdate({ addressLine1: e.target.value })}
            placeholder="Street address"
            className="mt-1 w-full rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2.5 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
          />
        </div>
        <div>
          <label htmlFor="addr2" className="block text-sm font-medium text-[var(--foreground)]">
            Address Line 2 <span className="text-[var(--muted-foreground)]">(optional)</span>
          </label>
          <input
            id="addr2"
            type="text"
            value={formData.addressLine2}
            onChange={(e) => onUpdate({ addressLine2: e.target.value })}
            className="mt-1 w-full rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2.5 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-[var(--foreground)]">
              City / Town
            </label>
            <input
              id="city"
              type="text"
              value={formData.city}
              onChange={(e) => onUpdate({ city: e.target.value })}
              className="mt-1 w-full rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2.5 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
            />
          </div>
          <div>
            <label htmlFor="county" className="block text-sm font-medium text-[var(--foreground)]">
              County <span className="text-[var(--muted-foreground)]">(optional)</span>
            </label>
            <input
              id="county"
              type="text"
              value={formData.county}
              onChange={(e) => onUpdate({ county: e.target.value })}
              className="mt-1 w-full rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2.5 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
