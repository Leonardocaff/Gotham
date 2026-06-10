// Color helpers for choropleth + leader theming.
import { CANDIDATE_COLOR, type CandidateKey } from "./types";

/** Clamp helper. */
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Parse #RRGGBB to [r,g,b]. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/**
 * Leader color, mixed toward the canvas as the margin shrinks — so a 50/50
 * department is dim and a landslide is fully saturated.
 * @param leader  who leads
 * @param marginPct absolute margin in percentage points (0–100)
 */
export function leaderColor(leader: CandidateKey, marginPct: number): string {
  const base = hexToRgb(CANDIDATE_COLOR[leader]);
  // map 0..40pp margin → intensity 0.25..1.0
  const intensity = clamp(0.25 + (Math.abs(marginPct) / 40) * 0.75, 0.25, 1);
  const canvas = hexToRgb("#0A0A0C");
  const mix = (i: number) => canvas[i] + (base[i] - canvas[i]) * intensity;
  return rgbToHex(mix(0), mix(1), mix(2));
}

/** rgba string with given alpha for a candidate. */
export function leaderRgba(leader: CandidateKey, alpha: number): string {
  const [r, g, b] = hexToRgb(CANDIDATE_COLOR[leader]);
  return `rgba(${r},${g},${b},${alpha})`;
}
