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

// The console frames Peru. We start close — the country fills the frame while
// the curvature + stars still read — and hold there rather than spinning the
// planet (a full longitude spin would carry Peru out of view, defeating the
// zoom). A whisper-slow drift gently re-settles the camera on Peru until the
// user takes over with drag / pinch.
const INITIAL_ZOOM = 4.5;

// A department is "contested" when its split is within this band of 50/50. Its
// centroid gets a pulsing halo so toss-ups stand out on the planet.
const CONTESTED_BAND_PP = 6;

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

interface HoverInfo {
  name: string;
  pctSanchez: number;
  leader: "sanchez" | "keiko";
  actasPct: number;
  votosS: number;
  votosK: number;
  x: number;
  y: number;
}

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

/** Centroid points for the CONTESTED halo layer — only departments whose split
 * is within CONTESTED_BAND_PP of even. These pulse to flag toss-ups. */
function contestedPoints(strata: Stratum[]): PointFC {
  const features = strata
    .map((s): Feature<Point, Record<string, unknown>> | null => {
      const marginPp = Math.abs(s.pctSanchez - (100 - s.pctSanchez));
      if (marginPp >= CONTESTED_BAND_PP) return null;
      const c = deptCentroid(s.name);
      if (!c) return null;
      // Tighter race → hotter glow. 0pp → 1.0, band edge → 0.
      const heat = 1 - marginPp / CONTESTED_BAND_PP;
      return {
        type: "Feature",
        properties: { name: s.name, code: s.code, heat },
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
  const pulseRef = useRef<number | null>(null);
  const lastFlownRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [polyReady, setPolyReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<HoverInfo | null>(null);
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

    // Encuadre responsivo: en viewports angostos (celular vertical) el mismo zoom
    // recorta Perú a los lados, así que reducimos un punto para que el país entre
    // completo. En pantallas anchas usamos el zoom cerrado (~200%).
    const vw = containerRef.current.clientWidth || window.innerWidth || 1024;
    const initialZoom = vw < 640 ? INITIAL_ZOOM - 0.85 : vw < 1024 ? INITIAL_ZOOM - 0.35 : INITIAL_ZOOM;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        projection: { name: "globe" },
        // Framed on Peru, zoomed in ~200% over the old 2.4 (each +1 doubles the
        // apparent scale). Peru fills the frame; the globe edge + space stay.
        center: PERU_CENTER,
        zoom: initialZoom,
        pitch: 0,
        attributionControl: false,
        antialias: true,
        // Touch: one-finger drag rotates the planet, two-finger pinch zooms.
        // These are on by default but we make the intent explicit for mobile.
        touchZoomRotate: true,
        dragRotate: true,
        touchPitch: false,
        cooperativeGestures: false,
      });
    } catch (e) {
      // p.ej. WebGL no disponible/deshabilitado — degradar sin romper la app
      console.warn("Globe: Mapbox init falló", e);
      setFailed(true);
      return;
    }
    map.on("error", (ev) => console.warn("Globe: Mapbox error", ev?.error));
    mapRef.current = map;

    // Any direct interaction permanently hands the camera to the user — we stop
    // the gentle recentering drift so we never fight their drag/pinch.
    const stopDrift = () => {
      interactedRef.current = true;
      if (spinRef.current) {
        cancelAnimationFrame(spinRef.current);
        spinRef.current = null;
      }
    };
    map.on("mousedown", stopDrift);
    map.on("touchstart", stopDrift);
    map.on("wheel", stopDrift);
    map.on("dragstart", stopDrift);

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    map.on("style.load", () => {
      // Deeper "planet in space" atmosphere: near-black space, a soft cool
      // horizon glow, and a touch more starlight so the globe edges read as
      // a body floating in the void rather than a tile on a map.
      map.setFog({
        color: "rgb(8,9,12)",
        "high-color": "rgb(26,42,78)",
        "horizon-blend": 0.09,
        "space-color": "rgb(4,4,7)",
        "star-intensity": 0.7,
      });

      // Limpieza Palantir: ocultar TODOS los labels base de Mapbox (nombres de
      // país/ciudad/océano, etc.) para que solo lea nuestro choropleth. Nuestros
      // propios labels (continentes) se añaden después, así que no se ocultan.
      try {
        for (const layer of map.getStyle()?.layers ?? []) {
          if (layer.type === "symbol") {
            map.setLayoutProperty(layer.id, "visibility", "none");
          }
        }
      } catch {
        /* estilos cambian entre versiones — no romper si falla */
      }

      setReady(true);

      // No continuous spin — that would rotate Peru out of frame. Instead a
      // very slow drift that eases the camera back toward PERU_CENTER, so the
      // planet always reads as "focused on Peru". It dies once it's settled or
      // the user interacts. Reduced-motion skips it entirely (camera is already
      // on Peru from init).
      if (reduce) return;
      let last = performance.now();
      const drift = (now: number) => {
        if (interactedRef.current) return;
        const dt = Math.min(now - last, 48);
        last = now;
        const c = map.getCenter();
        const dLng = PERU_CENTER[0] - c.lng;
        const dLat = PERU_CENTER[1] - c.lat;
        // Settled? stop the loop — nothing to animate, no idle frames burned.
        if (Math.abs(dLng) < 0.01 && Math.abs(dLat) < 0.01) {
          spinRef.current = null;
          return;
        }
        // Critically-damped-ish ease: move a small fraction of the gap / frame.
        const k = 1 - Math.pow(0.0016, dt / 1000);
        c.lng += dLng * k;
        c.lat += dLat * k;
        map.setCenter(c);
        spinRef.current = requestAnimationFrame(drift);
      };
      spinRef.current = requestAnimationFrame(drift);
    });

    // Keep the canvas correctly sized on orientation change / container reflow.
    // The vh-based hero height changes on rotate without firing a window resize
    // that Mapbox would otherwise catch, so we observe the container directly.
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => map.resize());
    });
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      if (spinRef.current) cancelAnimationFrame(spinRef.current);
      if (pulseRef.current) cancelAnimationFrame(pulseRef.current);
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
      // Transparent, generous hit target so the small exterior dots are easy to
      // click/hover (the visible dot can be ~4px; this gives a comfortable grab).
      map.addLayer({
        id: "continents-hit",
        type: "circle",
        source: "continents",
        paint: {
          "circle-radius": 18,
          "circle-color": "#000000",
          "circle-opacity": 0.001,
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

      // ── Contested glow source (toss-up departments) ───────────────────────
      // Sits above the choropleth so the rose halo pulses over tight races.
      map.addSource("contested", {
        type: "geojson",
        data: contestedPoints(strataRef.current),
      });
      map.addLayer({
        id: "contested-glow",
        type: "circle",
        source: "contested",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "heat"],
            0,
            14,
            1,
            30,
          ],
          "circle-color": "#FF7A8A",
          "circle-opacity": 0.18,
          "circle-blur": 1,
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
          // Hover highlight — un realce sobre el departamento bajo el cursor:
          // un brillo del fill + un contorno suave (distinto del seleccionado).
          map.addLayer(
            {
              id: "depts-hover-fill",
              type: "fill",
              source: "depts",
              filter: ["==", ["get", "g_code"], "__none__"],
              paint: { "fill-color": "#FFFFFF", "fill-opacity": 0.18 },
            },
            "continents-halo",
          );
          map.addLayer(
            {
              id: "depts-hover",
              type: "line",
              source: "depts",
              filter: ["==", ["get", "g_code"], "__none__"],
              paint: {
                "line-color": "#F5F5F7",
                "line-width": 2.2,
                "line-opacity": 0.6,
                "line-blur": 0.4,
              },
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
        if (c) {
          lastFlownRef.current = code;
          map.easeTo({ center: c, zoom: 5.4, duration: 800 });
        }
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
      map.on("click", "continents-hit", onContinentClick);

      // click empty space → national view
      map.on("click", (e: MapMouseEvent) => {
        const hits = map.queryRenderedFeatures(e.point, {
          layers: [deptClickLayer, "continents-hit"].filter((l) =>
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

      for (const l of [deptClickLayer, "continents-hit"]) {
        if (!map.getLayer(l)) continue;
        map.on("mouseenter", l, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", l, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      // ── HOVER de continentes: mismo tooltip vivo que los departamentos. ──
      const onContinentMove = (e: MapMouseEvent) => {
        const f = e.features?.[0];
        const code = f?.properties?.code as string | undefined;
        const c = code
          ? continentsRef.current.find((x) => x.code === code)
          : undefined;
        if (!c) {
          setHover(null);
          return;
        }
        setHover({
          name: c.name,
          pctSanchez: c.pctSanchez,
          leader: c.leader,
          actasPct: c.actasPct,
          votosS: c.votos.sanchez,
          votosK: c.votos.keiko,
          x: e.point.x,
          y: e.point.y,
        });
      };
      map.on("mousemove", "continents-hit", onContinentMove);
      map.on("mouseleave", "continents-hit", () => setHover(null));

      // ── HOVER de departamentos: resalta la unidad bajo el cursor y muestra un
      // tooltip con su data viva (split, líder, % actas). ──
      const setHoverCode = (code: string | null) => {
        const f = ["==", ["get", "g_code"], code ?? "__none__"];
        for (const id of ["depts-hover", "depts-hover-fill"]) {
          if (map.getLayer(id)) map.setFilter(id, f as never);
        }
      };
      const onDeptMove = (e: MapMouseEvent) => {
        const f = e.features?.[0];
        const code = (f?.properties?.g_code ?? f?.properties?.code) as
          | string
          | undefined;
        const s = code
          ? strataRef.current.find((x) => x.code === code)
          : undefined;
        if (!s) {
          setHoverCode(null);
          setHover(null);
          return;
        }
        setHoverCode(s.code);
        setHover({
          name: s.name,
          pctSanchez: s.pctSanchez,
          leader: s.leader,
          actasPct: s.actasPct,
          votosS: s.votos.sanchez,
          votosK: s.votos.keiko,
          x: e.point.x,
          y: e.point.y,
        });
      };
      const onDeptLeave = () => {
        setHoverCode(null);
        setHover(null);
        map.getCanvas().style.cursor = "";
      };
      if (map.getLayer("depts-fill")) {
        map.on("mousemove", "depts-fill", onDeptMove);
        map.on("mouseleave", "depts-fill", onDeptLeave);
      }

      // ── Contested halo pulse loop ─────────────────────────────────────────
      // Animate opacity (and a touch of radius) with a slow sine so toss-ups
      // breathe. Honours reduced-motion: hold a steady mid glow instead.
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) {
        const t0 = performance.now();
        const pulse = (now: number) => {
          if (cancelled || !map.getLayer("contested-glow")) return;
          const phase = (now - t0) / 1100; // ~2.2s full cycle
          const wave = (Math.sin(phase) + 1) / 2; // 0..1
          map.setPaintProperty(
            "contested-glow",
            "circle-opacity",
            0.1 + wave * 0.22,
          );
          pulseRef.current = requestAnimationFrame(pulse);
        };
        pulseRef.current = requestAnimationFrame(pulse);
      }
    }

    void addLayers();
    return () => {
      cancelled = true;
      if (pulseRef.current) {
        cancelAnimationFrame(pulseRef.current);
        pulseRef.current = null;
      }
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
    const xSrc = map.getSource("contested") as GeoJSONSource | undefined;
    if (xSrc) xSrc.setData(contestedPoints(strata));
  }, [strata, continents, ready, polyReady]);

  // ── Two-way link: reflect external selection (panel drills) on the globe ──
  // When the explorer changes the active department (province/district drill
  // highlights the PARENT department), fly + highlight here. Guard re-flights
  // so live polls don't re-trigger the camera.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (selection === null) {
      lastFlownRef.current = null;
      if (map.getLayer("depts-sel")) {
        map.setFilter("depts-sel", ["==", ["get", "g_code"], "__none__"]);
      }
      return;
    }

    if (selection.kind === "continent") {
      // exterior selected → drop any department highlight; fly handled on click
      lastFlownRef.current = null;
      if (map.getLayer("depts-sel")) {
        map.setFilter("depts-sel", ["==", ["get", "g_code"], "__none__"]);
      }
      return;
    }
    if (selection.kind !== "dept") return;
    const code = selection.data.code;
    if (lastFlownRef.current === code) return; // already centred here

    lastFlownRef.current = code;
    interactedRef.current = true;
    const c = deptCentroid(selection.data.name);
    if (c) map.easeTo({ center: c, zoom: 5.4, duration: 800 });
    if (map.getLayer("depts-sel")) {
      map.setFilter("depts-sel", ["==", ["get", "g_code"], code]);
    }
  }, [selection, ready, polyReady]);

  if (!TOKEN) {
    return (
      <div className="relative flex h-full min-h-[360px] w-full items-center justify-center overflow-hidden">
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
      <div className="relative flex h-full min-h-[360px] w-full items-center justify-center overflow-hidden px-6 text-center">
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

  // Borderless: the globe floats directly in the canvas. A radial vignette
  // overlay melts the planet's edges into the near-black void.
  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden touch-pan-y">
      {/* h-full w-full es clave: el CSS de Mapbox fuerza position:relative sobre este
          div (.mapboxgl-map) y anula `absolute inset-0`, colapsando la altura a 0 →
          globo invisible. La altura explícita resuelve contra el contenedor (h-full). */}
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      <div className="globe-vignette pointer-events-none absolute inset-0 z-[1]" />

      {/* Tooltip de hover — sigue al cursor con la data viva del departamento. */}
      {hover && (
        <div
          className="pointer-events-none absolute z-30 w-44 -translate-y-full rounded-lg border border-edge-strong bg-[rgba(10,10,14,0.88)] px-3 py-2 shadow-xl backdrop-blur-md"
          style={{
            left: Math.max(8, Math.min(hover.x + 14, (containerRef.current?.clientWidth ?? 9999) - 184)),
            top: Math.max(64, hover.y - 12),
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-1">
              {hover.name}
            </span>
            <span
              className="shrink-0 rounded px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide"
              style={{
                color: leaderColor(hover.leader, 0),
                backgroundColor: `${leaderColor(hover.leader, 0)}1f`,
              }}
            >
              {hover.leader === "sanchez" ? "Sánchez" : "Keiko"}
            </span>
          </div>
          <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div style={{ width: `${hover.pctSanchez}%`, backgroundColor: "#3DD9A0" }} />
            <div style={{ width: `${100 - hover.pctSanchez}%`, backgroundColor: "#4A9EFF" }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] tnum">
            <span style={{ color: "#3DD9A0" }}>{hover.pctSanchez.toFixed(1)}%</span>
            <span className="text-ink-3">{hover.actasPct.toFixed(0)}% actas</span>
            <span style={{ color: "#4A9EFF" }}>{(100 - hover.pctSanchez).toFixed(1)}%</span>
          </div>
        </div>
      )}

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
            Cargando globo…
          </span>
        </div>
      )}
    </div>
  );
}
