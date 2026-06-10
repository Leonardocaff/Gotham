"use client";

import type { Stratum } from "@/lib/types";
import { CANDIDATE_COLOR } from "@/lib/types";
import { int, pct } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";

export function Strata({
  strata,
  onSelect,
  selectedCode,
}: {
  strata: Stratum[];
  onSelect: (s: Stratum) => void;
  selectedCode?: string;
}) {
  // sort by absolute margin, strongest first
  const rows = [...strata].sort(
    (a, b) =>
      Math.abs(b.pctSanchez - 50) - Math.abs(a.pctSanchez - 50),
  );

  return (
    <Panel
      title="Departamentos"
      hint="25 estratos domésticos — ordenados por intensidad del margen. Toca para enfocar."
    >
      <div className="max-h-[520px] space-y-0.5 overflow-y-auto pr-1">
        {rows.map((s) => {
          const sel = s.code === selectedCode;
          const color = CANDIDATE_COLOR[s.leader];
          const keikoPct = 100 - s.pctSanchez;
          return (
            <button
              key={s.code}
              onClick={() => onSelect(s)}
              className={`group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors active:bg-surface-3 sm:py-1.5 ${
                sel ? "bg-surface-3" : "hover:bg-surface-3/60"
              }`}
            >
              <span className="w-24 truncate text-xs text-ink-2 group-hover:text-ink-1 sm:w-28">
                {titleCase(s.name)}
              </span>
              <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                <div
                  style={{
                    width: `${s.pctSanchez}%`,
                    backgroundColor: CANDIDATE_COLOR.sanchez,
                  }}
                />
                <div
                  style={{
                    width: `${keikoPct}%`,
                    backgroundColor: CANDIDATE_COLOR.keiko,
                  }}
                />
              </div>
              <span
                className="tnum w-12 text-right font-mono text-[11px]"
                style={{ color }}
              >
                {pct(s.pctSanchez, 0)}
              </span>
              <span className="tnum hidden w-20 text-right font-mono text-[10px] text-ink-3 sm:inline">
                {int(s.votos.sanchez + s.votos.keiko)}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
