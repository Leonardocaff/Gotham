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
import { pct } from "@/lib/format";

// Mapbox touches window — load client-only, no SSR.
const Globe = dynamic(() => import("@/components/globe/Globe"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[360px] items-center justify-center">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
        Inicializando globo…
      </span>
    </div>
  ),
});

/** Wrapper that adds the staggered idle-float drift to a grid cell. The
 * className passthrough lets the float wrapper carry the grid col-span so it
 * stays a direct child of the grid. Idle-float is suppressed under ~md via CSS
 * so phones stay still (perf + no jitter). */
function Float({
  delay,
  className = "",
  children,
}: {
  delay: 0 | 1 | 2 | 3 | 4 | 5;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`idle-float fl-${delay} ${className}`}>{children}</div>;
}

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
    <main className="relative mx-auto max-w-[1480px] overflow-x-clip px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <Header latest={latest} />

      {/* ── Cinematic globe hero ───────────────────────────────────────────
       * The planet floats borderless in deep space. On desktop, HUD cards hover
       * over the corners and the projected-votes hero overlaps the lower third
       * for depth. On phones the globe is shorter and the HUD collapses to a
       * single status chip — Verdict, legend and votes simply stack below.
       */}
      <section className="relative mt-6">
        {/* ambient glow pooled behind the planet */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[60vh] opacity-70"
          style={{
            background:
              "radial-gradient(720px 460px at 50% 34%, rgba(74,158,255,0.10), transparent 70%), radial-gradient(820px 520px at 50% 60%, rgba(61,217,160,0.08), transparent 72%)",
          }}
        />

        {/* Globe band — shorter on phones so it doesn't eat the first screen,
            tall and near full-bleed on desktop. */}
        <div className="relative h-[52vh] min-h-[340px] sm:h-[64vh] sm:min-h-[480px] lg:h-[74vh]">
          <Globe
            strata={latest.strata}
            continents={latest.exteriorByContinent}
            selection={selection}
            onSelect={setSelection}
          />

          {/* HUD: live status / actas — top-left. The minimal chip we always
              keep over the globe. */}
          <div className="hud-card lift animate-fadeUp pointer-events-auto absolute left-3 top-3 z-20 flex items-center gap-2.5 px-3 py-2 sm:left-5 sm:top-5 sm:gap-3 sm:px-3.5 sm:py-2.5">
            <span className="h-2 w-2 animate-pulseDot rounded-full bg-accent-rose shadow-[0_0_10px_#FF7A8A]" />
            <div className="leading-tight">
              <div className="text-[9px] uppercase tracking-[0.16em] text-ink-3">
                Actas contabilizadas
              </div>
              <div className="tnum font-mono text-sm text-ink-1">
                {pct(latest.count.actasContabilizadasPct, 2)}
              </div>
            </div>
          </div>

          {/* HUD: verdict — top-right (desktop only; mobile/tablet get a full
              card below the hero). */}
          <div className="absolute right-3 top-3 z-20 hidden lg:block">
            <Verdict latest={latest} compact />
          </div>

          {/* HUD: legend — bottom-left, desktop only (mobile gets the slim
              caption rendered under the globe band). */}
          <div className="hud-card pointer-events-none absolute bottom-3 left-3 z-20 hidden items-center gap-3 px-3 py-1.5 text-[10px] sm:bottom-5 sm:left-5 sm:flex">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent-emerald" /> Sánchez
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent-cyan" /> Keiko
            </span>
            <span className="text-ink-3">intensidad = margen</span>
          </div>

          {/* Drill-down: on phones it renders as a bottom sheet (handled inside
              DrillDown); on desktop it floats top-right, pushed below the
              verdict HUD via the offset wrapper. */}
          <div className="lg:[&>*]:!top-[230px]">
            <DrillDown selection={selection} onClose={() => setSelection(null)} />
          </div>
        </div>

        {/* Mobile legend caption — replaces the floating legend HUD on phones. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[10px] text-ink-3 sm:hidden">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-emerald" /> Sánchez
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-cyan" /> Keiko
          </span>
          <span>intensidad = margen · toca un departamento para enfocar</span>
        </div>

        {/* Projected-votes hero — overlaps the lower third of the globe on
            desktop; on phones it simply sits below the globe (no overlap). */}
        <div className="relative z-30 mt-5 px-0 sm:-mt-24 sm:px-6 lg:px-12">
          <FinalVotesHero latest={latest} />
        </div>
      </section>

      {/* Verdict as a full card on screens without the HUD overlay */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:hidden">
        <Verdict latest={latest} />
      </div>

      {/* ── Floating analyst grid ──────────────────────────────────────────
       * Every card a floating pane of glass, gently drifting in place. */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Float delay={0}>
          <Methods latest={latest} />
        </Float>
        <Float delay={1}>
          <Uncertainty latest={latest} />
        </Float>
        <Float delay={2}>
          <ManskiBounds latest={latest} />
        </Float>
        <Float delay={3}>
          <ActasComposition latest={latest} />
        </Float>
        <Float delay={4}>
          <Sensitivity latest={latest} />
        </Float>
        <Float delay={5}>
          <Exterior latest={latest} />
        </Float>
      </div>

      {/* Wide row: contested grid + time series */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Float delay={1} className="lg:col-span-7">
          <ContestedGrid latest={latest} />
        </Float>
        <Float delay={3} className="lg:col-span-5">
          <TimeSeries history={history} />
        </Float>
      </div>

      {/* Now vs Projection + Departments leaderboard */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Float delay={2} className="lg:col-span-5">
          <NowVsProjection latest={latest} />
        </Float>
        <Float delay={0} className="lg:col-span-7">
          <Strata
            strata={latest.strata}
            selectedCode={
              selection?.kind === "dept" ? selection.data.code : undefined
            }
            onSelect={(s) => setSelection({ kind: "dept", data: s })}
          />
        </Float>
      </div>

      <div className="mt-4">
        <Caveat latest={latest} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-edge pt-4 text-[10px] uppercase tracking-[0.16em] text-ink-3">
        <span>Project Gotham · Inteligencia Electoral</span>
        <span className="font-mono">
          Fuente: {latest.source.portal} · idEleccion {latest.source.idEleccion}
        </span>
      </div>
    </main>
  );
}
