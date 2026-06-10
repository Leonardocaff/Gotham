"use client";

import type { Latest } from "@/lib/types";
import { CANDIDATE_COLOR } from "@/lib/types";
import { int, signedInt } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";

export function ManskiBounds({ latest }: { latest: Latest }) {
  const [lo, hi] = latest.projection.bounds.margin_votes;
  const median = latest.projection.final_margin.median_votes;
  const crossesZero = latest.projection.bounds.straddles_zero;
  // Half-width of the bound = the still-undetermined pool that can swing either way.
  const undetermined = Math.round((hi - lo) / 2);

  // symmetric scale around zero
  const extent = Math.max(Math.abs(lo), Math.abs(hi)) * 1.08;
  const toPct = (v: number) => ((v + extent) / (2 * extent)) * 100;

  const loP = toPct(lo);
  const hiP = toPct(hi);
  const medP = toPct(median);

  return (
    <Panel
      title="Cotas de Manski"
      hint="Rango de no-identificación del margen, sin supuestos de deriva"
      aside={
        <span
          className="rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          style={
            crossesZero
              ? { color: "#FF7A8A", borderColor: "#FF7A8A55", background: "#FF7A8A14" }
              : { color: "#3DD9A0", borderColor: "#3DD9A055", background: "#3DD9A014" }
          }
        >
          {crossesZero ? "abierto" : "cerrado"}
        </span>
      }
    >
      <div className="relative h-16 w-full">
        {/* baseline */}
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-edge" />
        {/* range bar */}
        <div
          className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full"
          style={{
            left: `${loP}%`,
            width: `${hiP - loP}%`,
            background:
              "linear-gradient(90deg, rgba(74,158,255,0.55), rgba(255,255,255,0.18) 50%, rgba(61,217,160,0.55))",
          }}
        />
        {/* zero line */}
        <div
          className="absolute top-2 bottom-2 w-px bg-accent-rose"
          style={{ left: "50%" }}
        />
        <span
          className="absolute -translate-x-1/2 text-[10px] font-medium uppercase tracking-wide text-accent-rose"
          style={{ left: "50%", top: 0 }}
        >
          0 · empate
        </span>
        {/* median marker */}
        <div
          className="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${medP}%`,
            backgroundColor:
              median >= 0 ? CANDIDATE_COLOR.sanchez : CANDIDATE_COLOR.keiko,
          }}
          title={`mediana ${signedInt(median)}`}
        />
        {/* endpoint labels */}
        <span
          className="tnum absolute bottom-0 font-mono text-[11px]"
          style={{ left: `${loP}%`, color: CANDIDATE_COLOR.keiko }}
        >
          {signedInt(lo)}
        </span>
        <span
          className="tnum absolute bottom-0 -translate-x-full font-mono text-[11px]"
          style={{ left: `${hiP}%`, color: CANDIDATE_COLOR.sanchez }}
        >
          {signedInt(hi)}
        </span>
      </div>

      {/* Quantified endpoints — the worst case for each side + the model's point. */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-edge bg-surface-3 px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-[0.12em] text-ink-3">
            Piso (todo Keiko)
          </div>
          <div className="tnum font-mono text-xs" style={{ color: CANDIDATE_COLOR.keiko }}>
            {signedInt(lo)}
          </div>
        </div>
        <div className="rounded-lg border border-edge bg-surface-3 px-2 py-1.5 text-center">
          <div className="text-[9px] uppercase tracking-[0.12em] text-ink-3">
            Mediana
          </div>
          <div
            className="tnum font-mono text-xs"
            style={{ color: median >= 0 ? CANDIDATE_COLOR.sanchez : CANDIDATE_COLOR.keiko }}
          >
            {signedInt(median)}
          </div>
        </div>
        <div className="rounded-lg border border-edge bg-surface-3 px-2 py-1.5 text-right">
          <div className="text-[9px] uppercase tracking-[0.12em] text-ink-3">
            Techo (todo Sánchez)
          </div>
          <div className="tnum font-mono text-xs" style={{ color: CANDIDATE_COLOR.sanchez }}>
            {signedInt(hi)}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-ink-3">
        ~<span className="tnum font-mono text-ink-2">{int(undetermined)}</span> votos
        del restante aún pueden ir a cualquier lado. El intervalo{" "}
        <span style={{ color: crossesZero ? "#FF7A8A" : "#909092" }}>
          {crossesZero ? "cruza el cero" : "no cruza el cero"}
        </span>{" "}
        — sin imponer un modelo de deriva, el resultado es{" "}
        <span className="text-ink-2">
          {crossesZero ? "matemáticamente abierto" : "matemáticamente cerrado"}
        </span>
        .
      </p>
    </Panel>
  );
}
