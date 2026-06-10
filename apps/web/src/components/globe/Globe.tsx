"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { type GeoJSONSource, type MapMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  Point,
} from "geojson";
import type { ContinentStratum, Stratum } from "@/lib/types";
import {
  PERU_CENTER,
  PERU_GEOJSON_URLS,
  GEOJSON_NAME_FIELDS,
  deptCentroid,
  continentCentroid,
  normName,
} from "@/lib/geo";
import { leaderColor } from "@/lib/color";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export type GlobeSelection =
  | { kind: "dept"; data: Stratum }
  | { kind: "continent"; data: ContinentStratum }
  | null;

interface GlobeProps {
  strata: Stratum[];
  continents: ContinentStratum[];
  selection: GlobeSelection;
  onSelect: (sel: GlobeSelection) => void;
}

type PointFC = FeatureCollection<Point, Record<string, unknown>>;
type PolyFC = FeatureCollection<Geometry, Record<string, unknown>>;

function deptNameFromProps(props: Record<string, unknown> | null): string | null {
  if (!props) return null;
  for (const f of GEOJSON_NAME_FIELDS) {
    const v = props[f];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

/** Build a point FeatureCollection from strata at department centroids. */
function strataPoints(strata: Stratum[]): PointFC {
  const features = strata
    .map((s): Feature<Point, Record<string, unknown>> | null => {
      const c = deptCentroid(s.name);
      if (!c) return null;
      const margin = Math.abs(s.pctSanchez - (100 - s.pctSanchez));
      const total = s.votos.sanchez + s.votos.keiko;
      return {
        type: "Feature",
        properties: {
          name: s.name,
          code: s.code,
          leader: s.leader,
          color: leaderColor(s.leader, margin),
          total,
        },
        geometry: { type: "Point", coordinates: c },
      };
    })
    .filter((f): f is Feature<Point, Record<string, unknown>> => f !== null);
  return { type: "FeatureCollection", features };
}

function continentPoints(continents: ContinentStratum[]): PointFC {
  const features = continents
    .map((c): Feature<Point, Record<string, unknown>> | null => {
      const ctr = continentCentroid(c.name);
      if (!ctr) return null;
      const total = c.votos.sanchez + c.votos.keiko;
      const margin = Math.abs(c.pctSanchez - (100 - c.pctSanchez));
      return {
        type: "Feature",
        properties: {
          name: c.name,
          code: c.code,
          leader: c.leader,
          color: leaderColor(c.leader, margin),
          remaining: c.remainingVotesEst,
          total,
        },
        geometry: { type: "Point", coordinates: ctr },
      };
    })
    .filter((f): f is Feature<Point, Record<string, unknown>> => f !== null);
  return { type: "FeatureCollection", features };
}

export default function Globe({
  strata,
  continents,
  selection,
  onSelect,
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const interactedRef = useRef(false);
  const spinRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [polyReady, setPolyReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const strataRef = useRef(strata);
  const continentsRef = useRef(continents);
  const onSelectRef = useRef(onSelect);
  strataRef.current = strata;
  continentsRef.current = continents;
  onSelectRef.current = onSelect;

  // ── Initialise map once ────────────────────────────────────────────────
  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = TOKEN;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        projection: { name: "globe" },
        center: PERU_CENTER,
        zoom: 2.4,
        pitch: 0,
        attributionControl: false,
        antialias: true,
      });
    } catch (e) {
      // p.ej. WebGL no disponible/deshabilitado — degradar sin romper la app
      console.warn("Globe: Mapbox init falló", e);
      setFailed(true);
      return;
    }
    map.on("error", (ev) => console.warn("Globe: Mapbox error", ev?.error));
    mapRef.current = map;

    const stopSpin = () => {
      interactedRef.current = true;
      if (spinRef.current) {
        cancelAnimationFrame(spinRef.current);
        spinRef.current = null;
      }
    };
    map.on("mousedown", stopSpin);
    map.on("touchstart", stopSpin);
    map.on("wheel", stopSpin);

    map.on("style.load", () => {
      map.setFog({
        color: "rgb(10,10,12)",
        "high-color": "rgb(20,30,55)",
        "horizon-blend": 0.06,
        "space-color": "rgb(6,6,9)",
        "star-intensity": 0.55,
      });
      setReady(true);

      // subtle auto-rotate until interaction
      let last = performance.now();
      const spin = (now: number) => {
        if (interactedRef.current) return;
        const dt = now - last;
        last = now;
        const c = map.getCenter();
        c.lng -= dt * 0.0016;
        map.setCenter(c);
        spinRef.current = requestAnimationFrame(spin);
      };
      spinRef.current = requestAnimationFrame(spin);
    });

    return () => {
      if (spinRef.current) cancelAnimationFrame(spinRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Add sources + layers once style is ready ───────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    let cancelled = false;

    async function addLayers() {
      if (!map) return;
      // Exterior continent markers source
      map.addSource("continents", {
        type: "geojson",
        data: continentPoints(continentsRef.current),
      });
      map.addLayer({
        id: "continents-halo",
        type: "circle",
        source: "continents",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "remaining"],
            0,
            6,
            140000,
            34,
          ],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.14,
          "circle-blur": 0.6,
        },
      });
      map.addLayer({
        id: "continents-dot",
        type: "circle",
        source: "continents",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "total"],
            0,
            4,
            73000,
            13,
          ],
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#0A0A0C",
          "circle-stroke-width": 1.2,
          "circle-opacity": 0.95,
        },
      });
      map.addLayer({
        id: "continents-label",
        type: "symbol",
        source: "continents",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 10,
          "text-offset": [0, 1.5],
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        },
        paint: {
          "text-color": "#B8B8BA",
          "text-halo-color": "#0A0A0C",
          "text-halo-width": 1.2,
        },
      });

      // Attempt polygon geometry
      let fc: PolyFC | null = null;
      for (const url of PERU_GEOJSON_URLS) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const json = (await res.json()) as PolyFC;
          if (json?.features?.length) {
            fc = json;
            break;
          }
        } catch {
          /* try next */
        }
      }
      if (cancelled || !map) return;

      const byName = new Map(strataRef.current.map((s) => [normName(s.name), s]));

      if (fc) {
        let matched = 0;
        for (const feat of fc.features) {
          const raw = deptNameFromProps(feat.properties);
          const s = raw ? byName.get(normName(raw)) : undefined;
          if (s) {
            matched++;
            const margin = Math.abs(s.pctSanchez - (100 - s.pctSanchez));
            feat.properties = {
              ...feat.properties,
              g_name: s.name,
              g_code: s.code,
              g_leader: s.leader,
              g_color: leaderColor(s.leader, margin),
              g_pct: s.pctSanchez,
            };
          }
        }
        if (matched >= strataRef.current.length * 0.6) {
          map.addSource("depts", { type: "geojson", data: fc });
          map.addLayer(
            {
              id: "depts-fill",
              type: "fill",
              source: "depts",
              paint: {
                "fill-color": [
                  "coalesce",
                  ["get", "g_color"],
                  "rgba(40,40,48,0.4)",
                ],
                "fill-opacity": 0.78,
              },
            },
            "continents-halo",
          );
          map.addLayer(
            {
              id: "depts-line",
              type: "line",
              source: "depts",
              paint: {
                "line-color": "rgba(255,255,255,0.14)",
                "line-width": 0.6,
              },
            },
            "continents-halo",
          );
          map.addLayer(
            {
              id: "depts-sel",
              type: "line",
              source: "depts",
              filter: ["==", ["get", "g_code"], "__none__"],
              paint: { "line-color": "#F5F5F7", "line-width": 1.6 },
            },
            "continents-halo",
          );
          setPolyReady(true);
        }
      }

      // Fallback centroid markers when polygons are unavailable.
      if (!map.getLayer("depts-fill")) {
        map.addSource("dept-pts", {
          type: "geojson",
          data: strataPoints(strataRef.current),
        });
        map.addLayer({
          id: "dept-pts-circle",
          type: "circle",
          source: "dept-pts",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "total"],
              0,
              5,
              6000000,
              26,
            ],
            "circle-color": ["get", "color"],
            "circle-stroke-color": "#0A0A0C",
            "circle-stroke-width": 1,
            "circle-opacity": 0.9,
          },
        });
      }

      // ── interactions ───────────────────────────────────────────────────
      const deptClickLayer = map.getLayer("depts-fill")
        ? "depts-fill"
        : "dept-pts-circle";

      const onDeptClick = (e: MapMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const code = (f.properties?.g_code ?? f.properties?.code) as string;
        const s = strataRef.current.find((x) => x.code === code);
        if (!s) return;
        interactedRef.current = true;
        onSelectRef.current({ kind: "dept", data: s });
        const c = deptCentroid(s.name);
        if (c) map.flyTo({ center: c, zoom: 4.6, duration: 1200 });
        if (map.getLayer("depts-sel")) {
          map.setFilter("depts-sel", ["==", ["get", "g_code"], code]);
        }
      };

      const onContinentClick = (e: MapMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const code = f.properties?.code as string;
        const c = continentsRef.current.find((x) => x.code === code);
        if (!c) return;
        interactedRef.current = true;
        onSelectRef.current({ kind: "continent", data: c });
        const ctr = continentCentroid(c.name);
        if (ctr) map.flyTo({ center: ctr, zoom: 2.4, duration: 1400 });
      };

      map.on("click", deptClickLayer, onDeptClick);
      map.on("click", "continents-dot", onContinentClick);

      // click empty space → national view
      map.on("click", (e: MapMouseEvent) => {
        const hits = map.queryRenderedFeatures(e.point, {
          layers: [deptClickLayer, "continents-dot"].filter((l) =>
            map.getLayer(l),
          ),
        });
        if (hits.length === 0) {
          onSelectRef.current(null);
          if (map.getLayer("depts-sel")) {
            map.setFilter("depts-sel", ["==", ["get", "g_code"], "__none__"]);
          }
        }
      });

      for (const l of [deptClickLayer, "continents-dot"]) {
        if (!map.getLayer(l)) continue;
        map.on("mouseenter", l, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", l, () => {
          map.getCanvas().style.cursor = "";
        });
      }
    }

    void addLayers();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  // ── Keep sources updated on live data changes ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const cSrc = map.getSource("continents") as GeoJSONSource | undefined;
    if (cSrc) cSrc.setData(continentPoints(continents));
    const pSrc = map.getSource("dept-pts") as GeoJSONSource | undefined;
    if (pSrc) pSrc.setData(strataPoints(strata));
  }, [strata, continents, ready, polyReady]);

  // ── Reflect external selection clear (e.g. close button) ───────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (selection === null && map.getLayer("depts-sel")) {
      map.setFilter("depts-sel", ["==", ["get", "g_code"], "__none__"]);
    }
  }, [selection, ready]);

  if (!TOKEN) {
    return (
      <div className="relative flex h-full min-h-[420px] w-full items-center justify-center overflow-hidden rounded-2xl border border-edge bg-surface-1">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(620px 360px at 50% 30%, rgba(74,158,255,0.10), transparent 70%), radial-gradient(620px 360px at 50% 90%, rgba(61,217,160,0.08), transparent 70%)",
          }}
        />
        <div className="relative max-w-sm px-6 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full border border-edge-strong [background:conic-gradient(from_140deg,rgba(74,158,255,0.25),rgba(61,217,160,0.25),transparent)]" />
          <h3 className="font-display text-sm uppercase tracking-[0.2em] text-ink-1">
            Globo sin token
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-ink-3">
            Añade{" "}
            <code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[11px] text-ink-2">
              NEXT_PUBLIC_MAPBOX_TOKEN
            </code>{" "}
            a tu archivo{" "}
            <code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[11px] text-ink-2">
              .env.local
            </code>{" "}
            y recarga para activar el globo interactivo de Mapbox.
          </p>
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="relative flex h-full min-h-[420px] w-full items-center justify-center overflow-hidden rounded-2xl border border-edge bg-surface-1 px-6 text-center">
        <div>
          <h3 className="font-display text-sm uppercase tracking-[0.2em] text-ink-1">
            Globo no disponible
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-ink-3">
            Tu navegador no pudo inicializar WebGL. El resto del análisis sigue activo;
            usa el ranking de departamentos abajo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-2xl border border-edge">
      <div ref={containerRef} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
            Cargando globo…
          </span>
        </div>
      )}
    </div>
  );
}
