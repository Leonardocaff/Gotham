"use client";

import { useState } from "react";
import {
  CANDIDATE_COLOR,
  CANDIDATE_SHORT,
  type CandidateKey,
  type ContinentStratum,
  type CountryStratum,
  type Latest,
} from "@/lib/types";
import { int, pct, signedInt, signedPp } from "@/lib/format";

const ACCENT_GOLD = "#FFB43C";

/** Shared shape for the detail view — both a continent and a country satisfy it. */
interface ExteriorUnit {
  name: string;
  votos: Record<CandidateKey, number>;
  pctSanchez: number;
  leader: CandidateKey;
  actasPct: number;
  remainingVotesEst: number;
}

function netLean(u: ExteriorUnit): { leader: CandidateKey; net: number } {
  const frac = u.pctSanchez / 100;
  const netSanchez = u.remainingVotesEst * (2 * frac - 1);
  return netSanchez >= 0
    ? { leader: "sanchez", net: Math.round(Math.abs(netSanchez)) }
    : { leader: "keiko", net: Math.round(Math.abs(netSanchez)) };
}

function Detail({
  unit,
  kicker,
  latest,
}: {
  unit: ExteriorUnit;
  kicker: string;
  latest: Latest;
}) {
  const keikoPct = 100 - unit.pctSanchez;
  const mPp = unit.pctSanchez - keikoPct;
  const marginVotes = unit.votos.sanchez - unit.votos.keiko;
  const lean = netLean(unit);
  const total = unit.votos.sanchez + unit.votos.keiko;
  const nationalPctSanchez = latest.candidates[0].pctValidos;
  const vsCountry = unit.pctSanchez - nationalPctSanchez;
  const weight =
    latest.count.totalVotosValidos > 0
      ? (total / latest.count.totalVotosValidos) * 100
      : 0;

  return (
    <div className="animate-fadeUp">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className="text-[10px] font-medium uppercase tracking-[0.18em]"
            style={{ color: CANDIDATE_COLOR[unit.leader] }}
          >
            {kicker}
          </span>
          <h3 className="truncate font-display text-lg leading-tight text-ink-1">
            {unit.name}
          </h3>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]"
          style={{
            color: CANDIDATE_COLOR[unit.leader],
            borderColor: `${CANDIDATE_COLOR[unit.leader]}40`,
            backgroundColor: `${CANDIDATE_COLOR[unit.leader]}12`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: CANDIDATE_COLOR[unit.leader], boxShadow: `0 0 8px ${CANDIDATE_COLOR[unit.leader]}` }}
          />
          {CANDIDATE_SHORT[unit.leader]}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="flex items-baseline gap-1.5">
            <span className="tnum font-mono text-2xl" style={{ color: CANDIDATE_COLOR.sanchez }}>
              {pct(unit.pctSanchez)}
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
          <div style={{ width: `${unit.pctSanchez}%`, backgroundColor: CANDIDATE_COLOR.sanchez }} />
          <div style={{ width: `${keikoPct}%`, backgroundColor: CANDIDATE_COLOR.keiko }} />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[11px] tnum text-ink-3">
          <span>{int(unit.votos.sanchez)}</span>
          <span>{int(unit.votos.keiko)}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-edge bg-surface-3 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3">Margen</div>
          <div className="tnum font-mono text-sm" style={{ color: CANDIDATE_COLOR[unit.leader] }}>
            {signedInt(marginVotes)}
          </div>
          <div className="tnum font-mono text-[10px] text-ink-3">{signedPp(mPp)}</div>
        </div>
        <div className="rounded-lg border border-edge bg-surface-3 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3">Actas</div>
          <div className="tnum font-mono text-sm text-ink-1">{pct(unit.actasPct)}</div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-1">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, unit.actasPct)}%`,
                backgroundColor: unit.actasPct >= 99 ? CANDIDATE_COLOR.sanchez : ACCENT_GOLD,
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-edge-strong bg-surface-2 px-3 py-2">
        <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
          Inteligencia cruzada
        </div>
        <div className="flex items-baseline justify-between gap-3 py-1">
          <span className="text-[11px] text-ink-3">Votos por contar (est.)</span>
          <span className="text-[12px] text-ink-1">~{int(unit.remainingVotesEst)}</span>
        </div>
        {unit.remainingVotesEst > 0 && (
          <div className="flex items-baseline justify-between gap-3 py-1">
            <span className="text-[11px] text-ink-3">Si lo que falta vota igual</span>
            <span className="text-right text-[12px] text-ink-1">
              aporta <span style={{ color: CANDIDATE_COLOR[lean.leader] }}>~{int(lean.net)} netos</span> a{" "}
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
            {pct(weight, weight < 1 ? 3 : 1)} <span className="text-ink-3">del voto válido</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** A clickable country row inside the continent view. */
function CountryRow({ c, onClick }: { c: CountryStratum; onClick: () => void }) {
  const total = c.votos.sanchez + c.votos.keiko;
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-edge hover:bg-surface-3"
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: CANDIDATE_COLOR[c.leader] }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[12px] text-ink-1">{c.name}</span>
          <span className="tnum shrink-0 font-mono text-[11px]" style={{ color: CANDIDATE_COLOR[c.leader] }}>
            {pct(c.pctSanchez)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full" style={{ width: `${c.pctSanchez}%`, backgroundColor: CANDIDATE_COLOR.sanchez }} />
          </div>
          <span className="tnum shrink-0 font-mono text-[9px] text-ink-3">
            {int(total)} v · {pct(c.actasPct, 0)}
          </span>
        </div>
      </div>
      <span className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-1">›</span>
    </button>
  );
}

export function ContinentCard({
  continent,
  latest,
  onClose,
}: {
  continent: ContinentStratum;
  latest: Latest;
  onClose: () => void;
}) {
  const [country, setCountry] = useState<CountryStratum | null>(null);
  const countries = (latest.exteriorByCountry ?? [])
    .filter((c) => c.continentCode === continent.code)
    .sort((a, b) => b.votos.sanchez + b.votos.keiko - (a.votos.sanchez + a.votos.keiko));

  return (
    <div className="glass-2 flex flex-col p-4">
      <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-edge-strong sm:hidden" />

      {/* breadcrumb */}
      <div className="flex items-start justify-between gap-2">
        <nav className="flex flex-wrap items-center gap-x-1 text-[11px]">
          <button onClick={onClose} className="rounded text-ink-3 transition-colors hover:text-ink-1">
            Exterior
          </button>
          <span className="text-ink-3">›</span>
          {country ? (
            <button onClick={() => setCountry(null)} className="rounded text-ink-3 transition-colors hover:text-ink-1">
              {continent.name}
            </button>
          ) : (
            <span className="text-ink-1">{continent.name}</span>
          )}
          {country && (
            <>
              <span className="text-ink-3">›</span>
              <span className="text-ink-1">{country.name}</span>
            </>
          )}
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

      {country ? (
        <Detail unit={country} kicker="País · voto exterior" latest={latest} />
      ) : (
        <>
          <Detail unit={continent} kicker="Continente · voto exterior" latest={latest} />
          {countries.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
                Países <span className="tnum font-mono">({countries.length})</span>
              </div>
              <div className="-mr-1 max-h-[260px] space-y-0.5 overflow-y-auto pr-1">
                {countries.map((c) => (
                  <CountryRow key={c.code} c={c} onClick={() => setCountry(c)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
