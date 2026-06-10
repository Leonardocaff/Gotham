"use client";

import type { Decision, Latest } from "@/lib/types";
import { CANDIDATE_COLOR } from "@/lib/types";
import { pct } from "@/lib/format";
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

      <div className="flex items-center justify-center gap-2 text-[11px] text-ink-3">
        <span>Final proyectado</span>
        <span className="tnum font-mono text-ink-2">
          {pct(projection.final_pct.sanchez.median, 2)}
        </span>
        <span className="text-ink-3">·</span>
        <span className="tnum font-mono text-ink-2">
          {pct(projection.final_pct.keiko.median, 2)}
        </span>
      </div>
    </section>
  );
}
