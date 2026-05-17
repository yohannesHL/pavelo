"use client";

/**
 * VoiceTranscription — Live transcription overlay (S6-05)
 *
 * Shows:
 * - Scrolling transcript of the conversation
 * - Interim (in-progress) STT results with visual distinction
 * - Speaker labels (user vs agent)
 * - Semi-transparent overlay, white text, Inter font
 */

import { useEffect, useRef } from "react";
import type { TranscriptEntry } from "@/hooks/use-voice-session";

interface VoiceTranscriptionProps {
  transcripts: TranscriptEntry[];
  currentInterim: string;
  className?: string;
}

export function VoiceTranscription({
  transcripts,
  currentInterim,
  className = "",
}: VoiceTranscriptionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, currentInterim]);

  if (transcripts.length === 0 && !currentInterim) {
    return (
      <div
        className={`flex items-center justify-center text-white/40 text-sm ${className}`}
      >
        <p>Transcription will appear here...</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={`overflow-y-auto space-y-3 scrollbar-hide ${className}`}
      role="log"
      aria-label="Voice transcription"
      aria-live="polite"
    >
      {transcripts.map((entry) => (
        <TranscriptLine key={entry.id} entry={entry} />
      ))}

      {currentInterim && (
        <div className="flex gap-2 items-start opacity-60">
          <span className="text-xs font-medium text-[#F4A261] uppercase tracking-wider mt-0.5 shrink-0">
            You
          </span>
          <p className="text-white/70 text-sm italic leading-relaxed">
            {currentInterim}
            <span className="inline-block w-1.5 h-4 bg-white/50 ml-0.5 animate-blink align-middle" />
          </p>
        </div>
      )}
    </div>
  );
}

function TranscriptLine({ entry }: { entry: TranscriptEntry }) {
  const isAgent = entry.speaker === "agent";

  return (
    <div className="flex gap-2 items-start">
      <span
        className={`text-xs font-medium uppercase tracking-wider mt-0.5 shrink-0 ${
          isAgent ? "text-[#2E86AB]" : "text-[#F4A261]"
        }`}
      >
        {isAgent ? "Xara" : "You"}
      </span>
      <p className="text-white/90 text-sm leading-relaxed">{entry.text}</p>
    </div>
  );
}
