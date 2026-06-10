"use client";

import type { DeepForensics as DeepForensicsData } from "@/lib/types";
import { int, pct } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/atoms";
import { SignalRow, VerdictChip } from "./forensicsShared";

/** Turnout histogram — bars over 0–100% participation. A smooth unimodal shape
 * is normal; spikes at round numbers or a hump near 100% would be notable. */
function TurnoutHistogram({
  counts,
  binWidth,
}: {
  counts: number[];
  binWidth: number;
}) {
  const max = Math.max(...counts, 1);
  return (
    <div>
      <div className="flex items-end gap-px" style={{ height: 52 }}>
        {counts.map((c, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-accent-cyan/45"
            style={{ height: `${(c / max) * 100}%` }}
            title={`${(i * binWidth).toFixed(0)}–${((i + 1) * binWidth).toFixed(0)}%: ${c} mesas`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[8px] text-ink-3">
        <span>0%</span>
        <span>participación</span>
        <span>100%</span>
      </div>
    </div>
  );
}

export function DeepForensics({ data }: { data: DeepForensicsData | null }) {
  if (!data) return null;
  const { overall, signals, impossible, participation, estados, meta } = data;
  const clean = overall.verdict === "SIN INDICIOS";

  return (
    <Panel
      title="Forense profundo · nivel mesa"
      hint={`Muestra de ${int(meta.mesasFetched)} mesas (conteos crudos) en ${meta.districtsSampled} distritos · ${meta.departmentsCovered} deptos — alta potencia estadística`}
      aside={<VerdictChip verdict={clean ? "NORMAL" : "ATENCION"} label={overall.verdict} />}
    >
      <p className="text-[11px] leading-snug text-ink-2">{overall.summary}</p>

      {/* Último dígito por candidato — el test válido a nivel mesa (Beber-Scacco) */}
      <div className="mt-3 space-y-2.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
          Último dígito · Beber-Scacco
        </span>
        {signals.map((s) => (
          <SignalRow key={s.key} signal={s} />
        ))}
      </div>

      {/* Mesas imposibles — integridad aritmética, sin interpretación */}
      <div className="mt-3.5 border-t border-edge pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-ink-1">Mesas imposibles</span>
          <VerdictChip verdict={impossible.count === 0 ? "NORMAL" : "ATENCION"} />
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1">
          <Stat label="Detectadas">
            <span style={{ color: impossible.count === 0 ? undefined : "#FFB43C" }}>
              {int(impossible.count)}
            </span>
          </Stat>
          <Stat label="Revisadas">{int(impossible.checked)}</Stat>
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-ink-3">
          Votos o asistentes que exceden el padrón, o válidos &gt; emitidos.{" "}
          {impossible.count === 0
            ? "Ninguna en la muestra — la aritmética de cada acta cierra."
            : "Probables errores de digitación; ameritan revisar el acta física."}
        </p>
      </div>

      {/* Participación — descriptivo, con caveat */}
      {participation.n > 0 && participation.histogram && (
        <div className="mt-3.5 border-t border-edge pt-3">
          <span className="text-[12px] text-ink-1">Participación por mesa</span>
          <div className="mt-2">
            <TurnoutHistogram
              counts={participation.histogram.counts}
              binWidth={participation.histogram.binWidth}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            <Stat label="Media">{pct(participation.mean ?? 0, 1)}</Stat>
            <Stat label="Mediana">{pct(participation.median ?? 0, 1)}</Stat>
            <Stat label="Mesas > 95%">{pct(participation.pctOver95 ?? 0, 2)}</Stat>
            <Stat label="Mesas > 100%">
              <span style={{ color: (participation.countOver100 ?? 0) === 0 ? undefined : "#FFB43C" }}>
                {int(participation.countOver100 ?? 0)}
              </span>
            </Stat>
          </div>
          <p className="mt-1.5 text-[10px] leading-snug text-ink-3">
            Descriptivo. En zonas rurales homogéneas, alta participación con fuerte
            ventaja de un candidato es <span className="text-ink-2">normal</span>, no
            señal de fraude — por eso no entra al veredicto.
          </p>
        </div>
      )}

      {/* Estado de actas en la muestra */}
      {estados.length > 0 && (
        <div className="mt-3.5 border-t border-edge pt-3">
          <span className="text-[12px] text-ink-1">Estado de actas (muestra)</span>
          <div className="mt-2 space-y-1.5">
            {estados.map((e) => (
              <div key={e.estado} className="flex items-center gap-2">
                <span className="w-32 truncate text-[11px] text-ink-2" title={e.estado}>
                  {e.estado}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-accent-emerald/70"
                    style={{ width: `${e.pct}%` }}
                  />
                </div>
                <span className="tnum w-12 text-right font-mono text-[11px] text-ink-3">
                  {pct(e.pct, 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 border-t border-edge pt-2.5 text-[10px] leading-snug text-ink-3">
        {data.disclaimer}
      </p>
    </Panel>
  );
}
