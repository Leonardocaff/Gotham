"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useLiveData } from "@/lib/useLiveData";
import { useHierarchy } from "@/lib/useHierarchy";
import type { GlobeSelection } from "@/components/globe/Globe";
import { GeoExplorer, type GeoPath } from "@/components/globe/GeoExplorer";
import { Header } from "@/components/panels/Header";
import { Verdict } from "@/components/panels/Verdict";
import { FinalVotesHero, FinalVotesChip } from "@/components/panels/FinalVotesHero";
import { AnalystBriefing } from "@/components/panels/AnalystBriefing";
import { NowVsProjection } from "@/components/panels/NowVsProjection";
import { Uncertainty } from "@/components/panels/Uncertainty";
import { Methods } from "@/components/panels/Methods";
import { ActasComposition } from "@/components/panels/ActasComposition";
import { ContestedGrid } from "@/components/panels/ContestedGrid";
import { Sensitivity } from "@/components/panels/Sensitivity";
import { OvertakeThreshold } from "@/components/panels/OvertakeThreshold";
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
  const hierarchy = useHierarchy();
  // `selection` drives the globe (fly + highlight). `geoPath` drives the
  // explorer panel (dep → prov → dist). They are kept in sync: a globe click
  // sets both; an explorer drill sets geoPath and points selection at the
  // PARENT department so the planet flies to / highlights it.
  const [selection, setSelection] = useState<GlobeSelection>(null);
  const [geoPath, setGeoPath] = useState<GeoPath | null>(null);

  // Globe → page. A dept selection opens the explorer at that department; a
  // continent selection or null is handled but doesn't drive the geo explorer.
  const onGlobeSelect = useCallback((sel: GlobeSelection) => {
    setSelection(sel);
    if (sel?.kind === "dept") setGeoPath({ depCode: sel.data.code });
    else if (sel === null) setGeoPath(null);
  }, []);

  // Explorer → page. Drilling updates the path AND re-points the globe at the
  // parent department (we only have department polygons). `latest` strata share
  // their code with hierarchy departments, so the join is by code.
  const onExplorerNavigate = useCallback(
    (next: GeoPath | null) => {
      setGeoPath(next);
      if (!next) {
        setSelection(null);
        return;
      }
      const dep = latest?.strata.find((s) => s.code === next.depCode);
      if (dep) setSelection({ kind: "dept", data: dep });
    },
    [latest],
  );

  const onExplorerClose = useCallback(() => {
    setGeoPath(null);
    setSelection(null);
  }, []);

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
       * The planet is the immersive stage and it stays CLEAR. Only lightweight
       * HUD chips float over it, all anchored to the globe container with safe
       * positive insets so nothing escapes the centred column:
       *   · live-status chip      top-left
       *   · candidate legend      bottom-left (fully visible)
       *   · Verdict glass HUD     top-right (compact)
       *   · FinalVotes summary    bottom-centre (slim, two totals + leader)
       * The FULL FinalVotes readout lives in its own full-width row directly
       * BELOW the globe — never overlapping it.
       */}
      <section className="relative mt-6">
        {/* ambient glow pooled behind the planet */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[60vh] opacity-70"
          style={{
            background:
              "radial-gradient(720px 460px at 50% 32%, rgba(74,158,255,0.10), transparent 70%), radial-gradient(820px 520px at 50% 56%, rgba(61,217,160,0.08), transparent 72%)",
          }}
        />

        {/* Globe stage. ~50vh on phones so it doesn't eat the first screen;
            taller on desktop for an immersive planet. Now that no giant card
            covers the base, the planet reads clearly edge to edge. */}
        <div className="relative h-[50vh] min-h-[340px] overflow-hidden sm:h-[60vh] sm:min-h-[460px] lg:h-[68vh] lg:min-h-[560px]">
          <Globe
            strata={latest.strata}
            continents={latest.exteriorByContinent}
            selection={selection}
            onSelect={onGlobeSelect}
          />

          {/* HUD: live status / actas — top-left chip we always keep. */}
          <div className="hud-card lift animate-fadeUp pointer-events-auto absolute left-3 top-3 z-20 flex items-center gap-2.5 px-3 py-2 sm:left-4 sm:top-4 sm:gap-3 sm:px-3.5 sm:py-2.5">
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

          {/* Verdict: compact glass HUD floating top-right (desktop only;
              mobile gets a full-width card stacked below the globe). */}
          <div className="animate-fadeUp absolute right-3 top-3 z-30 hidden max-w-[calc(100%-1.5rem)] lg:right-4 lg:top-4 lg:block">
            <Verdict latest={latest} compact />
          </div>

          {/* Legend — bottom-left, desktop only, fully visible. */}
          <div className="hud-card pointer-events-none absolute bottom-3 left-3 z-20 hidden items-center gap-3 px-3 py-1.5 text-[10px] sm:left-4 lg:flex">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent-emerald" /> Sánchez
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent-cyan" /> Keiko
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent-rose" /> reñido
            </span>
          </div>

          {/* FinalVotes slim summary chip — bottom-centre, desktop only.
              Two projected totals + leader. Contained, lets the planet breathe.
              The full detailed readout renders below the globe. Hidden while the
              explorer is open so it never collides with the panel. */}
          {!geoPath && (
            <div className="animate-fadeUp pointer-events-auto absolute bottom-3 left-1/2 z-30 hidden -translate-x-1/2 lg:block">
              <FinalVotesChip latest={latest} />
            </div>
          )}

          {/* GeoExplorer — only mounts once a department is chosen. Phones:
              full-width bottom sheet. Desktop: floats over the globe on the
              right, anchored to the stage bottom so it clears the Verdict HUD
              and scrolls internally so tall drills (many provinces) never clip
              against the stage. The panel carries the deep dep → prov → dist
              drill with live cross-referenced data. */}
          {geoPath && (
            <div className="pointer-events-none">
              <div className="pointer-events-auto fixed inset-x-3 bottom-3 z-40 max-h-[72vh] overflow-y-auto lg:absolute lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-auto lg:z-30 lg:max-h-[calc(68vh-220px)] lg:w-[330px] lg:overflow-y-auto">
                <GeoExplorer
                  path={geoPath}
                  hierarchy={hierarchy}
                  latest={latest}
                  onNavigate={onExplorerNavigate}
                  onClose={onExplorerClose}
                />
              </div>
            </div>
          )}
        </div>

        {/* Mobile legend caption — replaces the floating legend HUD on phones. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[10px] text-ink-3 lg:hidden">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-emerald" /> Sánchez
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-cyan" /> Keiko
          </span>
          <span>intensidad = margen · toca un departamento para enfocar</span>
        </div>
      </section>

      {/* ── FinalVotes — the headline, full-width row directly below the globe.
       * Its large numbers, head-to-head bar and 4-stat footer get proper room
       * here, on every breakpoint, with zero overlap of the planet above. */}
      <div className="mt-5">
        <FinalVotesHero latest={latest} />
      </div>

      {/* Verdict full card — mobile/tablet only (desktop has the compact HUD
       * floating over the globe). */}
      <div className="mt-4 lg:hidden">
        <Verdict latest={latest} />
      </div>

      {/* ── AI analyst — live intelligence briefing + Q&A, grounded in the model. */}
      <div className="mt-5">
        <AnalystBriefing latest={latest} />
      </div>

      {/* ── Analyst grid ───────────────────────────────────────────────────
       * One unified, rhythmic 3-column grid (2 on tablet, 1 on phone). Wide
       * cards span 2–3 columns so the grid reads intentional, not ragged.
       * Reading order: orientation (now-vs-projection, methods) → uncertainty
       * (uncertainty, manski) → composition/contested/sensitivity → exterior →
       * time series + departments. Every card a floating pane of glass.
       */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Row: orientation */}
        <Float delay={0} className="md:col-span-2 xl:col-span-1">
          <NowVsProjection latest={latest} />
        </Float>
        <Float delay={1} className="md:col-span-2">
          <Methods latest={latest} />
        </Float>

        {/* Row: uncertainty */}
        <Float delay={2}>
          <Uncertainty latest={latest} />
        </Float>
        <Float delay={3} className="md:col-span-2 xl:col-span-2">
          <ManskiBounds latest={latest} />
        </Float>

        {/* Row: composition + sensitivity */}
        <Float delay={4}>
          <ActasComposition latest={latest} />
        </Float>
        <Float delay={5}>
          <Sensitivity latest={latest} />
        </Float>
        <Float delay={0} className="md:col-span-2 xl:col-span-1">
          <OvertakeThreshold latest={latest} />
        </Float>
        <Float delay={0}>
          <Exterior latest={latest} />
        </Float>

        {/* Wide row: contested grid (table) spans the full width */}
        <Float delay={2} className="md:col-span-2 xl:col-span-3">
          <ContestedGrid latest={latest} />
        </Float>

        {/* Wide row: time series + departments leaderboard */}
        <Float delay={1} className="md:col-span-2 xl:col-span-1">
          <TimeSeries history={history} />
        </Float>
        <Float delay={3} className="md:col-span-2 xl:col-span-2">
          <Strata
            strata={latest.strata}
            selectedCode={
              selection?.kind === "dept" ? selection.data.code : undefined
            }
            onSelect={(s) => onGlobeSelect({ kind: "dept", data: s })}
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
