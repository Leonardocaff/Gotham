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
  return (
    <Panel title="Métodos de proyección" hint={hint}>
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
    </Panel>
  );
}
