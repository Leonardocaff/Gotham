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
import type { Latest } from "@/lib/types";
import { CANDIDATE_COLOR } from "@/lib/types";
import { Panel } from "@/components/ui/Panel";
import { int } from "@/lib/format";

const EMERALD = CANDIDATE_COLOR.sanchez;
const CYAN = CANDIDATE_COLOR.keiko;

/**
 * "Umbral de remonte" — el margen final es LINEAL en q = la cuota del voto
 * restante que capta Sánchez. Derivado de las cotas de Manski: en q=0 todo el
 * restante va a Keiko (cota baja), en q=1 todo a Sánchez (cota alta). La línea
 * cruza cero en el umbral de empate q*. El punto proyectado dice dónde cae el
 * modelo. Si proyectado < umbral → Sánchez no remonta.
 */
export function OvertakeThreshold({ latest }: { latest: Latest }) {
  const p = latest.projection;
  const m = useMemo(() => {
    const [lo, hi] = p.bounds.margin_votes; // q=0 (todo Keiko) … q=1 (todo Sánchez)
    const R = (hi - lo) / 2; // votos restantes
    const cur = (hi + lo) / 2; // margen actual (Sánchez − Keiko), firmado
    const total = latest.count.totalVotosValidos + R;
    // margen(q) = cur + R·(2q − 1); en votos. Convertimos a pp del total final.
    const marginVotesAt = (q: number) => cur + R * (2 * q - 1);
    const qTie = R > 0 ? 0.5 - cur / (2 * R) : 0.5; // margen=0
    const finalMargin = p.final_margin.median_votes;
    const qProj = R > 0 ? 0.5 + (finalMargin - cur) / (2 * R) : 0.5;

    // ventana centrada en la acción (umbral, proyectado, 50%)
    const focus = [qTie, qProj, 0.5];
    const loQ = Math.max(0, Math.min(...focus) - 0.06);
    const hiQ = Math.min(1, Math.max(...focus) + 0.06);
    const data = Array.from({ length: 41 }, (_, i) => {
      const q = loQ + ((hiQ - loQ) * i) / 40;
      const mv = marginVotesAt(q);
      return {
        q: q * 100,
        marginPct: (100 * mv) / total,
        pos: mv >= 0 ? (100 * mv) / total : 0,
        neg: mv < 0 ? (100 * mv) / total : 0,
      };
    });
    return {
      data,
      qTiePct: qTie * 100,
      qProjPct: qProj * 100,
      R,
      finalMargin,
      tieMarginPct: (100 * marginVotesAt(qTie)) / total, // ≈0
      projMarginPct: (100 * finalMargin) / total,
      loQ: loQ * 100,
      hiQ: hiQ * 100,
    };
  }, [p, latest.count.totalVotosValidos]);

  const sanchezNeeds = m.qTiePct;
  const sanchezGets = m.qProjPct;
  const remonta = sanchezGets > sanchezNeeds;

  return (
    <Panel
      title="Umbral de remonte"
      hint="% del voto restante que Sánchez necesita para alcanzar a Keiko"
    >
      <p className="mb-2 text-[13px] leading-relaxed text-ink-1">
        Sánchez{" "}
        <span className="font-semibold" style={{ color: EMERALD }}>
          remonta si capta ≥ {sanchezNeeds.toFixed(1)}%
        </span>{" "}
        del ~{int(m.R)} restante. El modelo proyecta que capta{" "}
        <span className="font-semibold" style={{ color: remonta ? EMERALD : CYAN }}>
          {sanchezGets.toFixed(1)}%
        </span>{" "}
        → {remonta ? "alcanza" : "se queda corto por " + (sanchezNeeds - sanchezGets).toFixed(1) + "pp"}.
      </p>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={m.data} margin={{ top: 6, right: 8, bottom: 2, left: -18 }}>
            <defs>
              <linearGradient id="winS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={EMERALD} stopOpacity={0.28} />
                <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="winK" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={CYAN} stopOpacity={0.28} />
                <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="q"
              type="number"
              domain={[m.loQ, m.hiQ]}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: "#909092", fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            />
            <YAxis
              tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`}
              tick={{ fill: "#909092", fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Area dataKey="pos" stroke="none" fill="url(#winS)" isAnimationActive={false} />
            <Area dataKey="neg" stroke="none" fill="url(#winK)" isAnimationActive={false} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
            <ReferenceLine
              x={m.qTiePct}
              stroke="#FFB43C"
              strokeWidth={1.5}
              label={{ value: "umbral", fill: "#FFB43C", fontSize: 9, position: "insideTopLeft" }}
            />
            <Line
              dataKey="marginPct"
              stroke="#F5F5F7"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={m.qProjPct}
              y={m.projMarginPct}
              r={4}
              fill={remonta ? EMERALD : CYAN}
              stroke="#0A0A0C"
              strokeWidth={1.5}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-between font-mono text-[10px] tnum text-ink-3">
        <span>
          x = cuota de Sánchez del restante · <span style={{ color: "#FFB43C" }}>línea</span> = umbral de empate
        </span>
        <span>
          punto = proyectado ({sanchezGets.toFixed(1)}%)
        </span>
      </div>
      <p className="mt-1 text-[10px] leading-snug text-ink-3">
        Eje Y = margen final (pp). Arriba del cero gana Sánchez (verde), abajo Keiko (cian).
        Derivado de las cotas de Manski — sin supuestos de deriva.
      </p>
    </Panel>
  );
}
