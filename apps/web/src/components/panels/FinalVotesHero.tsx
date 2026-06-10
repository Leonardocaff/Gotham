"use client";

import { useMemo } from "react";
import type { Latest, CandidateKey } from "@/lib/types";
import { CANDIDATE_COLOR } from "@/lib/types";
import { int, pct, signedInt, signedPp } from "@/lib/format";
import { useCountUp } from "@/lib/useCountUp";
import { useChangeFlash } from "@/lib/useLiveData";

const EMERALD = CANDIDATE_COLOR.sanchez;
const CYAN = CANDIDATE_COLOR.keiko;

/** Big animated vote counter with a delta-vs-now chevron underneath. */
function Counter({
  name,
  party,
  color,
  target,
  ci,
  finalPct,
  delta,
  align,
  leading,
}: {
  name: string;
  party: string;
  color: string;
  target: number;
  ci: [number, number];
  finalPct: number;
  delta: number;
  align: "left" | "right";
  leading: boolean;
}) {
  const animated = useCountUp(target);
  const flash = useChangeFlash(target);
  const right = align === "right";

  return (
    <div
      className={`flex min-w-0 flex-col ${right ? "items-end text-right" : "items-start text-left"}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}aa` }}
        />
        <span className="truncate text-[13px] font-medium text-ink-1 sm:text-sm">
          {name}
        </span>
        {leading && (
          <span
            className="shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]"
            style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
          >
            Líder
          </span>
        )}
      </div>
      <span className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-3">
        {party}
      </span>

      <span
        className={`tnum mt-3 max-w-full truncate font-mono text-[1.6rem] font-semibold leading-none tracking-tight min-[400px]:text-[2rem] sm:text-4xl lg:text-[1.75rem] xl:text-[2rem] ${
          flash ? "animate-flash" : ""
        }`}
        style={{
          color,
          textShadow: leading ? `0 0 28px ${color}55` : "none",
        }}
      >
        {int(animated)}
      </span>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] tnum text-ink-3">
        <span style={{ color }}>{pct(finalPct, 2)}</span>
        <span className="text-ink-3">·</span>
        <span>
          {delta >= 0 ? "▲" : "▼"} {signedInt(delta)} vs ahora
        </span>
      </div>
      <div className="mt-1 font-mono text-[10px] tnum text-ink-3">
        IC90 [{int(ci[0])} – {int(ci[1])}]
      </div>
    </div>
  );
}

/**
 * Head-to-head bar split by the two projected totals. The CI90 of each side is
 * rendered as a translucent band; where the bands cross the divider they form an
 * overlap zone — the visual proof that the race is too close to call.
 */
function HeadToHeadBar({
  sVotes,
  kVotes,
  sCi,
  kCi,
  leader: _leader,
}: {
  sVotes: number;
  kVotes: number;
  sCi: [number, number];
  kCi: [number, number];
  leader: CandidateKey;
}) {
  const total = sVotes + kVotes;
  const sPct = (sVotes / total) * 100;

  // CI90 reach of each candidate's share, expressed as % of the combined total,
  // so we can draw the uncertainty straddling the central divider.
  const sLoPct = (sCi[0] / (sCi[0] + kCi[1])) * 100; // Sánchez worst case
  const sHiPct = (sCi[1] / (sCi[1] + kCi[0])) * 100; // Sánchez best case
  const bandLeft = Math.min(sLoPct, sHiPct, sPct);
  const bandRight = Math.max(sLoPct, sHiPct, sPct);
  const overlaps = bandLeft < sPct && bandRight > sPct;

  return (
    <div className="select-none">
      <div className="relative h-9 w-full overflow-hidden rounded-lg bg-surface-3">
        {/* Sánchez fill */}
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
          style={{
            width: `${sPct}%`,
            background: `linear-gradient(90deg, ${EMERALD}33, ${EMERALD}cc)`,
          }}
        />
        {/* Keiko fill */}
        <div
          className="absolute inset-y-0 right-0 transition-[width] duration-700 ease-out"
          style={{
            width: `${100 - sPct}%`,
            background: `linear-gradient(270deg, ${CYAN}33, ${CYAN}cc)`,
          }}
        />
        {/* CI90 overlap band — translucent gold straddling the split */}
        <div
          className="absolute inset-y-0"
          style={{
            left: `${bandLeft}%`,
            width: `${Math.max(0, bandRight - bandLeft)}%`,
            background:
              "repeating-linear-gradient(45deg, rgba(255,180,60,0.22) 0 6px, rgba(255,180,60,0.08) 6px 12px)",
            borderLeft: "1px solid rgba(255,180,60,0.5)",
            borderRight: "1px solid rgba(255,180,60,0.5)",
          }}
          title="Zona de incertidumbre IC90 — los intervalos se solapan"
        />
        {/* central divider at the median split */}
        <div
          className="absolute inset-y-0 w-px bg-white/30"
          style={{ left: `${sPct}%` }}
        />
        {/* sheen */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[10px] tnum text-ink-3">
        <span style={{ color: EMERALD }}>{int(sVotes)}</span>
        <span className="hidden items-center gap-1.5 text-center text-[9px] uppercase tracking-[0.14em] sm:flex">
          <span
            className="inline-block h-2 w-2 rounded-[2px]"
            style={{
              background:
                "repeating-linear-gradient(45deg, rgba(255,180,60,0.5) 0 2px, transparent 2px 4px)",
            }}
          />
          {overlaps ? "Los IC90 se solapan en el divisor" : "Líder fuera del IC del rival"}
        </span>
        <span style={{ color: CYAN }}>{int(kVotes)}</span>
      </div>
    </div>
  );
}

export function FinalVotesHero({ latest }: { latest: Latest }) {
  const { projection, candidates } = latest;
  const fv = projection.final_votes;
  const [sCand, kCand] = candidates;

  const leaderColor = CANDIDATE_COLOR[projection.leader];
  const marginVotes = projection.final_margin.median_votes;
  const marginCi = projection.final_margin.ci90_votes;
  const pWinLeader = projection.p_win[projection.leader];

  const deltas = useMemo(
    () => ({
      sanchez: fv.sanchez.median - sCand.votes,
      keiko: fv.keiko.median - kCand.votes,
    }),
    [fv, sCand.votes, kCand.votes],
  );

  // The leader's vote lead, shown as an absolute (the margin sign is relative
  // to Sánchez in the contract; here we always present it from the leader's POV).
  const leadVotes = Math.abs(marginVotes);

  return (
    <section className="glass lift animate-fadeUp relative overflow-hidden p-5 sm:p-7">
      {/* ambient leader glow */}
      <div
        className="pointer-events-none absolute -top-24 h-48 w-48 rounded-full opacity-30 blur-3xl"
        style={{
          left: projection.leader === "sanchez" ? "8%" : "auto",
          right: projection.leader === "keiko" ? "8%" : "auto",
          background: leaderColor,
        }}
      />

      <header className="relative mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-ink-1">
            Proyección Final · Votos
          </h2>
          <span className="text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Totales absolutos proyectados · IC 90%
          </span>
        </div>
        <span
          className="rounded-md border px-3 py-1 font-mono text-xs font-semibold tnum"
          style={{
            color: leaderColor,
            borderColor: `${leaderColor}55`,
            backgroundColor: `${leaderColor}14`,
          }}
        >
          P(victoria) {projection.leader === "sanchez" ? "Sánchez" : "Keiko"}{" "}
          {pct(pWinLeader * 100, 1)}
        </span>
      </header>

      <div className="relative grid grid-cols-2 items-start gap-3 sm:gap-10">
        <Counter
          name="Roberto Sánchez"
          party={sCand.party}
          color={EMERALD}
          target={fv.sanchez.median}
          ci={fv.sanchez.ci90}
          finalPct={projection.final_pct.sanchez.median}
          delta={deltas.sanchez}
          align="left"
          leading={projection.leader === "sanchez"}
        />
        <Counter
          name="Keiko Fujimori"
          party={kCand.party}
          color={CYAN}
          target={fv.keiko.median}
          ci={fv.keiko.ci90}
          finalPct={projection.final_pct.keiko.median}
          delta={deltas.keiko}
          align="right"
          leading={projection.leader === "keiko"}
        />
      </div>

      <div className="relative mt-5 sm:mt-6">
        <HeadToHeadBar
          sVotes={fv.sanchez.median}
          kVotes={fv.keiko.median}
          sCi={fv.sanchez.ci90}
          kCi={fv.keiko.ci90}
          leader={projection.leader}
        />
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-3 border-t border-edge pt-4 sm:mt-6 sm:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Ventaja líder
          </div>
          <div className="tnum mt-1 font-mono text-base sm:text-lg" style={{ color: leaderColor }}>
            {int(leadVotes)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Margen (votos)
          </div>
          <div
            className="tnum mt-1 font-mono text-base sm:text-lg"
            style={{ color: marginVotes >= 0 ? EMERALD : CYAN }}
          >
            {signedInt(marginVotes)}
          </div>
          <div className="tnum mt-0.5 font-mono text-[10px] text-ink-3">
            IC90 [{int(marginCi[0])} … {int(marginCi[1])}]
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Margen (pp)
          </div>
          <div
            className="tnum mt-1 font-mono text-base sm:text-lg"
            style={{ color: projection.final_margin.median_pct >= 0 ? EMERALD : CYAN }}
          >
            {signedPp(projection.final_margin.median_pct)}
          </div>
          <div className="tnum mt-0.5 font-mono text-[10px] text-ink-3">
            {projection.bounds.straddles_zero ? "cruza el cero" : "no cruza cero"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Total válidos proy.
          </div>
          <div className="tnum mt-1 font-mono text-base text-ink-1 sm:text-lg">{int(fv.total)}</div>
          <div className="tnum mt-0.5 font-mono text-[10px] text-ink-3">
            {pct(latest.count.actasContabilizadasPct, 1)} actas
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Slim summary chip that floats over the globe (desktop only). Shows just the
 * two projected totals + the leader badge — enough to read the headline at a
 * glance without burying the planet. The full detailed readout lives in the
 * card below the globe. Fully contained: fixed max width, no transforms.
 */
export function FinalVotesChip({ latest }: { latest: Latest }) {
  const { projection } = latest;
  const fv = projection.final_votes;
  const leaderColor = CANDIDATE_COLOR[projection.leader];
  const leaderName = projection.leader === "sanchez" ? "Sánchez" : "Keiko";

  return (
    <div className="hud-card flex items-center gap-4 px-4 py-2.5">
      <div className="flex flex-col items-start text-left">
        <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-ink-3">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: EMERALD }}
          />
          Sánchez
        </span>
        <span
          className="tnum font-mono text-lg font-semibold leading-none"
          style={{ color: EMERALD }}
        >
          {int(fv.sanchez.median)}
        </span>
      </div>

      <div className="h-8 w-px bg-edge-strong" />

      <div className="flex flex-col items-end text-right">
        <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-ink-3">
          Keiko
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: CYAN }}
          />
        </span>
        <span
          className="tnum font-mono text-lg font-semibold leading-none"
          style={{ color: CYAN }}
        >
          {int(fv.keiko.median)}
        </span>
      </div>

      <div className="h-8 w-px bg-edge-strong" />

      <div className="flex flex-col items-start">
        <span className="text-[9px] uppercase tracking-[0.14em] text-ink-3">
          Proyección · líder
        </span>
        <span
          className="text-sm font-semibold leading-none"
          style={{ color: leaderColor }}
        >
          {leaderName}
        </span>
      </div>
    </div>
  );
}
