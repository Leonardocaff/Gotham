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
import type { HistoryPoint } from "@/lib/types";
import { CANDIDATE_COLOR } from "@/lib/types";
import { Panel } from "@/components/ui/Panel";
import { int } from "@/lib/format";

const EMERALD = CANDIDATE_COLOR.sanchez;
const CYAN = CANDIDATE_COLOR.keiko;

/**
 * "Punto de cruce" — el margen Sánchez−Keiko (en votos) a lo largo del % de actas
 * contabilizadas. Las primeras actas (urbanas, rápidas) favorecieron a un candidato; al
 * entrar el voto rural y del exterior el margen se mueve y, en algún %, cruza cero: ahí
 * el liderazgo cambia de manos. Marcamos ese % exacto.
 */
export function Crossover({ history }: { history: HistoryPoint[] }) {
  const m = useMemo(() => {
    const pts = [...history]
      .filter((h) => Number.isFinite(h.actasPct) && Number.isFinite(h.marginVotes))
      .sort((a, b) => a.actasPct - b.actasPct);
    if (pts.length < 2) return null;

    const data = pts.map((h) => ({
      actas: h.actasPct,
      margin: h.marginVotes, // +Sánchez, −Keiko
      pos: h.marginVotes >= 0 ? h.marginVotes : 0,
      neg: h.marginVotes < 0 ? h.marginVotes : 0,
    }));

    // Último cambio de signo del margen = el cruce de liderazgo más reciente.
    let crossAt: number | null = null;
    let from: "sanchez" | "keiko" | null = null;
    let to: "sanchez" | "keiko" | null = null;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1].marginVotes;
      const b = pts[i].marginVotes;
      if (a === 0 || b === 0 || a * b < 0) {
        const t = a === b ? 0 : Math.abs(a) / (Math.abs(a) + Math.abs(b));
        crossAt = pts[i - 1].actasPct + t * (pts[i].actasPct - pts[i - 1].actasPct);
        from = a >= 0 ? "sanchez" : "keiko";
        to = b >= 0 ? "sanchez" : "keiko";
      }
    }
    const now = pts[pts.length - 1];
    const leaderNow: "sanchez" | "keiko" = now.marginVotes >= 0 ? "sanchez" : "keiko";
    return { data, crossAt, from, to, leaderNow, nowMargin: now.marginVotes, nowActas: now.actasPct };
  }, [history]);

  if (!m) {
    return (
      <Panel title="Punto de cruce" hint="Dónde cambió el liderazgo durante el conteo">
        <p className="text-[12px] leading-relaxed text-ink-3">
          Aún no hay suficiente historial para trazar el cruce. Se llena conforme ONPE
          publica nuevas actas.
        </p>
      </Panel>
    );
  }

  const name = (k: "sanchez" | "keiko") => (k === "sanchez" ? "Sánchez" : "Keiko");
  const minA = Math.min(...m.data.map((d) => d.actas));
  const maxA = Math.max(...m.data.map((d) => d.actas));

  return (
    <Panel
      title="Punto de cruce"
      hint="Margen (votos) según el % de actas contabilizadas — dónde el líder cambió de manos"
    >
      <p className="mb-2 text-[13px] leading-relaxed text-ink-1">
        {m.crossAt != null && m.from && m.to ? (
          <>
            <span className="font-semibold" style={{ color: CANDIDATE_COLOR[m.to] }}>
              {name(m.to)} superó a {name(m.from)}
            </span>{" "}
            al{" "}
            <span className="tnum font-semibold" style={{ color: CANDIDATE_COLOR[m.to] }}>
              {m.crossAt.toFixed(2)}%
            </span>{" "}
            del conteo. Hoy, con {m.nowActas.toFixed(2)}% contado, lidera{" "}
            <span className="font-semibold" style={{ color: CANDIDATE_COLOR[m.leaderNow] }}>
              {name(m.leaderNow)}
            </span>{" "}
            por {int(Math.abs(m.nowMargin))}.
          </>
        ) : (
          <>
            En el rango observado ({minA.toFixed(1)}–{maxA.toFixed(1)}% actas) el liderazgo
            no cambió de manos: mantiene la delantera{" "}
            <span className="font-semibold" style={{ color: CANDIDATE_COLOR[m.leaderNow] }}>
              {name(m.leaderNow)}
            </span>{" "}
            por {int(Math.abs(m.nowMargin))} votos.
          </>
        )}
      </p>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={m.data} margin={{ top: 6, right: 8, bottom: 2, left: -12 }}>
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
              domain={[minA, maxA]}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: "#909092", fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            />
            <YAxis
              tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
              tick={{ fill: "#909092", fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Area dataKey="pos" stroke="none" fill="url(#cxS)" isAnimationActive={false} />
            <Area dataKey="neg" stroke="none" fill="url(#cxK)" isAnimationActive={false} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
            <Line dataKey="margin" stroke="#F5F5F7" strokeWidth={2} dot={false} isAnimationActive={false} />
            {m.crossAt != null && (
              <ReferenceLine
                x={m.crossAt}
                stroke="#FFB43C"
                strokeWidth={1.5}
                label={{ value: `cruce ${m.crossAt.toFixed(1)}%`, fill: "#FFB43C", fontSize: 9, position: "insideTopRight" }}
              />
            )}
            {m.crossAt != null && (
              <ReferenceDot x={m.crossAt} y={0} r={4} fill="#FFB43C" stroke="#0A0A0C" strokeWidth={1.5} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-[10px] leading-snug text-ink-3">
        Eje X = % de actas contabilizadas · eje Y = margen en votos (Sánchez − Keiko). Arriba
        del cero lidera Sánchez (verde), abajo Keiko (cian); el cruce marca el cambio de líder.
      </p>
    </Panel>
  );
}
