"use client";

import type { ReactNode } from "react";
import { useChangeFlash } from "@/lib/useLiveData";

/** A monospace numeric value that briefly flashes when it changes. */
export function LiveNum({
  value,
  display,
  className = "",
  color,
}: {
  value: number | string;
  display: string;
  className?: string;
  color?: string;
}) {
  const flash = useChangeFlash(value);
  return (
    <span
      className={`tnum font-mono ${flash ? "animate-flash" : ""} ${className}`}
      style={color ? { color } : undefined}
    >
      {display}
    </span>
  );
}

/** A small swatch dot. */
export function Dot({ color, className = "" }: { color: string; className?: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${className}`}
      style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}66` }}
    />
  );
}

/** Key → value definition row. */
export function Stat({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${className}`}>
      <span className="text-[11px] text-ink-3">{label}</span>
      <span className="tnum font-mono text-sm text-ink-1">{children}</span>
    </div>
  );
}

/** Thin horizontal divider. */
export function Rule() {
  return <div className="my-3 h-px w-full bg-edge" />;
}
