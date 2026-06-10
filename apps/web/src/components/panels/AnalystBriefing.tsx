"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Latest } from "@/lib/types";
import { CANDIDATE_SHORT } from "@/lib/types";

/** Preguntas sugeridas derivadas del estado: nombran al líder/segundo reales, no
 * un candidato hardcodeado, para no quedar desactualizadas si la elección se mueve. */
function suggestionsFor(latest: Latest): string[] {
  const projLeader = latest.projection.leader;
  const trailer = projLeader === "sanchez" ? "keiko" : "sanchez";
  const countLeader = latest.currentMargin.leader;
  const first =
    projLeader === countLeader
      ? `¿Qué tan sólida es la ventaja de ${CANDIDATE_SHORT[projLeader]}?`
      : `¿Por qué ${CANDIDATE_SHORT[projLeader]} es favorito si ${CANDIDATE_SHORT[countLeader]} lidera el conteo?`;
  return [
    first,
    `¿Qué necesita exactamente ${CANDIDATE_SHORT[trailer]} para ganar?`,
    "¿Qué papel juega el voto del exterior?",
    "¿Qué riesgo representan las actas impugnadas?",
  ];
}

async function streamAnalyst(
  body: object,
  onDelta: (full: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/analyst", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    onDelta(
      res.status === 503
        ? "El analista IA no está configurado (falta la clave de API en el servidor)."
        : "El analista no está disponible ahora.",
    );
    return;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let acc = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    acc += dec.decode(value, { stream: true });
    onDelta(acc);
  }
}

export function AnalystBriefing({ latest }: { latest: Latest }) {
  const SUGGESTIONS = suggestionsFor(latest);
  const [brief, setBrief] = useState("");
  const [briefing, setBriefing] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const briefAbort = useRef<AbortController | null>(null);
  const askAbort = useRef<AbortController | null>(null);

  const runBrief = useCallback(async () => {
    briefAbort.current?.abort();
    const ctrl = new AbortController();
    briefAbort.current = ctrl;
    setBriefing(true);
    setBrief("");
    try {
      await streamAnalyst({ mode: "brief", contract: latest }, setBrief, ctrl.signal);
    } catch {
      /* aborted */
    } finally {
      if (briefAbort.current === ctrl) setBriefing(false);
    }
  }, [latest]);

  // Generate on mount + whenever the verdict or projected leader changes
  // (not on every 30s poll — that would burn tokens for no new signal).
  const sig = `${latest.projection.decision}|${latest.projection.leader}`;
  const lastSig = useRef<string>("");
  useEffect(() => {
    if (lastSig.current === sig) return;
    lastSig.current = sig;
    runBrief();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const ask = useCallback(
    async (q: string) => {
      const query = q.trim();
      if (!query) return;
      askAbort.current?.abort();
      const ctrl = new AbortController();
      askAbort.current = ctrl;
      setAsking(true);
      setAnswer("");
      try {
        await streamAnalyst(
          { mode: "ask", question: query, contract: latest },
          setAnswer,
          ctrl.signal,
        );
      } catch {
        /* aborted */
      } finally {
        if (askAbort.current === ctrl) setAsking(false);
      }
    },
    [latest],
  );

  return (
    <section className="glass lift relative overflow-hidden p-5 sm:p-6">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl"
        style={{ background: "#9B7AFF" }}
      />
      <header className="relative mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: "#9B7AFF", boxShadow: "0 0 10px #9B7AFFcc" }}
          />
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-ink-1">
            Briefing de Inteligencia
          </h2>
          <span className="rounded border border-edge px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            IA · analista
          </span>
        </div>
        <button
          onClick={runBrief}
          disabled={briefing}
          className="rounded-md border border-edge px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-ink-2 transition hover:border-edge-strong hover:text-ink-1 disabled:opacity-40"
        >
          {briefing ? "generando…" : "regenerar"}
        </button>
      </header>

      <p className="relative min-h-[5.5rem] whitespace-pre-wrap text-[13px] leading-relaxed text-ink-1">
        {brief}
        {briefing && (
          <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-accent-purple align-middle" />
        )}
      </p>

      <div className="relative mt-4 border-t border-edge pt-4">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuestion(q);
                ask(q);
              }}
              disabled={asking}
              className="rounded-full border border-edge bg-surface-2 px-2.5 py-1 text-[10px] text-ink-2 transition hover:border-edge-strong hover:text-ink-1 active:scale-[0.98] disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Pregunta al analista…"
            className="min-w-0 flex-1 rounded-md border border-edge bg-surface-2 px-3 py-2 font-mono text-xs text-ink-1 placeholder:text-ink-3 focus:border-edge-strong focus:outline-none"
          />
          <button
            type="submit"
            disabled={asking || !question.trim()}
            className="rounded-md border border-accent-purple/40 bg-accent-purple/10 px-3 py-2 text-xs font-semibold text-accent-purple transition hover:bg-accent-purple/20 disabled:opacity-40"
          >
            {asking ? "…" : "preguntar"}
          </button>
        </form>
        {(answer || asking) && (
          <p className="mt-3 whitespace-pre-wrap rounded-md border border-edge bg-surface-1/60 p-3 text-[13px] leading-relaxed text-ink-1">
            {answer}
            {asking && (
              <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-accent-purple align-middle" />
            )}
          </p>
        )}
      </div>
    </section>
  );
}
