"use client";

import type { Latest } from "@/lib/types";
import { int, pct } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/atoms";
import { SignalRow, VerdictChip } from "./forensicsShared";

export function ForensicIntegrity({ latest }: { latest: Latest }) {
  const f = latest.forensics;
  if (!f) return null;
  const { ledger, overall, signals } = f;
  const clean = overall.verdict === "SIN INDICIOS";

  return (
    <Panel
      title="Forense · integridad del conteo"
      hint="Pruebas estadísticas para detectar anomalías. Solo señalan dónde mirar."
      aside={<VerdictChip verdict={clean ? "NORMAL" : "ATENCION"} label={overall.verdict} />}
    >
      {/* Síntesis honesta */}
      <p className="text-[11px] leading-snug text-ink-2">{overall.summary}</p>

      {/* Libro de integridad de actas — la respuesta factual a rumores de cifras */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-edge pt-3">
        <Stat label="Actas (universo)">{int(ledger.totalActas)}</Stat>
        <Stat label="Contabilizadas">{int(ledger.countedActas)}</Stat>
        <Stat label="Observadas (JEE)">
          <span style={{ color: "#FFB43C" }}>{int(ledger.observedActas)}</span>
        </Stat>
        <Stat label="Pendientes">{int(ledger.pendingActas)}</Stat>
      </div>

      {/* Rumor-check: el universo de actas es fijo y pequeño */}
      <p className="mt-2.5 rounded-md border border-edge bg-surface-3/40 px-2.5 py-2 text-[10px] leading-snug text-ink-3">
        El país tiene{" "}
        <span className="tnum font-mono text-ink-1">{int(ledger.totalActas)}</span>{" "}
        actas en total, y ese número no cambia. Cifras como “900 mil actas” son
        más de 10 veces eso: no existen. Lo que de verdad está en disputa son{" "}
        <span className="tnum font-mono" style={{ color: "#FFB43C" }}>
          {int(ledger.observedActas)}
        </span>{" "}
        actas observadas en el JEE (~
        <span className="tnum font-mono text-ink-2">
          {int(ledger.observedVotesEst)}
        </span>{" "}
        votos).
      </p>

      {/* Pool en disputa vs margen actual */}
      <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
        <Stat label="Votos en disputa (est.)">{int(ledger.disputedVotesEst)}</Stat>
        <Stat label="Margen actual">{int(ledger.marginVotes)}</Stat>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-ink-3">
        {ledger.poolCanFlip ? (
          <>
            Los votos en disputa{" "}
            <span className="text-ink-2">superan</span> al margen actual: con que
            se reasigne el{" "}
            <span className="tnum font-mono" style={{ color: "#FFB43C" }}>
              {ledger.swingNeededFrac !== null
                ? pct(ledger.swingNeededFrac * 100, 1)
                : "—"}
            </span>{" "}
            de ellos ya hay empate. Por eso el veredicto sigue en “inclinado”:
            queda una duda legal por resolver.
          </>
        ) : (
          <>
            Los votos en disputa son <span className="text-ink-2">menos</span> que
            el margen: aunque se anularan todos, no cambian el resultado.
          </>
        )}
      </p>

      {/* Señales de dígitos */}
      <div className="mt-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
            Tests de dígitos · {signals[0]?.n ? int(signals[0].n) : "—"} obs.
          </span>
          <span className="text-[9px] text-ink-3">toca para detalle</span>
        </div>
        {signals.map((s) => (
          <SignalRow key={s.key} signal={s} />
        ))}
      </div>

      <p className="mt-3 border-t border-edge pt-2.5 text-[10px] leading-snug text-ink-3">
        {f.disclaimer}
      </p>
    </Panel>
  );
}
