"use client";

import { useMemo } from "react";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryPoint, Latest } from "@/lib/types";
import { CANDIDATE_COLOR } from "@/lib/types";
import { Panel } from "@/components/ui/Panel";
import { int } from "@/lib/format";

const EMERALD = CANDIDATE_COLOR.sanchez;
const CYAN = CANDIDATE_COLOR.keiko;
const GOLD = "#FFB43C";

const name = (k: "sanchez" | "keiko") => (k === "sanchez" ? "Sánchez" : "Keiko");
const side = (v: number): "sanchez" | "keiko" => (v >= 0 ? "sanchez" : "keiko");

/**
 * "Punto de cruce" — el margen Sánchez−Keiko (votos) a lo largo del % de actas. La línea
 * sólida es lo OBSERVADO; la punteada proyecta desde el conteo actual hasta el margen final
 * del modelo (a 100%). Donde cruza el cero cambia el líder, y ahí marcamos el %.
 */
export function Crossover({
  history,
  latest,
}: {
  history: HistoryPoint[];
  latest: Latest;
}) {
  const m = useMemo(() => {
    const pts = [...history]
      .filter((h) => Number.isFinite(h.actasPct) && Number.isFinite(h.marginVotes))
      .sort((a, b) => a.actasPct - b.actasPct);
    if (pts.length < 2) return null;

    const last = pts[pts.length - 1];
    const finalMargin = latest.projection.final_margin.median_votes; // +Sánchez, −Keiko, a 100%
    const endActas = Math.max(last.actasPct, latest.count.actasContabilizadasPct, 99.999);

    // serie observada + un tramo proyectado (último punto → 100%)
    const data: {
      actas: number;
      obs?: number | null;
      proj?: number | null;
      pos: number;
      neg: number;
    }[] = pts.map((h) => ({
      actas: h.actasPct,
      obs: h.marginVotes,
      proj: null,
      pos: h.marginVotes >= 0 ? h.marginVotes : 0,
      neg: h.marginVotes < 0 ? h.marginVotes : 0,
    }));
    // puente: el último observado ancla la línea punteada
    data[data.length - 1].proj = last.marginVotes;
    data.push({
      actas: 100,
      obs: null,
      proj: finalMargin,
      pos: finalMargin >= 0 ? finalMargin : 0,
      neg: finalMargin < 0 ? finalMargin : 0,
    });

    // ¿hubo cruce observado dentro del historial?
    let obsCross: number | null = null;
    let obsTo: "sanchez" | "keiko" | null = null;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1].marginVotes;
      const b = pts[i].marginVotes;
      if (a === 0 || b === 0 || a * b < 0) {
        const t = a === b ? 0 : Math.abs(a) / (Math.abs(a) + Math.abs(b));
        obsCross = pts[i - 1].actasPct + t * (pts[i].actasPct - pts[i - 1].actasPct);
        obsTo = side(b);
      }
    }

    // cruce PROYECTADO: el tramo punteado cambia de signo entre el actual y 100%
    let projCross: number | null = null;
    if (last.marginVotes * finalMargin < 0) {
      const t = Math.abs(last.marginVotes) / (Math.abs(last.marginVotes) + Math.abs(finalMargin));
      projCross = last.actasPct + t * (endActas - last.actasPct);
    }

    return {
      data,
      obsCross,
      obsTo,
      projCross,
      leaderNow: side(last.marginVotes),
      nowMargin: last.marginVotes,
      nowActas: last.actasPct,
      finalLeader: side(finalMargin),
      finalMargin,
      minA: Math.min(...pts.map((p) => p.actasPct)),
    };
  }, [history, latest]);

  if (!m) {
    return (
      <Panel title="Punto de cruce" hint="Dónde cambia el líder a lo largo del conteo">
        <p className="text-[12px] leading-relaxed text-ink-3">
          Todavía falta historial para trazar el cruce. Se llena conforme ONPE publica
          nuevas actas.
        </p>
      </Panel>
    );
  }

  // crossover a mostrar: el observado tiene prioridad; si no, el proyectado.
  const crossActas = m.obsCross ?? m.projCross;
  const crossTo = m.obsCross ? m.obsTo : m.finalLeader;
  const projected = m.obsCross == null && m.projCross != null;

  return (
    <Panel
      title="Punto de cruce"
      hint="Margen en votos a lo largo del conteo. Sólido = observado, punteado = proyectado al 100%."
    >
      <p className="mb-2 text-[13px] leading-relaxed text-ink-1">
        {m.obsCross != null && m.obsTo ? (
          <>
            <span className="font-semibold" style={{ color: CANDIDATE_COLOR[m.obsTo] }}>
              {name(m.obsTo)} superó a {name(m.obsTo === "sanchez" ? "keiko" : "sanchez")}
            </span>{" "}
            al{" "}
            <span className="tnum font-semibold" style={{ color: CANDIDATE_COLOR[m.obsTo] }}>
              {m.obsCross.toFixed(2)}%
            </span>{" "}
            del conteo.
          </>
        ) : m.projCross != null && crossTo ? (
          <>
            El conteo crudo aún da{" "}
            <span className="font-semibold" style={{ color: CANDIDATE_COLOR[m.leaderNow] }}>
              {name(m.leaderNow)} +{int(Math.abs(m.nowMargin))}
            </span>
            , pero su ventaja cae rápido. Con el voto que falta (exterior pro-Keiko),{" "}
            <span className="font-semibold" style={{ color: CANDIDATE_COLOR[crossTo] }}>
              {name(crossTo)} lo supera al ~{m.projCross.toFixed(1)}%
            </span>{" "}
            del conteo.
          </>
        ) : (
          <>
            En lo contado, el liderazgo no cambia: lo mantiene{" "}
            <span className="font-semibold" style={{ color: CANDIDATE_COLOR[m.leaderNow] }}>
              {name(m.leaderNow)}
            </span>{" "}
            por {int(Math.abs(m.nowMargin))} votos.
          </>
        )}
      </p>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={m.data} margin={{ top: 6, right: 10, bottom: 2, left: -8 }}>
            <defs>
              <linearGradient id="cxS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={EMERALD} stopOpacity={0.3} />
                <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cxK" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={CYAN} stopOpacity={0.3} />
                <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="actas"
              type="number"
              domain={[Math.floor(m.minA), 100]}
              ticks={[Math.floor(m.minA), Math.round((m.minA + 100) / 2), 100]}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: "#909092", fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            />
            <YAxis
              tickFormatter={(v: number) =>
                Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
              }
              tick={{ fill: "#909092", fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
              tickLine={false}
              axisLine={false}
              width={38}
            />
            <Area dataKey="pos" stroke="none" fill="url(#cxS)" isAnimationActive={false} />
            <Area dataKey="neg" stroke="none" fill="url(#cxK)" isAnimationActive={false} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
            <Line
              dataKey="obs"
              stroke="#F5F5F7"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              dataKey="proj"
              stroke="#F5F5F7"
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeOpacity={0.65}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            {crossActas != null && (
              <ReferenceLine
                x={crossActas}
                stroke={GOLD}
                strokeWidth={1.5}
                label={{
                  value: `${projected ? "≈" : ""}${crossActas.toFixed(1)}%`,
                  fill: GOLD,
                  fontSize: 9,
                  position: "insideTopRight",
                }}
              />
            )}
            {crossActas != null && (
              <ReferenceDot x={crossActas} y={0} r={4} fill={GOLD} stroke="#0A0A0C" strokeWidth={1.5} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-[10px] leading-snug text-ink-3">
        Eje X = % de actas · eje Y = margen en votos (Sánchez − Keiko). Sobre el cero lidera
        Sánchez (verde), bajo el cero Keiko (cian). La línea punteada es la trayectoria
        proyectada hasta el 100%; el punto dorado marca el cambio de líder.
      </p>
    </Panel>
  );
}
