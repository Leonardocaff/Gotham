"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/** Width presets. Most modules read fine in the default column; the wide ones
 * (tables, charts, prose, the geo drill) get more room. */
export type ModalWidth = "default" | "wide";

const WIDTH: Record<ModalWidth, string> = {
  default: "sm:max-w-[560px]",
  wide: "sm:max-w-[820px]",
};

/**
 * The translucent command modal. One open at a time.
 *
 * Desktop: a glass card floating dead-centre over the globe. The planet stays
 * faintly visible behind a subtle scrim so it still reads as the stage.
 * Mobile: a bottom sheet (rounded top, grab handle) that rises into view.
 *
 * Closes on Esc, on backdrop click, and on the X. Body scroll is locked while
 * open. All motion respects prefers-reduced-motion (handled in globals.css).
 */
export function Modal({
  title,
  width = "default",
  onClose,
  children,
}: {
  title: string;
  width?: ModalWidth;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Esc to close + body scroll lock.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Scrim — light enough that the planet still reads behind it. */}
      <div
        className="animate-scrimIn absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel — bottom sheet on phones, centred glass card on desktop. */}
      <div
        className={[
          "modal-glass animate-sheetIn sm:animate-modalIn",
          "relative z-10 flex w-full flex-col",
          "max-h-[88vh] sm:max-h-[85vh]",
          "rounded-t-2xl sm:rounded-2xl",
          WIDTH[width],
        ].join(" ")}
      >
        {/* mobile grab handle */}
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-edge-strong sm:hidden" />

        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-3 sm:pt-4">
          <h2 className="truncate font-display text-sm font-medium uppercase tracking-[0.16em] text-ink-1">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-edge text-ink-3 transition-colors hover:border-edge-strong hover:text-ink-1 active:bg-surface-3"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        <div className="mx-5 h-px shrink-0 bg-edge" />

        {/* Body — scrolls internally; .modal-unframe strips the panel's own
            glass chrome so it reads as raw content in the single modal shell. */}
        <div className="modal-unframe min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
