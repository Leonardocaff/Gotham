"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
  /**
   * When true, the card shows an expand control that opens its content in a
   * large translucent modal — for data/chart panels that want room to breathe.
   */
  expandable?: boolean;
}

function ExpandIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

/** Glass card with a hairline header. The atomic unit of the console. */
export function Panel({
  title,
  hint,
  className = "",
  children,
  aside,
  floatDelay,
  expandable = true,
}: PanelProps) {
  const [open, setOpen] = useState(false);
  const float = floatDelay !== undefined ? ` idle-float fl-${floatDelay}` : "";

  // Lock body scroll + close on Escape while the modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const header = (title || aside || expandable) && (
    <header className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {title && (
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-2">
            {title}
          </h3>
        )}
        {hint && <p className="mt-1 text-[11px] leading-snug text-ink-3">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {aside}
        {expandable && (
          <button
            onClick={() => setOpen(true)}
            aria-label="Ampliar"
            className="rounded-md border border-edge p-1 text-ink-3 transition-colors hover:border-edge-strong hover:text-ink-1"
          >
            <ExpandIcon />
          </button>
        )}
      </div>
    </header>
  );

  return (
    <>
      <section
        className={`glass lift flex flex-col p-4 sm:p-5 animate-fadeUp${float} ${className}`}
      >
        {header}
        {children}
      </section>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
            onClick={() => setOpen(false)}
          >
            <div className="animate-[scrimIn_.2s_ease-out] absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
              className="modal-glass animate-[modalScaleIn_.24s_cubic-bezier(.2,.8,.2,1)] relative z-[1] flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-edge px-5 py-4">
                <div className="min-w-0">
                  {title && (
                    <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink-1">
                      {title}
                    </h3>
                  )}
                  {hint && <p className="mt-1 text-[11px] leading-snug text-ink-3">{hint}</p>}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  className="shrink-0 rounded-md border border-edge px-2 py-1 text-[12px] text-ink-3 transition-colors hover:border-edge-strong hover:text-ink-1"
                >
                  ✕
                </button>
              </div>
              <div className="modal-unframe overflow-y-auto px-5 py-5">{children}</div>
            </div>
          </div>,
          document.body,
        )}
    </>
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
