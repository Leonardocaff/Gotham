"use client";

import type { LucideIcon } from "lucide-react";

/** One rail entry. `group` is used only to draw thin dividers between clusters
 * (proyección / incertidumbre / geografía / IA+método). */
export interface RailItem {
  id: string;
  label: string;
  icon: LucideIcon;
  group: string;
  accent?: string;
}

function RailButton({
  item,
  active,
  onClick,
}: {
  item: RailItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      aria-label={item.label}
      title={item.label}
      className={[
        "group relative grid h-10 w-10 shrink-0 place-items-center rounded-xl",
        "transition-colors duration-200",
        active
          ? "bg-surface-3 text-ink-1"
          : "text-ink-3 hover:bg-surface-3/60 hover:text-ink-1",
      ].join(" ")}
    >
      {/* active accent rail tick (desktop only) */}
      <span
        className={[
          "absolute -left-[7px] top-1/2 hidden h-5 w-[2px] -translate-y-1/2 rounded-full lg:block",
          active ? "opacity-100" : "opacity-0",
        ].join(" ")}
        style={{ backgroundColor: item.accent ?? "var(--cyan)" }}
      />
      <Icon size={18} strokeWidth={1.75} />

      {/* Desktop tooltip — appears to the right on hover. */}
      <span
        className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-10 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-edge-strong bg-[rgba(12,12,16,0.92)] px-2.5 py-1.5 text-[11px] font-medium text-ink-1 opacity-0 shadow-lg backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100 lg:block"
      >
        {item.label}
      </span>
    </button>
  );
}

/**
 * The module rail. Desktop: a compact vertical glass spine on the left edge of
 * the stage, entries grouped by thin dividers. Mobile: a horizontally scrollable
 * glass bar pinned to the bottom of the stage. Clicking an entry summons its
 * module modal.
 */
export function IconRail({
  items,
  activeId,
  onSelect,
}: {
  items: RailItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  // Pre-compute where group boundaries fall so we can drop dividers between
  // clusters without coupling to a fixed shape.
  const withDivider = items.map((item, i) => ({
    item,
    divider: i > 0 && items[i - 1].group !== item.group,
  }));

  return (
    <>
      {/* ── Desktop: vertical spine, left edge of the stage ── */}
      <nav className="rail-glass animate-fadeUp absolute left-3 top-1/2 z-30 hidden max-h-[calc(100%-2rem)] -translate-y-1/2 flex-col items-center gap-1 overflow-y-auto rounded-2xl p-1.5 lg:flex">
        {withDivider.map(({ item, divider }) => (
          <div key={item.id} className="contents">
            {divider && <span className="my-1 h-px w-6 bg-edge" />}
            <RailButton
              item={item}
              active={activeId === item.id}
              onClick={() => onSelect(item.id)}
            />
          </div>
        ))}
      </nav>

      {/* ── Mobile: horizontally scrollable bottom bar ── */}
      <nav className="rail-glass absolute inset-x-2 bottom-2 z-30 flex items-center gap-1 overflow-x-auto rounded-2xl px-1.5 py-1.5 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {withDivider.map(({ item, divider }) => (
          <div key={item.id} className="flex shrink-0 items-center">
            {divider && <span className="mx-1 h-6 w-px bg-edge" />}
            <RailButton
              item={item}
              active={activeId === item.id}
              onClick={() => onSelect(item.id)}
            />
          </div>
        ))}
      </nav>
    </>
  );
}
