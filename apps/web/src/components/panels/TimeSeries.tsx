"use client";

import {
  CartesianGrid,
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryPoint } from "@/lib/types";
import { timeFromIso } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";

export function TimeSeries({ history }: { history: HistoryPoint[] }) {
  if (history.length < 2) {
    return (
      <Panel title="Serie temporal" hint="Margen proyectado a lo largo del conteo">
        <div className="flex h-44 items-center justify-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
            acumulando snapshots…
          </span>
        </div>
      </Panel>
    );
  }

  const data = history.map((h) => ({
    t: timeFromIso(h.ts),
    proj: h.projMarginVotes,
    pwin: +(h.pWinSanchez * 100).toFixed(1),
  }));

  return (
    <Panel
      title="Serie temporal"
      hint="Margen proyectado (votos) y P(Sánchez) en cada snapshot"
    >
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -6 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fill: "#909092", fontSize: 9, fontFamily: "monospace" }}
              stroke="rgba(255,255,255,0.1)"
              minTickGap={20}
            />
            <YAxis
              yAxisId="margin"
              tick={{ fill: "#909092", fontSize: 9, fontFamily: "monospace" }}
              stroke="rgba(255,255,255,0.1)"
              width={52}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="pwin"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: "#909092", fontSize: 9, fontFamily: "monospace" }}
              stroke="rgba(255,255,255,0.1)"
              width={34}
              tickFormatter={(v) => `${v}%`}
            />
            <ReferenceLine
              yAxisId="margin"
              y={0}
              stroke="#FF7A8A"
              strokeDasharray="3 3"
              strokeOpacity={0.7}
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.18)" }}
              contentStyle={{
                background: "rgba(18,18,22,0.92)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                fontSize: 12,
              }}
              labelStyle={{ color: "#B8B8BA" }}
            />
            <Line
              yAxisId="margin"
              type="monotone"
              dataKey="proj"
              name="Margen proy."
              stroke="#4A9EFF"
              strokeWidth={2}
              dot={{ r: 2, fill: "#4A9EFF" }}
            />
            <Line
              yAxisId="pwin"
              type="monotone"
              dataKey="pwin"
              name="P(Sánchez) %"
              stroke="#3DD9A0"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-ink-3">
        Línea rosa = empate. Azul: margen proyectado (votos). Verde punteado:
        P(victoria Sánchez).
      </p>
    </Panel>
  );
}
