"use client";

/**
 * VoiceWaveform — Animated audio waveform visualiser (S6-05)
 *
 * Canvas-based waveform that reacts to audio levels.
 * Uses gold (#F4A261) bars on dark navy background.
 * Respects prefers-reduced-motion.
 */

import { useEffect, useRef, useCallback } from "react";

interface VoiceWaveformProps {
  audioLevel: number; // 0-1
  isActive: boolean;
  barCount?: number;
  className?: string;
}

export function VoiceWaveform({
  audioLevel,
  isActive,
  barCount = 32,
  className = "",
}: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const barsRef = useRef<number[]>(new Array(barCount).fill(0));
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const bars = barsRef.current;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Update bar heights
    const baseLevel = isActive ? 0.15 : 0.05;
    const targetLevel = isActive ? Math.max(audioLevel, baseLevel) : baseLevel;

    for (let i = 0; i < barCount; i++) {
      // Create organic-looking distribution
      const centerDist = Math.abs(i - barCount / 2) / (barCount / 2);
      const envelope = 1 - centerDist * 0.6;

      // Add randomness for natural look
      const noise = reducedMotionRef.current
        ? 0
        : (Math.random() - 0.5) * 0.3 * targetLevel;

      const target = targetLevel * envelope + noise;
      // Smooth interpolation
      bars[i] += (target - bars[i]) * (reducedMotionRef.current ? 1 : 0.15);
      bars[i] = Math.max(0.02, Math.min(1, bars[i]));
    }

    // Draw bars
    const barWidth = (width / barCount) * 0.6;
    const gap = (width / barCount) * 0.4;

    for (let i = 0; i < barCount; i++) {
      const barHeight = bars[i] * height * 0.8;
      const x = i * (barWidth + gap) + gap / 2;
      const y = (height - barHeight) / 2;

      // Gold gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, isActive ? "#F4A261" : "#F4A26140");
      gradient.addColorStop(0.5, isActive ? "#F6B87A" : "#F4A26130");
      gradient.addColorStop(1, isActive ? "#F4A261" : "#F4A26140");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }

    if (!reducedMotionRef.current) {
      animationRef.current = requestAnimationFrame(draw);
    }
  }, [audioLevel, isActive, barCount]);

  useEffect(() => {
    if (reducedMotionRef.current) {
      // Static render for reduced motion
      draw();
      return;
    }

    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full ${className}`}
      style={{ height: "80px" }}
      aria-label="Audio waveform visualiser"
      role="img"
    />
  );
}
