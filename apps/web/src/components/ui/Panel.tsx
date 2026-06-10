import type { ReactNode } from "react";

interface PanelProps {
  title?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
  /** small right-aligned slot in the header (e.g. a legend or value) */
  aside?: ReactNode;
}

/** Glass card with a hairline header. The atomic unit of the console. */
export function Panel({ title, hint, className = "", children, aside }: PanelProps) {
  return (
    <section
      className={`glass lift flex flex-col p-4 sm:p-5 animate-fadeUp ${className}`}
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
