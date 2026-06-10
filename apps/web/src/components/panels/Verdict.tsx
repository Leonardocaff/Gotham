"use client";

import type { Decision, Latest } from "@/lib/types";
import { CANDIDATE_COLOR } from "@/lib/types";
import { int, pct, signedInt, signedPp } from "@/lib/format";
import { LiveNum } from "@/components/ui/atoms";

function decisionColor(d: Decision, leaderColor: string): string {
  if (d === "DECIDIDO") return leaderColor;
  if (d === "INCLINADO") return "#FFB43C";
  return "#FF7A8A"; // INDECIDIBLE
}

function WinMeter({
  label,
  p,
  color,
  align,
  compact,
}: {
  label: string;
  p: number;
  color: string;
  align: "left" | "right";
  compact?: boolean;
}) {
  const value = p * 100;
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-ink-3">
        {label}
      </div>
      <LiveNum
        value={value}
        display={`${value.toFixed(1)}%`}
        className={
          compact
            ? "block text-2xl font-semibold leading-none sm:text-3xl"
            : "block text-4xl font-semibold leading-none sm:text-5xl"
        }
        color={color}
      />
      <div
        className={`mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3 ${
          align === "right" ? "rotate-180" : ""
        }`}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, backgroundColor: color, boxShadow: `0 0 12px ${color}88` }}
        />
      </div>
    </div>
  );
}

export function Verdict({
  latest,
  compact = false,
}: {
  latest: Latest;
  /** HUD mode: tighter, stronger glass, floats over the globe. */
  compact?: boolean;
}) {
  const { projection } = latest;
  const leaderColor = CANDIDATE_COLOR[projection.leader];
  const dColor = decisionColor(projection.decision, leaderColor);
  const marginVotes = projection.final_margin.median_votes;
  const marginColor = marginVotes >= 0 ? CANDIDATE_COLOR.sanchez : CANDIDATE_COLOR.keiko;
  const [mLo, mHi] = projection.final_margin.ci90_votes;
  const crossesZero = projection.bounds.straddles_zero;

  return (
    <section
      className={
        compact
          ? "hud-card lift animate-fadeUp flex w-[290px] max-w-[88vw] flex-col gap-4 p-4"
          : "glass lift animate-fadeUp flex flex-col gap-5 p-5 sm:p-6"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-3">
            Veredicto del modelo
          </span>
          <span
            className="rounded-md border px-3 py-1 font-display text-sm font-semibold uppercase tracking-[0.12em]"
            style={{
              color: dColor,
              borderColor: `${dColor}55`,
              backgroundColor: `${dColor}14`,
            }}
          >
            {projection.decision}
          </span>
        </div>
        {!compact && (
          <span className="text-[11px] uppercase tracking-[0.14em] text-ink-3">
            Líder proyectado:{" "}
            <span style={{ color: leaderColor }}>
              {projection.leader === "sanchez" ? "Sánchez" : "Keiko"}
            </span>
          </span>
        )}
      </div>

      {!compact && (
        <p className="max-w-3xl text-sm leading-relaxed text-ink-2">
          {projection.decision_reason}
        </p>
      )}

      <div
        className={
          compact
            ? "grid grid-cols-2 items-end gap-4"
            : "grid grid-cols-2 items-end gap-6 sm:gap-12"
        }
      >
        <WinMeter
          label="P(victoria) Sánchez"
          p={projection.p_win.sanchez}
          color={CANDIDATE_COLOR.sanchez}
          align="left"
          compact={compact}
        />
        <WinMeter
          label="P(victoria) Keiko"
          p={projection.p_win.keiko}
          color={CANDIDATE_COLOR.keiko}
          align="right"
          compact={compact}
        />
      </div>

      {/* Projected margin + final split — the substance behind the verdict. */}
      {!compact && (
        <div className="grid grid-cols-2 gap-3 border-t border-edge pt-4">
          <div className="rounded-lg border border-edge bg-surface-3 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3">
              Margen proyectado
            </div>
            <div
              className="tnum mt-1 font-mono text-lg font-semibold leading-none"
              style={{ color: marginColor }}
            >
              {signedInt(marginVotes)}
            </div>
            <div className="tnum mt-1 font-mono text-[10px] text-ink-3">
              IC90 [{int(mLo)} … {int(mHi)}] · {signedPp(projection.final_margin.median_pct)}
            </div>
          </div>
          <div className="rounded-lg border border-edge bg-surface-3 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3">
              Final % (válidos)
            </div>
            <div className="tnum mt-1 flex items-baseline gap-2 font-mono text-lg font-semibold leading-none">
              <span style={{ color: CANDIDATE_COLOR.sanchez }}>
                {pct(projection.final_pct.sanchez.median, 1)}
              </span>
              <span className="text-[11px] font-normal text-ink-3">·</span>
              <span style={{ color: CANDIDATE_COLOR.keiko }}>
                {pct(projection.final_pct.keiko.median, 1)}
              </span>
            </div>
            <div
              className="mt-1 text-[10px]"
              style={{ color: crossesZero ? "#FF7A8A" : "#909092" }}
            >
              {crossesZero ? "el IC del margen cruza el cero" : "IC del margen no cruza cero"}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
