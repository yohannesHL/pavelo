/**
 * Feedback Thumbs Component (S9-08)
 *
 * Thumbs up/down on agent responses in chat UI.
 * Also supports correction input ("That's not right").
 */

"use client";

import { useState } from "react";

interface FeedbackThumbsProps {
  messageId: string;
  onSubmit?: (data: { messageId: string; rating: number; correction?: string }) => void;
}

export function FeedbackThumbs({ messageId, onSubmit }: FeedbackThumbsProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correction, setCorrection] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleRate = (value: number) => {
    setRating(value);
    if (value <= 2) {
      setShowCorrection(true);
    } else {
      // Submit immediately for positive
      onSubmit?.({ messageId, rating: value });
      setSubmitted(true);
    }
  };

  const handleSubmitCorrection = () => {
    if (rating) {
      onSubmit?.({ messageId, rating, correction: correction || undefined });
      setSubmitted(true);
      setShowCorrection(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
        <span>{rating && rating >= 4 ? "👍" : "👎"}</span>
        <span>Thanks for the feedback</span>
      </div>
    );
  }

  return (
    <div className="feedback-thumbs">
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleRate(5)}
          className={`rounded-md p-1 text-sm transition-all hover:bg-emerald-50 hover:scale-110 ${
            rating === 5 ? "bg-emerald-50 scale-110" : ""
          }`}
          title="Helpful"
          aria-label="Thumbs up"
        >
          👍
        </button>
        <button
          onClick={() => handleRate(1)}
          className={`rounded-md p-1 text-sm transition-all hover:bg-red-50 hover:scale-110 ${
            rating === 1 ? "bg-red-50 scale-110" : ""
          }`}
          title="Not helpful"
          aria-label="Thumbs down"
        >
          👎
        </button>
      </div>

      {/* Correction Input */}
      {showCorrection && (
        <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-2.5">
          <p className="mb-1.5 text-[10px] font-medium text-[var(--muted-foreground)]">
            What was incorrect? (optional)
          </p>
          <textarea
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder="Tell us what was wrong..."
            rows={2}
            className="w-full rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[var(--color-accent)]/30 resize-none"
          />
          <div className="mt-1.5 flex gap-1.5">
            <button
              onClick={handleSubmitCorrection}
              className="rounded-md bg-[var(--color-accent)] px-3 py-1 text-[10px] font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Submit
            </button>
            <button
              onClick={() => { setShowCorrection(false); setRating(null); }}
              className="rounded-md px-3 py-1 text-[10px] text-[var(--muted-foreground)] hover:bg-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
