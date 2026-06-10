"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Latest, HistoryPoint } from "./types";

const POLL_MS = 30_000;

// Fuente de datos: en Vercel apunta al store externo (Vercel Blob) para data en vivo
// sin redeploy; en local cae a los archivos estáticos que escribe el poller.
const DATA_BASE = (process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "/data").replace(/\/$/, "");

export interface LiveState {
  latest: Latest | null;
  history: HistoryPoint[];
  error: string | null;
  loading: boolean;
  lastFetched: number | null;
}

function parseHistory(text: string): HistoryPoint[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as HistoryPoint;
      } catch {
        return null;
      }
    })
    .filter((p): p is HistoryPoint => p !== null);
}

export function useLiveData(): LiveState {
  const [state, setState] = useState<LiveState>({
    latest: null,
    history: [],
    error: null,
    loading: true,
    lastFetched: null,
  });
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const [latestRes, historyRes] = await Promise.all([
        fetch(`${DATA_BASE}/latest.json?t=${Date.now()}`, { cache: "no-store" }),
        fetch(`${DATA_BASE}/history.jsonl?t=${Date.now()}`, { cache: "no-store" }),
      ]);

      if (!latestRes.ok) throw new Error(`latest.json: HTTP ${latestRes.status}`);

      const latest = (await latestRes.json()) as Latest;
      const history = historyRes.ok ? parseHistory(await historyRes.text()) : [];

      if (!mounted.current) return;
      setState({
        latest,
        history,
        error: null,
        loading: false,
        lastFetched: Date.now(),
      });
    } catch (e) {
      if (!mounted.current) return;
      setState((prev) => ({
        ...prev,
        error: e instanceof Error ? e.message : "Error desconocido",
        loading: false,
      }));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [load]);

  return state;
}

/** Returns true for one render-cycle window after `value` changes. Used for flash highlight. */
export function useChangeFlash(value: number | string | null | undefined): boolean {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value && prev.current !== undefined) {
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 1100);
      prev.current = value;
      return () => clearTimeout(id);
    }
    prev.current = value;
  }, [value]);
  return flash;
}
