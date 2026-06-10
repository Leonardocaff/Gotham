"use client";

import type { Latest } from "@/lib/types";
import { int } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";

const PARTS = [
  { key: "muestreo_votos", label: "Muestreo", color: "#4A9EFF" },
  { key: "deriva_votos", label: "Deriva", color: "#9B7AFF" },
  { key: "impugnadas_votos", label: "Impugnadas", color: "#FFB43C" },
] as const;

export function Uncertainty({ latest }: { latest: Latest }) {
  const sd = latest.projection.sd_components;
  const total = PARTS.reduce((acc, p) => acc + sd[p.key], 0);
  const max = Math.max(...PARTS.map((p) => sd[p.key]));

  return (
    <Panel
      title="Descomposición de incertidumbre"
      hint="Desviación estándar del margen (votos), por fuente"
    >
      <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-surface-3">
        {PARTS.map((p) => (
          <div
            key={p.key}
            style={{
              width: `${(sd[p.key] / total) * 100}%`,
              backgroundColor: p.color,
            }}
            title={`${p.label}: ${int(sd[p.key])}`}
          />
        ))}
      </div>
      <div className="space-y-2">
        {PARTS.map((p) => {
          const isMax = sd[p.key] === max;
          return (
            <div key={p.key} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: p.color }}
              />
              <span className="w-24 text-xs text-ink-2">{p.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(sd[p.key] / max) * 100}%`,
                    backgroundColor: p.color,
                  }}
                />
              </div>
              <span className="tnum w-16 text-right font-mono text-xs text-ink-1">
                {int(sd[p.key])}
              </span>
              {isMax && (
                <span className="text-[10px] font-medium uppercase tracking-wide text-accent-gold">
                  máx
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-snug text-ink-3">
        La mayor fuente de incertidumbre son las actas{" "}
        <span className="text-accent-gold">impugnadas</span> — un riesgo legal,
        no estadístico.
      </p>
    </Panel>
  );
}
