"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useLiveData } from "@/lib/useLiveData";
import type { GlobeSelection } from "@/components/globe/Globe";
import { DrillDown } from "@/components/globe/DrillDown";
import { Header } from "@/components/panels/Header";
import { Verdict } from "@/components/panels/Verdict";
import { FinalVotesHero } from "@/components/panels/FinalVotesHero";
import { NowVsProjection } from "@/components/panels/NowVsProjection";
import { Uncertainty } from "@/components/panels/Uncertainty";
import { Methods } from "@/components/panels/Methods";
import { ActasComposition } from "@/components/panels/ActasComposition";
import { ContestedGrid } from "@/components/panels/ContestedGrid";
import { Sensitivity } from "@/components/panels/Sensitivity";
import { ManskiBounds } from "@/components/panels/ManskiBounds";
import { Exterior } from "@/components/panels/Exterior";
import { TimeSeries } from "@/components/panels/TimeSeries";
import { Strata } from "@/components/panels/Strata";
import { Caveat } from "@/components/panels/Caveat";

// Mapbox touches window — load client-only, no SSR.
const Globe = dynamic(() => import("@/components/globe/Globe"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-edge bg-surface-1">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
        Inicializando globo…
      </span>
    </div>
  ),
});

export default function Page() {
  const { latest, history, error, loading } = useLiveData();
  const [selection, setSelection] = useState<GlobeSelection>(null);

  if (loading && !latest) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 animate-pulseDot rounded-full bg-accent-cyan" />
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-ink-3">
            Cargando contrato de datos…
          </span>
        </div>
      </main>
    );
  }

  if (error && !latest) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="glass max-w-md p-6 text-center">
          <h2 className="font-display text-sm uppercase tracking-[0.18em] text-accent-rose">
            Sin datos
          </h2>
          <p className="mt-2 text-xs text-ink-3">
            No se pudo leer{" "}
            <code className="font-mono text-ink-2">/data/latest.json</code>: {error}
          </p>
        </div>
      </main>
    );
  }

  if (!latest) return null;

  return (
    <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
      <Header latest={latest} />

      {/* Money shot: projected final absolute vote counts */}
      <div className="mt-5">
        <FinalVotesHero latest={latest} />
      </div>

      {/* Hero row: globe + verdict / now-vs-projection */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="relative lg:col-span-7">
          <div className="h-[460px] sm:h-[560px]">
            <Globe
              strata={latest.strata}
              continents={latest.exteriorByContinent}
              selection={selection}
              onSelect={setSelection}
            />
          </div>
          <DrillDown selection={selection} onClose={() => setSelection(null)} />
          <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3 rounded-lg border border-edge bg-surface-1/80 px-3 py-1.5 text-[10px] backdrop-blur">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent-emerald" /> Sánchez
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent-cyan" /> Keiko
            </span>
            <span className="text-ink-3">intensidad = margen</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <Verdict latest={latest} />
          <NowVsProjection latest={latest} />
        </div>
      </div>

      {/* Analyst grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Methods latest={latest} />
        <Uncertainty latest={latest} />
        <ManskiBounds latest={latest} />
        <ActasComposition latest={latest} />
        <Sensitivity latest={latest} />
        <Exterior latest={latest} />
      </div>

      {/* Wide row: contested grid + time series */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ContestedGrid latest={latest} />
        </div>
        <div className="lg:col-span-5">
          <TimeSeries history={history} />
        </div>
      </div>

      {/* Departments leaderboard */}
      <div className="mt-4">
        <Strata
          strata={latest.strata}
          selectedCode={
            selection?.kind === "dept" ? selection.data.code : undefined
          }
          onSelect={(s) => setSelection({ kind: "dept", data: s })}
        />
      </div>

      <Caveat latest={latest} />

      <div className="mt-6 flex items-center justify-between border-t border-edge pt-4 text-[10px] uppercase tracking-[0.16em] text-ink-3">
        <span>Project Gotham · Inteligencia Electoral</span>
        <span className="font-mono">
          Fuente: {latest.source.portal} · idEleccion {latest.source.idEleccion}
        </span>
      </div>
    </main>
  );
}
