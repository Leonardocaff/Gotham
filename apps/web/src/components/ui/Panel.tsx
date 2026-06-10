import type { ReactNode } from "react";

interface PanelProps {
  title?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
  /** small right-aligned slot in the header (e.g. a legend or value) */
  aside?: ReactNode;
  /**
   * Idle-float stagger slot (0–5). When set the card gently drifts vertically
   * with a per-slot delay so the grid feels alive. Disabled under
   * prefers-reduced-motion (handled in globals.css).
   */
  floatDelay?: 0 | 1 | 2 | 3 | 4 | 5;
}

/** Glass card with a hairline header. The atomic unit of the console. */
export function Panel({
  title,
  hint,
  className = "",
  children,
  aside,
  floatDelay,
}: PanelProps) {
  const float =
    floatDelay !== undefined ? ` idle-float fl-${floatDelay}` : "";
  return (
    <section
      className={`glass lift flex flex-col p-4 sm:p-5 animate-fadeUp${float} ${className}`}
    >
      {(title || aside) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-2">
                {title}
              </h3>
            )}
            {hint && (
              <p className="mt-1 text-[11px] leading-snug text-ink-3">{hint}</p>
            )}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Section eyebrow label. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-3">
      {children}
    </span>
  );
}
