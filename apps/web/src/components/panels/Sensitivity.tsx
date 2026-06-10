"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Latest } from "@/lib/types";
import { Panel } from "@/components/ui/Panel";

export function Sensitivity({ latest }: { latest: Latest }) {
  const data = latest.projection.sensitivity.map((p) => ({
    delta: p.delta_pp,
    pwin: +(p.p_win_sanchez * 100).toFixed(2),
  }));
  const atZero = data.find((d) => d.delta === 0);

  return (
    <Panel
      title="Sensibilidad"
      hint="P(victoria Sánchez) si el supuesto de deriva se desplaza ±pp"
    >
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="sens" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3DD9A0" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3DD9A0" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="delta"
              tick={{ fill: "#909092", fontSize: 10, fontFamily: "monospace" }}
              tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`}
              stroke="rgba(255,255,255,0.1)"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#909092", fontSize: 10, fontFamily: "monospace" }}
              tickFormatter={(v) => `${v}%`}
              stroke="rgba(255,255,255,0.1)"
              width={42}
            />
            <ReferenceLine
              y={50}
              stroke="#FF7A8A"
              strokeDasharray="3 3"
              strokeOpacity={0.7}
            />
            <ReferenceLine x={0} stroke="rgba(255,255,255,0.18)" />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.18)" }}
              contentStyle={{
                background: "rgba(18,18,22,0.92)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                fontSize: 12,
              }}
              labelStyle={{ color: "#B8B8BA" }}
              labelFormatter={(v) => `Δ ${Number(v) > 0 ? "+" : ""}${v}pp`}
              formatter={(v: number) => [`${v}%`, "P(Sánchez)"]}
            />
            <Area
              type="monotone"
              dataKey="pwin"
              stroke="#3DD9A0"
              strokeWidth={2}
              fill="url(#sens)"
            />
            {atZero && (
              <ReferenceDot
                x={0}
                y={atZero.pwin}
                r={4}
                fill="#3DD9A0"
                stroke="#0A0A0C"
                strokeWidth={1.5}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-ink-3">
        Línea rosa = umbral 50%. El punto marca el supuesto base (Δ=0). Incluso
        un giro de +3pp deja a Sánchez por debajo del 50%.
      </p>
    </Panel>
  );
}
