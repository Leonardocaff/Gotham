"use client";

import type { Latest } from "@/lib/types";
import { int, pct } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";

const SEGMENTS = [
  { key: "actasContabilizadasPct", label: "Contabilizadas", color: "#3DD9A0" },
  { key: "actasEnJeePct", label: "Observadas / JEE", color: "#FFB43C" },
  { key: "actasPendientesPct", label: "Pendientes", color: "#9B7AFF" },
] as const;

export function ActasComposition({ latest }: { latest: Latest }) {
  const { count, projection } = latest;
  const pools = projection.contested.pools;

  return (
    <Panel
      title="Composición de actas"
      hint="Estado del padrón de actas — y los votos aún en disputa"
    >
      <div className="mb-2 flex h-4 w-full overflow-hidden rounded-md bg-surface-3">
        {SEGMENTS.map((s) => (
          <div
            key={s.key}
            className="h-full"
            style={{
              width: `${count[s.key]}%`,
              backgroundColor: s.color,
            }}
            title={`${s.label}: ${pct(count[s.key], 2)}`}
          />
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1.5">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[11px] text-ink-2">{s.label}</span>
            <span className="tnum font-mono text-[11px] text-ink-3">
              {pct(count[s.key], 2)}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-edge bg-surface-2 p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.12em] text-accent-gold">
            En disputa
          </span>
          <span className="tnum font-mono text-lg text-accent-gold">
            {int(pools.observadas_votos)}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-ink-3">
          {int(pools.observadas_actas)} actas observadas — el margen proyectado
          es menor que este pool.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 font-mono text-[11px] tnum">
          <div className="rounded-md border border-edge bg-surface-3 p-2">
            <div className="text-ink-3">Doméstico obs.</div>
            <div className="text-ink-1">{int(pools.domestico.observadas_votos)}</div>
            <div className="mt-0.5 text-ink-3">
              + pend. {int(pools.domestico.pendientes_votos)}
            </div>
          </div>
          <div className="rounded-md border border-edge bg-surface-3 p-2">
            <div className="text-ink-3">Exterior obs.</div>
            <div className="text-ink-1">{int(pools.exterior.observadas_votos)}</div>
            <div className="mt-0.5 text-ink-3">
              + pend. {int(pools.exterior.pendientes_votos)}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
