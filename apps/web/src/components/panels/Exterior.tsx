"use client";

import type { Latest } from "@/lib/types";
import { CANDIDATE_COLOR } from "@/lib/types";
import { int, pct } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/atoms";

export function Exterior({ latest }: { latest: Latest }) {
  const ext = latest.projection.exterior;
  const continents = [...latest.exteriorByContinent].sort(
    (a, b) => b.remainingVotesEst - a.remainingVotesEst,
  );
  const maxRemain = Math.max(1, ...continents.map((c) => c.remainingVotesEst));
  const keikoPct = 100 - ext.pctSanchez;

  return (
    <Panel
      title="Voto en el exterior"
      hint="Pool grande, pro-Keiko y aún incompleto — pivote de la elección"
      aside={
        <span
          className="rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          style={{
            color: CANDIDATE_COLOR.keiko,
            borderColor: `${CANDIDATE_COLOR.keiko}55`,
            background: `${CANDIDATE_COLOR.keiko}14`,
          }}
        >
          pivotal
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Stat label="Actas %">{pct(ext.actasPct, 2)}</Stat>
          <Stat label="Sánchez %">
            <span style={{ color: CANDIDATE_COLOR.sanchez }}>
              {pct(ext.pctSanchez, 2)}
            </span>
          </Stat>
          <Stat label="Keiko %">
            <span style={{ color: CANDIDATE_COLOR.keiko }}>{pct(keikoPct, 2)}</span>
          </Stat>
        </div>
        <div className="space-y-1.5">
          <Stat label="Votos restantes (est.)">{int(ext.remainingVotesEst)}</Stat>
          <Stat label="Neto Keiko (est.)">
            <span style={{ color: CANDIDATE_COLOR.keiko }}>
              +{int(ext.leanKeikoNetEst)}
            </span>
          </Stat>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-edge pt-3">
        {continents.map((c) => (
          <div key={c.code} className="flex items-center gap-2">
            <span className="w-16 text-[11px] text-ink-2">{c.name}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(c.remainingVotesEst / maxRemain) * 100}%`,
                  backgroundColor: CANDIDATE_COLOR[c.leader],
                }}
              />
            </div>
            <span className="tnum w-20 text-right font-mono text-[11px] text-ink-3">
              {int(c.remainingVotesEst)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-3">
        <span className="text-ink-2">América</span> concentra el grueso del pool
        restante y vota fuerte por Keiko.
      </p>
    </Panel>
  );
}
