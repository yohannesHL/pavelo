"use client";

/**
 * ChatPropertyCarousel — horizontal scroll carousel of property cards (S5-08)
 *
 * Uses CSS scroll-snap for smooth horizontal scrolling
 * (avoiding Embla dependency weight — can upgrade later if needed)
 */

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ChatPropertyCard } from "./chat-property-card";

interface ChatPropertyCarouselProps {
  properties: Array<{
    id: string;
    title: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    squareFeet?: number;
    propertyType: string;
    address?: string;
    city?: string;
    postcode?: string;
    images?: string[];
    features?: string[];
  }>;
  title?: string;
}

export function ChatPropertyCarousel({
  properties,
  title,
}: ChatPropertyCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 280;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (properties.length === 0) return null;

  if (properties.length === 1) {
    return (
      <div className="max-w-xs">
        <ChatPropertyCard property={properties[0]} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        {title && (
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {title}
          </p>
        )}
        <div className="flex gap-1">
          <button
            onClick={() => scroll("left")}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {properties.map((property) => (
          <div
            key={property.id}
            className="w-64 shrink-0 snap-start"
          >
            <ChatPropertyCard property={property} />
          </div>
        ))}
      </div>
    </div>
  );
}
