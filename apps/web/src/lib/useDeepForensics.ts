"use client";

import { useEffect, useRef, useState } from "react";
import type { DeepForensics } from "./types";

// The mesa-level deep scan runs on a slow cadence (separate job); refresh
// every few minutes is plenty. ADDITIVE — independent of useLiveData.
const POLL_MS = 180_000;

const DATA_BASE = (process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "/data").replace(/\/$/, "");

export interface DeepForensicsState {
  data: DeepForensics | null;
  error: string | null;
  loading: boolean;
}

/** Loads forensics_deep.json (mesa-level forensics). Returns null until ready;
 * the panel simply hides if it never loads. */
export function useDeepForensics(): DeepForensicsState {
  const [state, setState] = useState<DeepForensicsState>({
    data: null,
    error: null,
    loading: true,
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    async function load() {
      try {
        const res = await fetch(`${DATA_BASE}/forensics_deep.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`forensics_deep.json: HTTP ${res.status}`);
        const json = (await res.json()) as DeepForensics;
        if (!mounted.current) return;
        setState({ data: json, error: null, loading: false });
      } catch (e) {
        if (!mounted.current) return;
        setState((prev) => ({
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

  return state;
}
