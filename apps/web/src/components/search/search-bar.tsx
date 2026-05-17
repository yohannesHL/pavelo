"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  suggestions?: string[];
  isLoading?: boolean;
}

const EXAMPLE_QUERIES = [
  "3 bed Victorian in Islington under 800k",
  "Modern flat with balcony near tube",
  "Family home with garden in Oxford",
  "Period cottage in the Cotswolds",
  "Penthouse with city views",
];

export function SearchBar({
  query,
  onQueryChange,
  onSearch,
  suggestions = [],
  isLoading = false,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = "search-suggestions-listbox";

  const displaySuggestions =
    suggestions.length > 0 ? suggestions : query.length === 0 ? EXAMPLE_QUERIES : [];

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      onQueryChange(suggestion);
      setShowSuggestions(false);
      setActiveIndex(-1);
      // Auto-trigger search
      setTimeout(onSearch, 50);
    },
    [onQueryChange, onSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (activeIndex >= 0 && displaySuggestions[activeIndex]) {
          handleSuggestionClick(displaySuggestions[activeIndex]);
        } else {
          onSearch();
        }
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setShowSuggestions(true);
        setActiveIndex((prev) =>
          prev < displaySuggestions.length - 1 ? prev + 1 : 0
        );
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : displaySuggestions.length - 1
        );
      }
    },
    [onSearch, activeIndex, displaySuggestions, handleSuggestionClick]
  );

  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
      setActiveIndex(-1);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  const isListboxOpen = showSuggestions && displaySuggestions.length > 0;
  const activeDescendant =
    activeIndex >= 0 ? `search-suggestion-${activeIndex}` : undefined;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <div
        className={`flex items-center gap-2 rounded-[var(--radius-card)] border-2 bg-white px-4 py-2 transition-all duration-[200ms] ease-out ${
          isFocused
            ? "border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/10"
            : "border-[var(--border)] shadow-[var(--shadow-sm)]"
        }`}
      >
        <Search className="h-5 w-5 shrink-0 text-[var(--muted-foreground)]" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Describe your ideal property…"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
          aria-label="Property search"
          role="combobox"
          aria-expanded={isListboxOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          aria-haspopup="listbox"
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            className="shrink-0 rounded-full p-1 hover:bg-[var(--muted)] transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-[var(--muted-foreground)]" />
          </button>
        )}
        <Button
          onClick={onSearch}
          size="sm"
          variant="accent"
          disabled={isLoading}
          className="shrink-0 gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search</span>
        </Button>
      </div>

      {/* Suggestions dropdown */}
      {isListboxOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-white shadow-lg"
        >
          <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            {query.length === 0 ? "Try searching for…" : "Suggestions"}
          </div>
          {displaySuggestions.map((suggestion, i) => (
            <button
              key={i}
              id={`search-suggestion-${i}`}
              role="option"
              aria-selected={activeIndex === i}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                activeIndex === i
                  ? "bg-[var(--muted)]"
                  : "hover:bg-[var(--muted)]"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSuggestionClick(suggestion);
              }}
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
