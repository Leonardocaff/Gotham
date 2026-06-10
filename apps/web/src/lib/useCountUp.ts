"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tweens a number from its previous value to `target` over `duration` ms using
 * requestAnimationFrame. On mount it counts up from 0; on subsequent changes it
 * eases from the last displayed value to the new one. No deps, lean by design.
 *
 * Returns the live (rounded) value to render. Pair with `tnum font-mono`.
 */
export function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    // Respect users who ask for reduced motion — snap straight to the target.
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    if (from === target) return;
    startRef.current = 0;

    const tick = (now: number) => {
      if (startRef.current === 0) startRef.current = now;
      const t = Math.min(1, (now - startRef.current) / duration);
      // easeOutExpo — fast lead-in, gentle settle. Feels cinematic.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(from + (target - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      // Lock in current displayed value as the next animation's origin.
      fromRef.current = value;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}
