"use client";

import type { Latest } from "@/lib/types";
import { pct, timeFromIso } from "@/lib/format";
import { LiveNum } from "@/components/ui/atoms";

export function Header({ latest }: { latest: Latest }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-edge pb-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-1">
            GOTHAM
          </h1>
          <span className="hidden h-5 w-px bg-edge-strong sm:block" />
          <p className="hidden text-xs uppercase tracking-[0.16em] text-ink-3 sm:block">
            Inteligencia Electoral · 2da Vuelta Perú 2026
          </p>
        </div>
        <p className="mt-1 text-[11px] text-ink-3 sm:hidden">
          Inteligencia Electoral · 2da Vuelta Perú 2026
        </p>
      </div>

      <div className="flex items-center gap-5">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.16em] text-ink-3">
            Actas contabilizadas
          </div>
          <LiveNum
            value={latest.count.actasContabilizadasPct}
            display={pct(latest.count.actasContabilizadasPct, 2)}
            className="text-lg text-ink-1"
          />
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.16em] text-ink-3">
            Generado
          </div>
          <div className="tnum font-mono text-lg text-ink-1">
            {timeFromIso(latest.generatedAt)}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-edge-strong bg-surface-1 px-3 py-1.5">
          <span className="h-2 w-2 animate-pulseDot rounded-full bg-accent-rose shadow-[0_0_10px_#FF7A8A]" />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-1">
            En vivo
          </span>
        </div>
      </div>
    </header>
  );
}
