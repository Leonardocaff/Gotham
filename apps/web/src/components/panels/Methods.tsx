"use client";

import type { Latest } from "@/lib/types";
import { CANDIDATE_COLOR, CANDIDATE_SHORT } from "@/lib/types";
import { pct, signedInt } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";

export function Methods({ latest }: { latest: Latest }) {
  const naive = latest.models.find((m) => m.key === "naive");
  const rig =
    latest.models.find((m) => m.key === "stratified") ??
    latest.models.find((m) => m.key === "closed_form");
  const hint =
    naive && rig
      ? naive.leader === rig.leader
        ? `Naíve y rigurosos coinciden en ${CANDIDATE_SHORT[rig.leader]}`
        : `El naíve favorece a ${CANDIDATE_SHORT[naive.leader]}; los rigurosos invierten a ${CANDIDATE_SHORT[rig.leader]}`
      : "El naíve extrapola el % nacional; los rigurosos corrigen el sesgo de reporte diferencial";

  // Consensus + spread across all models — the headline before the table.
  const margins = latest.models.map((m) => m.final_margin_votes);
  const spread = Math.max(...margins) - Math.min(...margins);
  const leaders = new Set(latest.models.map((m) => m.leader));
  const consensus = leaders.size === 1 ? [...leaders][0] : null;

  return (
    <Panel title="Métodos de proyección" hint={hint}>
      {/* Headline strip — do the methods agree, and how far apart are they? */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-edge bg-surface-3 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Consenso de líder
          </div>
          <div
            className="mt-0.5 text-sm font-semibold"
            style={{ color: consensus ? CANDIDATE_COLOR[consensus] : "#FFB43C" }}
          >
            {consensus ? CANDIDATE_SHORT[consensus] : "Divididos"}
          </div>
          <div className="text-[10px] text-ink-3">
            {latest.models.length} métodos
          </div>
        </div>
        <div className="rounded-lg border border-edge bg-surface-3 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Dispersión de margen
          </div>
          <div className="tnum mt-0.5 font-mono text-sm font-semibold text-ink-1">
            {signedInt(spread).replace("+", "±").replace("−", "±")}
          </div>
          <div className="text-[10px] text-ink-3">votos entre métodos</div>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.12em] text-ink-3">
              <th className="pb-2 pr-3 font-medium">Método</th>
              <th className="pb-2 pr-3 text-right font-medium">Líder</th>
              <th className="pb-2 pr-3 text-right font-medium">Sánchez %</th>
              <th className="pb-2 pr-3 text-right font-medium">Margen</th>
              <th className="pb-2 text-right font-medium">P(Keiko)</th>
            </tr>
          </thead>
          <tbody className="tnum font-mono text-sm">
            {latest.models.map((m) => {
              const color = CANDIDATE_COLOR[m.leader];
              return (
                <tr key={m.key} className="border-t border-edge">
                  <td className="py-2 pr-3 font-sans text-xs text-ink-2">
                    {m.label}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <span style={{ color }}>
                      {m.leader === "sanchez" ? "Sánchez" : "Keiko"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right text-ink-1">
                    {m.final_pct_sanchez != null ? pct(m.final_pct_sanchez, 2) : "—"}
                  </td>
                  <td
                    className="py-2 pr-3 text-right"
                    style={{
                      color:
                        m.final_margin_votes >= 0
                          ? CANDIDATE_COLOR.sanchez
                          : CANDIDATE_COLOR.keiko,
                    }}
                  >
                    {signedInt(m.final_margin_votes)}
                  </td>
                  <td className="py-2 text-right text-ink-2">
                    {m.p_win ? pct(m.p_win.keiko * 100, 1) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 border-t border-edge pt-3 text-[11px] leading-snug text-ink-3">
        El <span className="text-ink-2">naíve</span> extrapola el % nacional;
        los <span className="text-ink-2">rigurosos</span> proyectan cada estrato
        con su propio split y corrigen el sesgo de reporte. {hint}.
      </p>
    </Panel>
  );
}
