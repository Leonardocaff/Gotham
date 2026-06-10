"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useLiveData } from "@/lib/useLiveData";
import { useHierarchy } from "@/lib/useHierarchy";
import { useDeepForensics } from "@/lib/useDeepForensics";
import type { GlobeSelection } from "@/components/globe/Globe";
import { GeoExplorer, type GeoPath } from "@/components/globe/GeoExplorer";
import { ContinentCard } from "@/components/globe/ContinentCard";
import { Verdict } from "@/components/panels/Verdict";
import { FinalVotesHero } from "@/components/panels/FinalVotesHero";
import { AnalystBriefing } from "@/components/panels/AnalystBriefing";
import { NowVsProjection } from "@/components/panels/NowVsProjection";
import { Uncertainty } from "@/components/panels/Uncertainty";
import { Methods } from "@/components/panels/Methods";
import { ActasComposition } from "@/components/panels/ActasComposition";
import { ContestedGrid } from "@/components/panels/ContestedGrid";
import { Sensitivity } from "@/components/panels/Sensitivity";
import { OvertakeThreshold } from "@/components/panels/OvertakeThreshold";
import { Crossover } from "@/components/panels/Crossover";
import { ManskiBounds } from "@/components/panels/ManskiBounds";
import { ForensicIntegrity } from "@/components/panels/ForensicIntegrity";
import { DeepForensics } from "@/components/panels/DeepForensics";
import { Exterior } from "@/components/panels/Exterior";
import { TimeSeries } from "@/components/panels/TimeSeries";
import { Methodology } from "@/components/panels/Methodology";
import { CANDIDATE_COLOR } from "@/lib/types";
import { pct, timeFromIso } from "@/lib/format";

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

export default function Page() {
  const { latest, history, error, loading } = useLiveData();
  const hierarchy = useHierarchy();
  const deepForensics = useDeepForensics();

  // `selection` drives the globe (fly + highlight). `geoPath` drives the
  // explorer (dep → prov → dist). Kept in sync: a globe click sets both; an
  // explorer drill sets geoPath and points selection at the PARENT department.
  const [selection, setSelection] = useState<GlobeSelection>(null);
  const [geoPath, setGeoPath] = useState<GeoPath | null>(null);

  // Globe → page. A dept selection opens the geo explorer at that department; a
  // continent selection opens the exterior card (and closes the dept drill).
  const onGlobeSelect = useCallback((sel: GlobeSelection) => {
    setSelection(sel);
    if (sel?.kind === "dept") {
      setGeoPath({ depCode: sel.data.code });
    } else {
      // continent or deselect → no department drill open
      setGeoPath(null);
    }
  }, []);

  // Explorer → page. Drilling updates the path AND re-points the globe at the
  // parent department (we only have department polygons).
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

  // ── Loading / error gates ──────────────────────────────────────────────
  if (loading && !latest) {
    return (
      <main className="flex min-h-[100svh] items-center justify-center">
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
      <main className="flex min-h-[100svh] items-center justify-center px-6">
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

  const { projection } = latest;
  const pWinLeader = projection.p_win[projection.leader];
  const leaderColor = CANDIDATE_COLOR[projection.leader];
  const leaderName = projection.leader === "sanchez" ? "Sánchez" : "Keiko";
  // The geo drill is open once a real department path exists.
  const geoOpen = geoPath !== null && geoPath.depCode !== "";

  return (
    <main className="relative flex min-h-[100svh] w-full flex-col overflow-x-hidden lg:h-[100svh] lg:flex-row lg:overflow-hidden">
      {/* ════════════════════════════════════════════════════════════════
          LEFT / CENTER — the planet, framed on Peru. Fills the viewport on
          desktop; a shorter hero on top on phones. The HUD + legend + geo
          drill float over this column.
          ════════════════════════════════════════════════════════════════ */}
      <section className="relative h-[54vh] w-full shrink-0 lg:h-full lg:min-w-0 lg:flex-1">
        <div className="absolute inset-0">
          <Globe
            strata={latest.strata}
            continents={latest.exteriorByContinent}
            selection={selection}
            onSelect={onGlobeSelect}
          />
        </div>

        {/* ── Minimal top HUD — ultra-light, always visible ── */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-3 pt-3 sm:px-5 sm:pt-4">
          {/* Wordmark + live + actas */}
          <div className="hud-card pointer-events-auto flex items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4 sm:py-2.5">
            <h1 className="font-display text-base font-semibold tracking-tight text-ink-1 sm:text-lg">
              GOTHAM
            </h1>
            <span className="hidden h-4 w-px bg-edge-strong sm:block" />
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulseDot rounded-full bg-accent-rose shadow-[0_0_10px_#FF7A8A]" />
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-1">
                En vivo
              </span>
            </span>
            <span className="hidden h-4 w-px bg-edge-strong sm:block" />
            <div className="hidden leading-tight sm:block">
              <div className="text-[9px] uppercase tracking-[0.16em] text-ink-3">
                Actas
              </div>
              <div className="tnum font-mono text-xs text-ink-1">
                {pct(latest.count.actasContabilizadasPct, 2)}
              </div>
            </div>
          </div>

          {/* Verdict / P(victoria) chip — compact, right side */}
          <div className="hud-card pointer-events-auto flex items-center gap-2.5 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
            <span
              className="rounded-md border px-2 py-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px]"
              style={{
                color: leaderColor,
                borderColor: `${leaderColor}55`,
                backgroundColor: `${leaderColor}14`,
              }}
            >
              {projection.decision}
            </span>
            <div className="leading-tight">
              <div className="text-[9px] uppercase tracking-[0.16em] text-ink-3">
                P(victoria) {leaderName}
              </div>
              <div
                className="tnum font-mono text-xs"
                style={{ color: leaderColor }}
              >
                {(pWinLeader * 100).toFixed(1)}%
              </div>
            </div>
            <span className="hidden h-4 w-px bg-edge-strong sm:block" />
            <div className="hidden leading-tight sm:block">
              <div className="text-[9px] uppercase tracking-[0.16em] text-ink-3">
                Generado
              </div>
              <div className="tnum font-mono text-xs text-ink-1">
                {timeFromIso(latest.generatedAt)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Candidate legend — desktop only, bottom-centre. Hidden while the
            geo drill is open to keep the stage calm. ── */}
        {!geoOpen && (
          <div className="hud-card pointer-events-none absolute bottom-3 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-3 px-3 py-1.5 text-[10px] lg:flex">
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
        )}

        {/* ── GeoExplorer — the geographic drill. Opened by clicking a
            department on the globe. Desktop: floats over the globe, scrolls
            internally. Phones: a sheet near the top of the hero so the cards
            below stay reachable. Keeps the dep→prov→dist drill intact. ── */}
        {geoOpen && (
          <div className="pointer-events-none absolute inset-0 z-40">
            <div className="pointer-events-auto absolute inset-x-3 top-16 max-h-[calc(54vh-5rem)] overflow-y-auto sm:top-20 lg:inset-x-auto lg:right-4 lg:top-1/2 lg:max-h-[78vh] lg:w-[360px] lg:-translate-y-1/2">
              <GeoExplorer
                path={geoPath && geoPath.depCode ? geoPath : null}
                hierarchy={hierarchy}
                latest={latest}
                onNavigate={onExplorerNavigate}
                onClose={onExplorerClose}
              />
            </div>
          </div>
        )}

        {/* ── Exterior card — opened by clicking a continent marker on the globe.
            Same float position as the geo drill so the stage stays consistent. ── */}
        {selection?.kind === "continent" && (
          <div className="pointer-events-none absolute inset-0 z-40">
            <div className="pointer-events-auto absolute inset-x-3 top-16 max-h-[calc(54vh-5rem)] overflow-y-auto sm:top-20 lg:inset-x-auto lg:right-4 lg:top-1/2 lg:max-h-[78vh] lg:w-[360px] lg:-translate-y-1/2">
              <ContinentCard
                continent={selection.data}
                latest={latest}
                onClose={onExplorerClose}
              />
            </div>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════
          RIGHT STRIP — the live intelligence feed. A glassy translucent
          column over the dark canvas, hairline left border. Desktop: fixed
          width, its own vertical scroll. Phones: a normal full-width stack
          below the globe; the page scrolls.
          ════════════════════════════════════════════════════════════════ */}
      <aside className="strip relative z-10 flex w-full shrink-0 flex-col gap-3 overflow-y-auto px-3 pb-6 pt-3 sm:px-4 lg:h-full lg:w-[404px] lg:gap-3.5 lg:border-l lg:border-edge-strong lg:px-4 lg:pb-8 lg:pt-4 xl:w-[432px]">
        {/* Strip header — orients the feed */}
        <header className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-accent-emerald shadow-[0_0_8px_#3DD9A0]" />
            <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-2">
              Feed de inteligencia
            </h2>
          </div>
          <span className="tnum font-mono text-[10px] text-ink-3">
            {timeFromIso(latest.generatedAt)}
          </span>
        </header>

        {/* proyección */}
        <FinalVotesHero latest={latest} />
        <Verdict latest={latest} />
        <NowVsProjection latest={latest} />
        <Methods latest={latest} />

        {/* incertidumbre */}
        <Uncertainty latest={latest} />
        <ManskiBounds latest={latest} />
        <Sensitivity latest={latest} />
        <Crossover history={history} />
        <OvertakeThreshold latest={latest} />
        <ActasComposition latest={latest} />

        {/* integridad / forense */}
        <ForensicIntegrity latest={latest} />
        <DeepForensics data={deepForensics.data} />

        {/* geografía */}
        <Exterior latest={latest} />
        <ContestedGrid latest={latest} />
        <TimeSeries history={history} />

        {/* IA + método */}
        <AnalystBriefing latest={latest} deep={deepForensics.data} />
        <Methodology latest={latest} />

        <p className="px-1 pt-1 text-center text-[10px] leading-snug text-ink-3">
          Proyección estadística — no es resultado oficial del JNE.
        </p>
      </aside>
    </main>
  );
}
