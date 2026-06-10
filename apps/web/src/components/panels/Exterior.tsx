"use client";

import type { Latest } from "@/lib/types";
import { CANDIDATE_COLOR, CANDIDATE_SHORT } from "@/lib/types";
import { int, pct, signedInt } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/atoms";

/** Net votes the still-uncounted pool of a continent would hand its leader IF it
 * broke exactly like what's already counted. Sign convention: + toward Sánchez. */
function netLeanSanchez(pctSanchez: number, remaining: number): number {
  return Math.round(remaining * ((pctSanchez / 100) * 2 - 1));
}

export function Exterior({ latest }: { latest: Latest }) {
  const ext = latest.projection.exterior;
  const continents = [...latest.exteriorByContinent].sort(
    (a, b) => b.remainingVotesEst - a.remainingVotesEst,
  );
  const maxRemain = Math.max(1, ...continents.map((c) => c.remainingVotesEst));
  const keikoPct = 100 - ext.pctSanchez;
  const extLeader = ext.pctSanchez >= 50 ? "sanchez" : "keiko";
  const leadColor = CANDIDATE_COLOR[extLeader];
  const biggest = continents[0];

  return (
    <Panel
      title="Voto en el exterior"
      hint={`Un bloque grande de votos (${pct(ext.pctSanchez, 0)} Sánchez), pro-${CANDIDATE_SHORT[extLeader]} y todavía sin terminar de contar. Puede mover la elección.`}
      aside={
        <span
          className="rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          style={{
            color: leadColor,
            borderColor: `${leadColor}55`,
            background: `${leadColor}14`,
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

      {/* Split bar — the exterior's own Sánchez vs Keiko share at a glance. */}
      <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          style={{ width: `${ext.pctSanchez}%`, backgroundColor: CANDIDATE_COLOR.sanchez }}
        />
        <div
          style={{ width: `${keikoPct}%`, backgroundColor: CANDIDATE_COLOR.keiko }}
        />
      </div>

      {/* Per-continent: remaining pool bar + the net lean it would hand a side. */}
      <div className="mt-4 space-y-2 border-t border-edge pt-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-ink-3">
          <span>Continente · restante est.</span>
          <span>lean neto</span>
        </div>
        {continents.map((c) => {
          const net = netLeanSanchez(c.pctSanchez, c.remainingVotesEst);
          const netColor = net >= 0 ? CANDIDATE_COLOR.sanchez : CANDIDATE_COLOR.keiko;
          return (
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
              <span className="tnum w-16 text-right font-mono text-[11px] text-ink-3">
                {int(c.remainingVotesEst)}
              </span>
              <span
                className="tnum w-14 text-right font-mono text-[11px]"
                style={{ color: netColor }}
              >
                {signedInt(net)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-ink-3">
        <span className="text-ink-2">{biggest.name}</span> concentra el grueso del
        pool restante (~{int(biggest.remainingVotesEst)}) y vota fuerte por{" "}
        <span style={{ color: CANDIDATE_COLOR[biggest.leader] }}>
          {CANDIDATE_SHORT[biggest.leader]}
        </span>
        .
      </p>
    </Panel>
  );
}
