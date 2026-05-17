/**
 * VoiceLatencyMonitor (S10-03)
 *
 * Displays real-time voice pipeline latency breakdown:
 *   STT → Agent → TTS timing per turn.
 * Target: < 800ms end-to-end.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

interface LatencyTurn {
  turn: number;
  stt_ms: number;
  agent_ms: number;
  tts_ms: number;
  total_ms: number;
  e2e_ms: number;
}

interface LatencyMetrics {
  session_id: string;
  turn_count: number;
  avg_e2e_ms: number | null;
  p50_e2e_ms: number | null;
  p95_e2e_ms: number | null;
  avg_stt_ms: number | null;
  avg_agent_ms: number | null;
  avg_tts_ms: number | null;
  under_target: string | null;
  turns: LatencyTurn[];
}

const TARGET_MS = 800;

function LatencyBar({ label, ms, color, maxMs }: { label: string; ms: number; color: string; maxMs: number }) {
  const pct = maxMs > 0 ? Math.min((ms / maxMs) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-right text-[10px] font-medium text-[var(--muted-foreground)]">{label}</span>
      <div className="flex-1 h-4 rounded bg-[var(--muted)] overflow-hidden">
        <div
          className="h-full rounded transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="w-16 text-right text-xs font-semibold"
        style={{ fontFamily: "var(--font-data)", color: ms > TARGET_MS ? "var(--color-error)" : color }}
      >
        {ms.toFixed(0)}ms
      </span>
    </div>
  );
}

export function VoiceLatencyMonitor({
  sessionId,
  isLive = false,
}: {
  sessionId?: string;
  isLive?: boolean;
}) {
  const [metrics, setMetrics] = useState<LatencyMetrics | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchMetrics = useCallback(async () => {
    // In production: fetch from voice.getLatencyMetrics tRPC endpoint
    // For now, generate demo metrics based on session state
    if (!sessionId) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(
        `${apiUrl}/trpc/voice.getMetrics?input=${encodeURIComponent(
          JSON.stringify({ json: { sessionId } })
        )}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data?.result?.data) {
          setMetrics(data.result.data);
        }
      }
    } catch {
      // Silently fail — latency monitor is informational
    }
  }, [sessionId]);

  useEffect(() => {
    if (isLive && sessionId) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 2000);
      return () => clearInterval(interval);
    }
  }, [isLive, sessionId, fetchMetrics]);

  // Demo metrics when no live data
  const displayMetrics = metrics || {
    session_id: sessionId || "demo",
    turn_count: 0,
    avg_e2e_ms: null,
    p50_e2e_ms: null,
    p95_e2e_ms: null,
    avg_stt_ms: null,
    avg_agent_ms: null,
    avg_tts_ms: null,
    under_target: null,
    turns: [],
  };

  const latestTurn = displayMetrics.turns[displayMetrics.turns.length - 1];
  const maxMs = latestTurn
    ? Math.max(latestTurn.stt_ms, latestTurn.agent_ms, latestTurn.tts_ms, TARGET_MS)
    : TARGET_MS;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
        aria-expanded={expanded}
        aria-label="Toggle latency monitor details"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">⚡</span>
          <h4 className="text-xs font-semibold text-[#0D1B2A]">Voice Latency</h4>
          {displayMetrics.avg_e2e_ms !== null && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                displayMetrics.avg_e2e_ms < TARGET_MS
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              avg {displayMetrics.avg_e2e_ms.toFixed(0)}ms
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--muted-foreground)]">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Turns", value: displayMetrics.turn_count },
              { label: "Avg E2E", value: displayMetrics.avg_e2e_ms ? `${displayMetrics.avg_e2e_ms.toFixed(0)}ms` : "—" },
              { label: "p95 E2E", value: displayMetrics.p95_e2e_ms ? `${displayMetrics.p95_e2e_ms.toFixed(0)}ms` : "—" },
              { label: "On Target", value: displayMetrics.under_target || "—" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-[var(--muted)] p-2 text-center">
                <p className="text-[10px] text-[var(--muted-foreground)]">{stat.label}</p>
                <p
                  className="text-sm font-bold text-[#0D1B2A]"
                  style={{ fontFamily: "var(--font-data)" }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Latest Turn Breakdown */}
          {latestTurn && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                Turn {latestTurn.turn} Breakdown
              </p>
              <LatencyBar label="STT" ms={latestTurn.stt_ms} color="#2E86AB" maxMs={maxMs} />
              <LatencyBar label="Agent" ms={latestTurn.agent_ms} color="#1B3A6B" maxMs={maxMs} />
              <LatencyBar label="TTS" ms={latestTurn.tts_ms} color="#F4A261" maxMs={maxMs} />
              <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                <span className="text-[10px] text-[var(--muted-foreground)]">End-to-End</span>
                <span
                  className={`text-xs font-bold ${
                    latestTurn.e2e_ms < TARGET_MS ? "text-emerald-600" : "text-red-600"
                  }`}
                  style={{ fontFamily: "var(--font-data)" }}
                >
                  {latestTurn.e2e_ms.toFixed(0)}ms
                  {latestTurn.e2e_ms < TARGET_MS ? " ✓" : ` (target: ${TARGET_MS}ms)`}
                </span>
              </div>
            </div>
          )}

          {/* Target Line */}
          <p className="text-[10px] text-[var(--muted-foreground)] text-center">
            Target: &lt;{TARGET_MS}ms end-to-end
          </p>
        </div>
      )}
    </div>
  );
}
