"use client";

import type { GlobeSelection } from "./Globe";
import { CANDIDATE_COLOR } from "@/lib/types";
import { int, pct, signedInt } from "@/lib/format";
import { Dot, Rule, Stat } from "@/components/ui/atoms";

function Split({
  sanchezPct,
  sanchezVotes,
  keikoVotes,
}: {
  sanchezPct: number;
  sanchezVotes: number;
  keikoVotes: number;
}) {
  const keikoPct = 100 - sanchezPct;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="flex items-center gap-1.5">
          <Dot color={CANDIDATE_COLOR.sanchez} />
          <span className="text-ink-2">Sánchez</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-ink-2">Keiko</span>
          <Dot color={CANDIDATE_COLOR.keiko} />
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          style={{ width: `${sanchezPct}%`, backgroundColor: CANDIDATE_COLOR.sanchez }}
        />
        <div
          style={{ width: `${keikoPct}%`, backgroundColor: CANDIDATE_COLOR.keiko }}
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-sm tnum">
        <span style={{ color: CANDIDATE_COLOR.sanchez }}>{pct(sanchezPct)}</span>
        <span style={{ color: CANDIDATE_COLOR.keiko }}>{pct(keikoPct)}</span>
      </div>
      <div className="mt-0.5 flex justify-between font-mono text-[11px] tnum text-ink-3">
        <span>{int(sanchezVotes)}</span>
        <span>{int(keikoVotes)}</span>
      </div>
    </div>
  );
}

export function DrillDown({
  selection,
  onClose,
}: {
  selection: GlobeSelection;
  onClose: () => void;
}) {
  if (!selection) return null;

  const leaderColor =
    selection.kind === "dept"
      ? CANDIDATE_COLOR[selection.data.leader]
      : CANDIDATE_COLOR[selection.data.leader];

  return (
    <div
      className="glass-2 animate-fadeUp fixed inset-x-3 bottom-3 z-40 max-h-[70vh] overflow-y-auto p-4 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-3 sm:top-3 sm:z-10 sm:max-h-none sm:w-[290px] sm:overflow-visible"
    >
      {/* mobile grab handle affordance */}
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-edge-strong sm:hidden" />
      <header className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-medium uppercase tracking-[0.18em]"
              style={{ color: leaderColor }}
            >
              {selection.kind === "dept" ? "Departamento" : "Continente"}
            </span>
          </div>
          <h3 className="font-display text-lg leading-tight text-ink-1">
            {selection.kind === "dept"
              ? titleCase(selection.data.name)
              : selection.data.name}
          </h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-md border border-edge px-3 py-1.5 text-[13px] text-ink-3 transition-colors hover:border-edge-strong hover:text-ink-1 active:bg-surface-3 sm:px-2 sm:py-1 sm:text-[11px]"
        >
          ✕
        </button>
      </header>

      <Rule />

      <Split
        sanchezPct={selection.data.pctSanchez}
        sanchezVotes={selection.data.votos.sanchez}
        keikoVotes={selection.data.votos.keiko}
      />

      <Rule />

      {selection.kind === "dept" ? (
        <div className="space-y-1.5">
          <Stat label="Líder">
            <span style={{ color: leaderColor }}>
              {selection.data.leader === "sanchez" ? "Sánchez" : "Keiko"}
            </span>
          </Stat>
          <Stat label="Margen">
            {signedInt(selection.data.votos.sanchez - selection.data.votos.keiko)}
          </Stat>
          <Stat label="Actas %">{pct(selection.data.actasPct)}</Stat>
          <Stat label="Región">
            <span className="text-ink-2">
              {selection.data.region.replace(/_/g, " ")}
            </span>
          </Stat>
          <Stat label="Tipo">{selection.data.rural ? "Rural" : "Urbano"}</Stat>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Stat label="Líder">
            <span style={{ color: leaderColor }}>
              {selection.data.leader === "sanchez" ? "Sánchez" : "Keiko"}
            </span>
          </Stat>
          <Stat label="Actas %">{pct(selection.data.actasPct)}</Stat>
          <Stat label="Votos restantes (est.)">
            {int(selection.data.remainingVotesEst)}
          </Stat>
          <Stat label="Margen">
            {signedInt(selection.data.votos.sanchez - selection.data.votos.keiko)}
          </Stat>
        </div>
      )}
    </div>
  );
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
