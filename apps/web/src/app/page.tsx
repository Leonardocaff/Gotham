"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  BookOpen,
  Brackets,
  Clock,
  Crosshair,
  Gavel,
  Globe2,
  Layers,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Map as MapIcon,
  Sparkles,
} from "lucide-react";
import { useLiveData } from "@/lib/useLiveData";
import { useHierarchy } from "@/lib/useHierarchy";
import type { GlobeSelection } from "@/components/globe/Globe";
import { GeoExplorer, type GeoPath } from "@/components/globe/GeoExplorer";
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
import { ManskiBounds } from "@/components/panels/ManskiBounds";
import { Exterior } from "@/components/panels/Exterior";
import { TimeSeries } from "@/components/panels/TimeSeries";
import { Methodology } from "@/components/panels/Methodology";
import { Modal, type ModalWidth } from "@/components/console/Modal";
import { IconRail, type RailItem } from "@/components/console/IconRail";
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

const ACCENT = {
  emerald: "#3DD9A0",
  cyan: "#4A9EFF",
  gold: "#FFB43C",
  rose: "#FF7A8A",
  purple: "#9B7AFF",
} as const;

export default function Page() {
  const { latest, history, error, loading } = useLiveData();
  const hierarchy = useHierarchy();

  // `selection` drives the globe (fly + highlight). `geoPath` drives the
  // explorer (dep → prov → dist). Kept in sync: a globe click sets both; an
  // explorer drill sets geoPath and points selection at the PARENT department.
  const [selection, setSelection] = useState<GlobeSelection>(null);
  const [geoPath, setGeoPath] = useState<GeoPath | null>(null);
  // Which module modal is open (rail id). null = none. The geo explorer is its
  // own overlay (opened from the globe / the Mapa icon) — only one shows at a
  // time, never both stacked.
  const [openId, setOpenId] = useState<string | null>(null);

  // Globe → page. A dept selection opens the explorer at that department and
  // dismisses any module modal so the geo drill owns the stage.
  const onGlobeSelect = useCallback((sel: GlobeSelection) => {
    setSelection(sel);
    if (sel?.kind === "dept") {
      setGeoPath({ depCode: sel.data.code });
      setOpenId(null);
    } else if (sel === null) {
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

  // ── Module registry. Every entry is icon → component; all panels take
  // `latest` except TimeSeries (`history`). Grouped for rail dividers. ──
  const modules = useMemo(() => {
    if (!latest)
      return [] as (RailItem & {
        width: ModalWidth;
        render: () => React.ReactNode;
      })[];
    return [
      // proyección
      {
        id: "final-votes",
        label: "Proyección Final · Votos",
        icon: BarChart3,
        group: "proyeccion",
        accent: ACCENT.emerald,
        width: "wide" as ModalWidth,
        render: () => <FinalVotesHero latest={latest} />,
      },
      {
        id: "verdict",
        label: "Veredicto",
        icon: Gavel,
        group: "proyeccion",
        accent: ACCENT.gold,
        width: "default" as ModalWidth,
        render: () => <Verdict latest={latest} />,
      },
      {
        id: "now-vs",
        label: "Ahora vs Proyección",
        icon: ArrowRightLeft,
        group: "proyeccion",
        accent: ACCENT.cyan,
        width: "default" as ModalWidth,
        render: () => <NowVsProjection latest={latest} />,
      },
      {
        id: "methods",
        label: "Métodos",
        icon: Layers,
        group: "proyeccion",
        accent: ACCENT.cyan,
        width: "wide" as ModalWidth,
        render: () => <Methods latest={latest} />,
      },
      // incertidumbre
      {
        id: "uncertainty",
        label: "Incertidumbre",
        icon: Activity,
        group: "incertidumbre",
        accent: ACCENT.purple,
        width: "default" as ModalWidth,
        render: () => <Uncertainty latest={latest} />,
      },
      {
        id: "manski",
        label: "Cotas de Manski",
        icon: Brackets,
        group: "incertidumbre",
        accent: ACCENT.purple,
        width: "default" as ModalWidth,
        render: () => <ManskiBounds latest={latest} />,
      },
      {
        id: "actas",
        label: "Composición de actas",
        icon: PieChartIcon,
        group: "incertidumbre",
        accent: ACCENT.gold,
        width: "default" as ModalWidth,
        render: () => <ActasComposition latest={latest} />,
      },
      {
        id: "sensitivity",
        label: "Sensibilidad",
        icon: LineChartIcon,
        group: "incertidumbre",
        accent: ACCENT.purple,
        width: "default" as ModalWidth,
        render: () => <Sensitivity latest={latest} />,
      },
      {
        id: "overtake",
        label: "Umbral de remonte",
        icon: Crosshair,
        group: "incertidumbre",
        accent: ACCENT.rose,
        width: "default" as ModalWidth,
        render: () => <OvertakeThreshold latest={latest} />,
      },
      // geografía
      {
        id: "geo",
        label: "Mapa · Explorar",
        icon: MapIcon,
        group: "geografia",
        accent: ACCENT.emerald,
        width: "wide" as ModalWidth,
        render: () => null, // handled by the GeoExplorer overlay, not a modal
      },
      {
        id: "exterior",
        label: "Voto exterior",
        icon: Globe2,
        group: "geografia",
        accent: ACCENT.cyan,
        width: "default" as ModalWidth,
        render: () => <Exterior latest={latest} />,
      },
      {
        id: "contested",
        label: "Actas impugnadas",
        icon: AlertTriangle,
        group: "geografia",
        accent: ACCENT.rose,
        width: "wide" as ModalWidth,
        render: () => <ContestedGrid latest={latest} />,
      },
      {
        id: "timeseries",
        label: "Serie temporal",
        icon: Clock,
        group: "geografia",
        accent: ACCENT.cyan,
        width: "wide" as ModalWidth,
        render: () => <TimeSeries history={history} />,
      },
      // IA + método
      {
        id: "analyst",
        label: "Analista IA",
        icon: Sparkles,
        group: "ia",
        accent: ACCENT.purple,
        width: "wide" as ModalWidth,
        render: () => <AnalystBriefing latest={latest} />,
      },
      {
        id: "methodology",
        label: "Metodología",
        icon: BookOpen,
        group: "ia",
        accent: ACCENT.gold,
        width: "wide" as ModalWidth,
        render: () => <Methodology latest={latest} />,
      },
    ];
  }, [latest, history]);

  const railItems: RailItem[] = useMemo(
    () =>
      modules.map(({ id, label, icon, group, accent }) => ({
        id,
        label,
        icon,
        group,
        accent,
      })),
    [modules],
  );

  const onRailSelect = useCallback((id: string) => {
    // The Mapa icon opens the geo drill (its own overlay), not a module modal.
    if (id === "geo") {
      setOpenId(null);
      setGeoPath((p) => p ?? { depCode: "" });
      return;
    }
    // Opening any module dismisses the geo drill so only one overlay shows.
    setGeoPath(null);
    setSelection(null);
    setOpenId((cur) => (cur === id ? null : id));
  }, []);

  const active = openId ? modules.find((m) => m.id === openId) ?? null : null;

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
  // The geo drill is open once a path exists (a real department, or the empty
  // invitation state after tapping Mapa).
  const geoOpen = geoPath !== null;

  return (
    <main className="relative h-[100svh] w-full overflow-hidden">
      {/* ── The globe IS the stage. Fills the viewport as the immersive
          background; everything else floats over it. ── */}
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

      {/* ── Candidate legend — desktop only, bottom-centre (clear of the rail
          on the left and the geo panel on the right). Hidden while the geo
          drill is open to keep the stage calm. ── */}
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

      {/* ── Icon rail — data lives here, summoned on demand ── */}
      <IconRail items={railItems} activeId={openId} onSelect={onRailSelect} />

      {/* ── Module modal — one at a time, translucent over the globe ── */}
      {active && active.id !== "geo" && (
        <Modal
          title={active.label}
          width={active.width}
          onClose={() => setOpenId(null)}
        >
          {active.render()}
        </Modal>
      )}

      {/* ── GeoExplorer — the geographic drill. Opened by clicking a department
          on the globe OR the Mapa rail icon. Phones: bottom sheet above the
          rail. Desktop: floats over the globe, right side, scrolls internally. ── */}
      {geoOpen && (
        <div className="pointer-events-none fixed inset-0 z-40">
          <div className="pointer-events-auto fixed inset-x-3 bottom-16 max-h-[72vh] overflow-y-auto sm:bottom-3 lg:absolute lg:inset-x-auto lg:right-4 lg:top-1/2 lg:max-h-[78vh] lg:w-[360px] lg:-translate-y-1/2">
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
    </main>
  );
}
