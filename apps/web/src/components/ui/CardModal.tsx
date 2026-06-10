"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Small expand affordance — opens a card's content in a large modal. */
export function ExpandButton({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label="Ampliar"
      className={`rounded-md border border-edge p-1 text-ink-3 transition-colors hover:border-edge-strong hover:text-ink-1 ${className}`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
      </svg>
    </button>
  );
}

/** Large translucent modal for an expanded card. Esc / scrim / ✕ to close. */
export function CardModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <div className="animate-[scrimIn_.2s_ease-out] absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="modal-glass animate-[modalScaleIn_.24s_cubic-bezier(.2,.8,.2,1)] relative z-[1] flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-edge px-5 py-4">
          {title && (
            <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink-1">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="ml-auto shrink-0 rounded-md border border-edge px-2 py-1 text-[12px] text-ink-3 transition-colors hover:border-edge-strong hover:text-ink-1"
          >
            ✕
          </button>
        </div>
        <div className="modal-unframe overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
