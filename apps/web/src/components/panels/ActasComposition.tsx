"use client";

import type { Latest } from "@/lib/types";
import { int, pct } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";

const SEGMENTS = [
  { key: "actasContabilizadasPct", label: "Contabilizadas", color: "#3DD9A0" },
  { key: "actasEnJeePct", label: "Observadas / JEE", color: "#FFB43C" },
  { key: "actasPendientesPct", label: "Pendientes", color: "#9B7AFF" },
] as const;

/** A compact completeness ring — % of actas counted. */
function Ring({ value }: { value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, value) / 100);
  return (
    <div className="relative h-[58px] w-[58px] shrink-0">
      <svg viewBox="0 0 58 58" className="h-full w-full -rotate-90">
        <circle cx="29" cy="29" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="5" />
        <circle
          cx="29"
          cy="29"
          r={r}
          fill="none"
          stroke="#3DD9A0"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 0.7s ease-out" }}
        />
      </svg>
      <span className="tnum absolute inset-0 grid place-items-center font-mono text-[11px] text-ink-1">
        {value.toFixed(0)}%
      </span>
    </div>
  );
}

export function ActasComposition({ latest }: { latest: Latest }) {
  const { count, projection } = latest;
  const pools = projection.contested.pools;
  const marginVotes = Math.abs(projection.final_margin.median_votes);
  // The pivotal comparison: is the disputed pool larger than the projected margin?
  const disputedExceedsMargin = pools.observadas_votos > marginVotes;

  return (
    <Panel
      title="Composición de actas"
      hint="Estado del padrón de actas — y los votos aún en disputa"
    >
      {/* Headline — completeness ring + the raw counts. */}
      <div className="mb-3 flex items-center gap-3 border-b border-edge pb-3">
        <Ring value={count.actasContabilizadasPct} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Actas contabilizadas
          </div>
          <div className="tnum font-mono text-sm text-ink-1">
            {int(count.contabilizadas)}{" "}
            <span className="text-ink-3">/ {int(count.totalActas)}</span>
          </div>
          <div className="tnum mt-0.5 font-mono text-[10px] text-ink-3">
            {pct(count.actasPendientesPct, 2)} pendientes · {pct(count.actasEnJeePct, 2)} en JEE
          </div>
        </div>
      </div>

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
          {int(pools.observadas_actas)} actas observadas — el pool en disputa es{" "}
          <span style={{ color: disputedExceedsMargin ? "#FFB43C" : "#3DD9A0" }}>
            {disputedExceedsMargin ? "mayor" : "menor"} que el margen proyectado
          </span>{" "}
          (~{int(marginVotes)} votos).
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
