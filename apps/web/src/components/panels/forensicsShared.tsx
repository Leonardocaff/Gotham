"use client";

import { useState } from "react";
import type { ForensicSignal } from "@/lib/types";

export const ACCENT = {
  NORMAL: "#3DD9A0",
  ATENCION: "#FFB43C",
  "N/A": "#909092",
} as const;

export function VerdictChip({ verdict, label }: { verdict: string; label?: string }) {
  const color =
    verdict === "ATENCION" || verdict === "REVISAR"
      ? "#FFB43C"
      : verdict === "N/A"
        ? "#909092"
        : "#3DD9A0";
  return (
    <span
      className="rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{ color, borderColor: `${color}55`, background: `${color}14` }}
    >
      {label ?? verdict}
    </span>
  );
}

/** Observed-vs-expected digit chart. Bars = observed share; the hairline tick
 * over each bar = the expected (Benford/uniform) share. Color = verdict. */
export function DigitChart({ signal }: { signal: ForensicSignal }) {
  const { observed, expected, domain, verdict } = signal;
  if (!observed.length) return null;
  const color = ACCENT[verdict as keyof typeof ACCENT] ?? "#909092";
  const max = Math.max(...observed, ...expected) * 1.15 || 1;
  const labels = domain ?? observed.map((_, i) => i);
  return (
    <div className="mt-2 flex items-end gap-[3px]" style={{ height: 44 }}>
      {observed.map((o, i) => {
        const e = expected[i] ?? 0;
        return (
          <div
            key={i}
            className="relative flex flex-1 flex-col items-center justify-end"
            style={{ height: "100%" }}
            title={`dígito ${labels[i]}: obs ${(o * 100).toFixed(1)}% · esp ${(e * 100).toFixed(1)}%`}
          >
            <div className="relative w-full" style={{ height: "100%" }}>
              <div
                className="absolute bottom-0 w-full rounded-sm"
                style={{ height: `${(o / max) * 100}%`, background: `${color}88` }}
              />
              <div
                className="absolute w-full"
                style={{ bottom: `${(e / max) * 100}%`, height: 1.5, background: "rgba(245,245,247,0.7)" }}
              />
            </div>
            <span className="mt-0.5 text-[8px] leading-none text-ink-3">{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

/** A digit-test row: label + p-value + verdict chip, the chart, and expandable
 * detail/caveat. Shared by the district and mesa forensic panels. */
export function SignalRow({ signal }: { signal: ForensicSignal }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-edge pt-2.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-[12px] text-ink-1">{signal.label}</span>
        <span className="flex items-center gap-2">
          {signal.pvalue !== null && (
            <span className="tnum font-mono text-[10px] text-ink-3">
              p={signal.pvalue < 0.001 ? "<0.001" : signal.pvalue.toFixed(3)}
            </span>
          )}
          <VerdictChip verdict={signal.verdict} />
        </span>
      </button>
      <DigitChart signal={signal} />
      {open && (
        <div className="mt-2 space-y-1">
          <p className="tnum font-mono text-[10px] text-ink-3">{signal.detail}</p>
          <p className="text-[10px] leading-snug text-ink-3">{signal.caveat}</p>
        </div>
      )}
    </div>
  );
}
