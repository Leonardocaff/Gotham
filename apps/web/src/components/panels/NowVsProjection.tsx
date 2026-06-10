"use client";

import type { Latest } from "@/lib/types";
import { CANDIDATE_COLOR } from "@/lib/types";
import { int, pct, signedInt, signedPp } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";
import { Dot, LiveNum, Rule } from "@/components/ui/atoms";

/** A value-now → value-projected row with a Δ chevron and a CI90 bracket. */
function Compare({
  label,
  color,
  now,
  proj,
  delta,
  ci,
}: {
  label: string;
  color: string;
  now: string;
  proj: string;
  /** signed pp change from now → projected */
  delta: number;
  ci: string;
}) {
  const up = delta >= 0;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex items-center gap-2 text-xs text-ink-2">
        <Dot color={color} />
        {label}
      </span>
      <div className="flex items-center gap-2.5 font-mono text-sm tnum">
        <span className="text-ink-3">{now}</span>
        <span className="text-ink-3">→</span>
        <span style={{ color }}>{proj}</span>
        <span
          className="inline-flex w-[52px] items-center justify-end gap-0.5 text-[11px]"
          style={{ color: Math.abs(delta) < 0.005 ? "#909092" : color }}
        >
          {up ? "▲" : "▼"} {signedPp(delta)}
        </span>
        <span className="hidden text-[10px] text-ink-3 lg:inline">{ci}</span>
      </div>
    </div>
  );
}

export function NowVsProjection({ latest }: { latest: Latest }) {
  const [sanchez, keiko] = latest.candidates;
  const { projection, currentMargin } = latest;

  const sProj = projection.final_pct.sanchez.median;
  const kProj = projection.final_pct.keiko.median;
  const sCi = projection.final_pct.sanchez.ci90;
  const kCi = projection.final_pct.keiko.ci90;
  const mCi = projection.final_margin.ci90_votes;

  const sDelta = sProj - sanchez.pctValidos;
  const kDelta = kProj - keiko.pctValidos;
  const marginNow = currentMargin.votes;
  const marginProj = projection.final_margin.median_votes;
  const marginShift = marginProj - marginNow;

  return (
    <Panel
      title="Ahora vs Proyección"
      hint="Conteo actual → mediana proyectada (IC 90%)"
      aside={
        <span
          className="tnum rounded-md border border-edge bg-surface-3 px-2 py-0.5 font-mono text-[10px] text-ink-2"
          title="Cuánto se mueve el margen del conteo a la proyección"
        >
          Δmargen {signedInt(marginShift)}
        </span>
      }
    >
      <div className="space-y-0.5">
        <Compare
          label="Sánchez % válidos"
          color={CANDIDATE_COLOR.sanchez}
          now={pct(sanchez.pctValidos, 2)}
          proj={pct(sProj, 2)}
          delta={sDelta}
          ci={`[${sCi[0].toFixed(1)}–${sCi[1].toFixed(1)}]`}
        />
        <Compare
          label="Keiko % válidos"
          color={CANDIDATE_COLOR.keiko}
          now={pct(keiko.pctValidos, 2)}
          proj={pct(kProj, 2)}
          delta={kDelta}
          ci={`[${kCi[0].toFixed(1)}–${kCi[1].toFixed(1)}]`}
        />
      </div>

      <Rule />

      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-2">Margen (votos)</span>
        <div className="flex items-center gap-3 font-mono text-sm tnum">
          <span className="text-ink-3">{signedInt(marginNow)}</span>
          <span className="text-ink-3">→</span>
          <LiveNum
            value={marginProj}
            display={signedInt(marginProj)}
            color={
              marginProj >= 0 ? CANDIDATE_COLOR.sanchez : CANDIDATE_COLOR.keiko
            }
            className="text-base"
          />
        </div>
      </div>
      <div className="mt-1 text-right font-mono text-[11px] tnum text-ink-3">
        IC90 [{int(mCi[0])} … {int(mCi[1])}] · {signedPp(projection.final_margin.median_pct)}
      </div>

      {/* What the projection actually does to the count, in one line. */}
      <p className="mt-3 border-t border-edge pt-3 text-[11px] leading-snug text-ink-3">
        La proyección{" "}
        <span style={{ color: marginShift >= 0 ? CANDIDATE_COLOR.sanchez : CANDIDATE_COLOR.keiko }}>
          {marginShift >= 0 ? "amplía" : "recorta"} la ventaja de Sánchez en {int(Math.abs(marginShift))} votos
        </span>{" "}
        al corregir el sesgo de reporte del restante.
      </p>
    </Panel>
  );
}
