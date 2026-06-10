"use client";

import type { Latest } from "@/lib/types";
import { int } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";

const PARTS = [
  { key: "muestreo_votos", label: "Muestreo", color: "#4A9EFF", note: "ruido estadístico" },
  { key: "deriva_votos", label: "Deriva", color: "#9B7AFF", note: "supuesto de tendencia" },
  { key: "impugnadas_votos", label: "Impugnadas", color: "#FFB43C", note: "riesgo legal" },
] as const;

export function Uncertainty({ latest }: { latest: Latest }) {
  const sd = latest.projection.sd_components;
  const total = PARTS.reduce((acc, p) => acc + sd[p.key], 0);
  const max = Math.max(...PARTS.map((p) => sd[p.key]));
  // Combined sigma (sources are independent → add in quadrature), the headline.
  const sigma = Math.round(
    Math.sqrt(PARTS.reduce((acc, p) => acc + sd[p.key] ** 2, 0)),
  );
  const top = PARTS.find((p) => sd[p.key] === max)!;

  return (
    <Panel
      title="Descomposición de incertidumbre"
      hint="Desviación estándar del margen (votos), por fuente"
      aside={
        <span className="tnum rounded-md border border-edge bg-surface-3 px-2 py-0.5 font-mono text-[10px] text-ink-2">
          σ ≈ {int(sigma)}
        </span>
      }
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
          const share = (sd[p.key] / total) * 100;
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
              <span className="tnum w-10 text-right font-mono text-[10px] text-ink-3">
                {share.toFixed(0)}%
              </span>
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
      <p className="mt-3 border-t border-edge pt-3 text-[11px] leading-snug text-ink-3">
        La mayor fuente es{" "}
        <span style={{ color: top.color }}>{top.label.toLowerCase()}</span> (
        {((max / total) * 100).toFixed(0)}% del total) — {top.note}.
      </p>
    </Panel>
  );
}
