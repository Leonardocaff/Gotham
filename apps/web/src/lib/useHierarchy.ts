"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  GeoDepartment,
  GeoDistrict,
  GeoProvince,
  Hierarchy,
} from "./types";

// Hierarchy refreshes slower than latest.json — the tree is large and the
// finer units move little between national polls. 60s keeps it live without
// re-fetching ~1900 districts every 30s.
const POLL_MS = 60_000;

const DATA_BASE = (process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "/data").replace(/\/$/, "");

export interface HierarchyState {
  /** Raw arrays. */
  departments: GeoDepartment[];
  provinces: GeoProvince[];
  districts: GeoDistrict[];
  /** Index: depCode → its provinces. */
  byDep: Map<string, GeoProvince[]>;
  /** Index: provCode → its districts. */
  byProv: Map<string, GeoDistrict[]>;
  /** Index: depCode → department. */
  depByCode: Map<string, GeoDepartment>;
  /** Index: provCode → province. */
  provByCode: Map<string, GeoProvince>;
  generatedAt: string | null;
  error: string | null;
  loading: boolean;
}

const EMPTY: HierarchyState = {
  departments: [],
  provinces: [],
  districts: [],
  byDep: new Map(),
  byProv: new Map(),
  depByCode: new Map(),
  provByCode: new Map(),
  generatedAt: null,
  error: null,
  loading: true,
};

/** Loads the geographic hierarchy and exposes parent-code indexes. ADDITIVE —
 * it does not touch useLiveData. Falls back to /data when the blob base URL is
 * absent, mirroring the live-data loader. */
export function useHierarchy(): HierarchyState {
  const [raw, setRaw] = useState<{
    departments: GeoDepartment[];
    provinces: GeoProvince[];
    districts: GeoDistrict[];
    generatedAt: string | null;
    error: string | null;
    loading: boolean;
  }>({
    departments: [],
    provinces: [],
    districts: [],
    generatedAt: null,
    error: null,
    loading: true,
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    async function load() {
      try {
        const res = await fetch(`${DATA_BASE}/hierarchy.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`hierarchy.json: HTTP ${res.status}`);
        const json = (await res.json()) as Hierarchy;
        if (!mounted.current) return;
        setRaw({
          departments: json.departments ?? [],
          provinces: json.provinces ?? [],
          districts: json.districts ?? [],
          generatedAt: json.generatedAt ?? null,
          error: null,
          loading: false,
        });
      } catch (e) {
        if (!mounted.current) return;
        setRaw((prev) => ({
          ...prev,
          error: e instanceof Error ? e.message : "Error desconocido",
          loading: false,
        }));
      }
    }

    void load();
    const id = setInterval(load, POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, []);

  // Build indexes only when the underlying arrays change identity.
  return useMemo<HierarchyState>(() => {
    if (raw.error && raw.departments.length === 0) {
      return { ...EMPTY, error: raw.error, loading: false };
    }

    const byDep = new Map<string, GeoProvince[]>();
    for (const p of raw.provinces) {
      const arr = byDep.get(p.depCode);
      if (arr) arr.push(p);
      else byDep.set(p.depCode, [p]);
    }

    const byProv = new Map<string, GeoDistrict[]>();
    for (const d of raw.districts) {
      const arr = byProv.get(d.provCode);
      if (arr) arr.push(d);
      else byProv.set(d.provCode, [d]);
    }

    const depByCode = new Map(raw.departments.map((d) => [d.code, d]));
    const provByCode = new Map(raw.provinces.map((p) => [p.code, p]));

    return {
      departments: raw.departments,
      provinces: raw.provinces,
      districts: raw.districts,
      byDep,
      byProv,
      depByCode,
      provByCode,
      generatedAt: raw.generatedAt,
      error: raw.error,
      loading: raw.loading,
    };
  }, [raw]);
}
