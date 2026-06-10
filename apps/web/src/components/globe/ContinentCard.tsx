"use client";

import {
  CANDIDATE_COLOR,
  CANDIDATE_SHORT,
  type CandidateKey,
  type ContinentStratum,
  type Latest,
} from "@/lib/types";
import { int, pct, signedInt, signedPp } from "@/lib/format";

const ACCENT_GOLD = "#FFB43C";

/** Net votes the still-uncounted pool would hand the leader if it broke like
 * what's already counted. Positive magnitude toward `leader`. */
function netLean(c: ContinentStratum): { leader: CandidateKey; net: number } {
  const frac = c.pctSanchez / 100;
  const netSanchez = c.remainingVotesEst * (2 * frac - 1);
  return netSanchez >= 0
    ? { leader: "sanchez", net: Math.round(Math.abs(netSanchez)) }
    : { leader: "keiko", net: Math.round(Math.abs(netSanchez)) };
}

/** Live detail card for a clicked exterior continent. Mirrors the domestic
 * UnitCard so the foreign vote reads with the same fidelity as a department. */
export function ContinentCard({
  continent,
  latest,
  onClose,
}: {
  continent: ContinentStratum;
  latest: Latest;
  onClose: () => void;
}) {
  const keikoPct = 100 - continent.pctSanchez;
  const mPp = continent.pctSanchez - keikoPct;
  const marginVotes = continent.votos.sanchez - continent.votos.keiko;
  const lean = netLean(continent);
  const total = continent.votos.sanchez + continent.votos.keiko;

  const nationalPctSanchez = latest.candidates[0].pctValidos;
  const vsCountry = continent.pctSanchez - nationalPctSanchez;
  const weight =
    latest.count.totalVotosValidos > 0
      ? (total / latest.count.totalVotosValidos) * 100
      : 0;

  return (
    <div className="glass-2 flex flex-col p-4">
      {/* mobile grab handle */}
      <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-edge-strong sm:hidden" />

      <div className="flex items-start justify-between gap-2">
        <nav className="flex items-center gap-x-1 text-[11px]">
          <button
            onClick={onClose}
            className="rounded text-ink-3 transition-colors hover:text-ink-1"
          >
            Exterior
          </button>
          <span className="text-ink-3">›</span>
          <span className="text-ink-1">{continent.name}</span>
        </nav>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="shrink-0 rounded-md border border-edge px-2 py-1 text-[11px] text-ink-3 transition-colors hover:border-edge-strong hover:text-ink-1 active:bg-surface-3"
        >
          ✕
        </button>
      </div>

      <div className="my-3 h-px w-full bg-edge" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className="text-[10px] font-medium uppercase tracking-[0.18em]"
            style={{ color: CANDIDATE_COLOR[continent.leader] }}
          >
            Continente · voto exterior
          </span>
          <h3 className="truncate font-display text-lg leading-tight text-ink-1">
            {continent.name}
          </h3>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]"
          style={{
            color: CANDIDATE_COLOR[continent.leader],
            borderColor: `${CANDIDATE_COLOR[continent.leader]}40`,
            backgroundColor: `${CANDIDATE_COLOR[continent.leader]}12`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: CANDIDATE_COLOR[continent.leader],
              boxShadow: `0 0 8px ${CANDIDATE_COLOR[continent.leader]}`,
            }}
          />
          {CANDIDATE_SHORT[continent.leader]}
        </span>
      </div>

      {/* Split */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="flex items-baseline gap-1.5">
            <span className="tnum font-mono text-2xl" style={{ color: CANDIDATE_COLOR.sanchez }}>
              {pct(continent.pctSanchez)}
            </span>
            <span className="text-[11px] text-ink-3">Sánchez</span>
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-[11px] text-ink-3">Keiko</span>
            <span className="tnum font-mono text-2xl" style={{ color: CANDIDATE_COLOR.keiko }}>
              {pct(keikoPct)}
            </span>
          </span>
        </div>
        <div className="flex w-full overflow-hidden rounded-full bg-surface-3" style={{ height: 10 }}>
          <div style={{ width: `${continent.pctSanchez}%`, backgroundColor: CANDIDATE_COLOR.sanchez }} />
          <div style={{ width: `${keikoPct}%`, backgroundColor: CANDIDATE_COLOR.keiko }} />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[11px] tnum text-ink-3">
          <span>{int(continent.votos.sanchez)}</span>
          <span>{int(continent.votos.keiko)}</span>
        </div>
      </div>

      {/* Margin + actas */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-edge bg-surface-3 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3">Margen</div>
          <div className="tnum font-mono text-sm" style={{ color: CANDIDATE_COLOR[continent.leader] }}>
            {signedInt(marginVotes)}
          </div>
          <div className="tnum font-mono text-[10px] text-ink-3">{signedPp(mPp)}</div>
        </div>
        <div className="rounded-lg border border-edge bg-surface-3 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3">Actas</div>
          <div className="tnum font-mono text-sm text-ink-1">{pct(continent.actasPct)}</div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-1">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, continent.actasPct)}%`,
                backgroundColor: continent.actasPct >= 99 ? CANDIDATE_COLOR.sanchez : ACCENT_GOLD,
              }}
            />
          </div>
        </div>
      </div>

      {/* Cross-ref */}
      <div className="mt-3 rounded-lg border border-edge-strong bg-surface-2 px-3 py-2">
        <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
          Inteligencia cruzada
        </div>
        <div className="flex items-baseline justify-between gap-3 py-1">
          <span className="text-[11px] text-ink-3">Votos por contar (est.)</span>
          <span className="text-[12px] text-ink-1">~{int(continent.remainingVotesEst)}</span>
        </div>
        {continent.remainingVotesEst > 0 && (
          <div className="flex items-baseline justify-between gap-3 py-1">
            <span className="text-[11px] text-ink-3">Si lo que falta vota igual</span>
            <span className="text-right text-[12px] text-ink-1">
              aporta{" "}
              <span style={{ color: CANDIDATE_COLOR[lean.leader] }}>~{int(lean.net)} netos</span> a{" "}
              {CANDIDATE_SHORT[lean.leader]}
            </span>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3 py-1">
          <span className="text-[11px] text-ink-3">vs. el país</span>
          <span className="text-right text-[12px]">
            <span style={{ color: vsCountry >= 0 ? CANDIDATE_COLOR.sanchez : CANDIDATE_COLOR.keiko }}>
              {signedPp(vsCountry)}
            </span>{" "}
            <span className="text-ink-3">más pro-{vsCountry >= 0 ? "Sánchez" : "Keiko"}</span>
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-1">
          <span className="text-[11px] text-ink-3">Peso nacional</span>
          <span className="text-right text-[12px] text-ink-1">
            {pct(weight, weight < 1 ? 2 : 1)}{" "}
            <span className="text-ink-3">del voto válido</span>
          </span>
        </div>
      </div>
    </div>
  );
}
