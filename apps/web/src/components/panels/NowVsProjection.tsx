"use client";

import type { Latest } from "@/lib/types";
import { CANDIDATE_COLOR } from "@/lib/types";
import { int, pct, signedInt, signedPp } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";
import { Dot, LiveNum, Rule } from "@/components/ui/atoms";

/** A value-now → value-projected row with a CI90 bracket caption. */
function Compare({
  label,
  color,
  now,
  proj,
  ci,
}: {
  label: string;
  color: string;
  now: string;
  proj: string;
  ci: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="flex items-center gap-2 text-xs text-ink-2">
        <Dot color={color} />
        {label}
      </span>
      <div className="flex items-center gap-3 font-mono text-sm tnum">
        <span className="text-ink-3">{now}</span>
        <span className="text-ink-3">→</span>
        <span className="text-ink-1" style={{ color }}>
          {proj}
        </span>
        <span className="hidden text-[11px] text-ink-3 sm:inline">{ci}</span>
      </div>
    </div>
  );
}

export function NowVsProjection({ latest }: { latest: Latest }) {
  const [sanchez, keiko] = latest.candidates;
  const { projection, currentMargin } = latest;

  const sCi = projection.final_pct.sanchez.ci90;
  const kCi = projection.final_pct.keiko.ci90;
  const mCi = projection.final_margin.ci90_votes;

  return (
    <Panel
      title="Ahora vs Proyección"
      hint="Conteo actual → mediana proyectada (IC 90%)"
    >
      <div className="space-y-1">
        <Compare
          label="Sánchez % válidos"
          color={CANDIDATE_COLOR.sanchez}
          now={pct(sanchez.pctValidos, 2)}
          proj={pct(projection.final_pct.sanchez.median, 2)}
          ci={`[${sCi[0].toFixed(2)} – ${sCi[1].toFixed(2)}]`}
        />
        <Compare
          label="Keiko % válidos"
          color={CANDIDATE_COLOR.keiko}
          now={pct(keiko.pctValidos, 2)}
          proj={pct(projection.final_pct.keiko.median, 2)}
          ci={`[${kCi[0].toFixed(2)} – ${kCi[1].toFixed(2)}]`}
        />
      </div>

      <Rule />

      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-2">Margen (votos)</span>
        <div className="flex items-center gap-3 font-mono text-sm tnum">
          <span className="text-ink-3">{signedInt(currentMargin.votes)}</span>
          <span className="text-ink-3">→</span>
          <LiveNum
            value={projection.final_margin.median_votes}
            display={signedInt(projection.final_margin.median_votes)}
            color={
              projection.final_margin.median_votes >= 0
                ? CANDIDATE_COLOR.sanchez
                : CANDIDATE_COLOR.keiko
            }
            className="text-base"
          />
        </div>
      </div>
      <div className="mt-1 text-right font-mono text-[11px] tnum text-ink-3">
        IC90 [{int(mCi[0])} … {int(mCi[1])}] · {signedPp(projection.final_margin.median_pct)}
      </div>
    </Panel>
  );
}
