"use client";

import type { Latest } from "@/lib/types";
import { signedInt, signedPp } from "@/lib/format";
import { leaderColor } from "@/lib/color";
import { Panel } from "@/components/ui/Panel";

export function ContestedGrid({ latest }: { latest: Latest }) {
  const { scenarios, nota_legal, flips } = (() => {
    const c = latest.projection.contested;
    return {
      scenarios: c.scenarios,
      nota_legal: c.nota_legal,
      flips: c.scenarios.flips_within_grid,
    };
  })();

  return (
    <Panel
      title="Actas impugnadas — escenarios"
      hint="Margen final (votos) por tasa de anulación × sesgo de re-conteo"
      aside={
        <span
          className="rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          style={
            flips
              ? { color: "#FFB43C", borderColor: "#FFB43C55", background: "#FFB43C14" }
              : { color: "#3DD9A0", borderColor: "#3DD9A055", background: "#3DD9A014" }
          }
        >
          {flips ? "se invierte" : "sin inversión"}
        </span>
      }
    >
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[440px] border-separate border-spacing-1 text-center">
          <thead>
            <tr>
              <th className="text-[10px] font-medium uppercase tracking-wide text-ink-3">
                anul ╲ sesgo
              </th>
              {scenarios.skews_pp.map((sk) => (
                <th
                  key={sk}
                  className="tnum px-1 font-mono text-[11px] text-ink-2"
                >
                  {signedPp(sk, 0)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scenarios.grid.map((row, i) => (
              <tr key={scenarios.annul_rates[i]}>
                <td className="tnum pr-1 text-right font-mono text-[11px] text-ink-2">
                  {(scenarios.annul_rates[i] * 100).toFixed(0)}%
                </td>
                {row.map((cell) => {
                  const intensity = Math.abs(cell.margin / 70000) * 40; // pp-ish for color
                  const bg = leaderColor(cell.leader, intensity || 4);
                  return (
                    <td
                      key={`${cell.annul}-${cell.skew_pp}`}
                      className="rounded-md px-2 py-2 transition-transform hover:scale-[1.04] active:scale-[0.98]"
                      style={{
                        backgroundColor: `${bg}33`,
                        border: `1px solid ${bg}66`,
                      }}
                      title={`anul ${(cell.annul * 100).toFixed(0)}% · sesgo ${signedPp(
                        cell.skew_pp,
                        0,
                      )} → ${cell.leader}`}
                    >
                      <div
                        className="tnum font-mono text-[11px] font-medium"
                        style={{ color: bg }}
                      >
                        {signedInt(cell.margin)}
                      </div>
                      <div className="text-[9px] uppercase tracking-wide text-ink-3">
                        {cell.leader === "sanchez" ? "Sán" : "Kei"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 border-t border-edge pt-3 text-[11px] leading-snug text-ink-3">
        <span className="text-ink-2">Nota legal · JNE:</span> {nota_legal}
      </p>
    </Panel>
  );
}
