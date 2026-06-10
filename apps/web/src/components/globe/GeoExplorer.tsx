"use client";

import { useMemo, useState } from "react";
import {
  CANDIDATE_COLOR,
  CANDIDATE_SHORT,
  type CandidateKey,
  type GeoNode,
  type Latest,
} from "@/lib/types";
import type { HierarchyState } from "@/lib/useHierarchy";
import { useChangeFlash } from "@/lib/useLiveData";
import { int, pct, signedInt, signedPp } from "@/lib/format";

const ACCENT_GOLD = "#FFB43C";
const ACCENT_ROSE = "#FF7A8A";

/** The selection path the explorer walks. Each level holds the active code at
 * that tier; null means "not drilled this deep". Department is required for any
 * non-national view. */
export interface GeoPath {
  depCode: string;
  provCode?: string;
  distCode?: string;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Net votes the still-uncounted pool would hand the unit's leader IF it broke
 * exactly like what's already counted. Positive = toward leader. */
function netLean(node: GeoNode): { leader: CandidateKey; net: number } {
  const frac = node.pctSanchez / 100; // share Sánchez
  const netSanchez = node.remainingEst * (2 * frac - 1);
  return netSanchez >= 0
    ? { leader: "sanchez", net: Math.round(Math.abs(netSanchez)) }
    : { leader: "keiko", net: Math.round(Math.abs(netSanchez)) };
}

function marginPp(node: GeoNode): number {
  return node.pctSanchez - (100 - node.pctSanchez); // +ve Sánchez, −ve Keiko
}

function LeaderBadge({ leader }: { leader: CandidateKey }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]"
      style={{
        color: CANDIDATE_COLOR[leader],
        borderColor: `${CANDIDATE_COLOR[leader]}40`,
        backgroundColor: `${CANDIDATE_COLOR[leader]}12`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor: CANDIDATE_COLOR[leader],
          boxShadow: `0 0 8px ${CANDIDATE_COLOR[leader]}`,
        }}
      />
      {CANDIDATE_SHORT[leader]}
    </span>
  );
}

/** Head-to-head split bar — emerald (Sánchez) vs cyan (Keiko). */
function SplitBar({ pctSanchez, h = 10 }: { pctSanchez: number; h?: number }) {
  const keiko = 100 - pctSanchez;
  return (
    <div
      className="flex w-full overflow-hidden rounded-full bg-surface-3"
      style={{ height: h }}
    >
      <div
        className="transition-[width] duration-700 ease-out"
        style={{ width: `${pctSanchez}%`, backgroundColor: CANDIDATE_COLOR.sanchez }}
      />
      <div
        className="transition-[width] duration-700 ease-out"
        style={{ width: `${keiko}%`, backgroundColor: CANDIDATE_COLOR.keiko }}
      />
    </div>
  );
}

/** A numeric value that flashes on change. */
function Flash({
  value,
  display,
  className = "",
  color,
}: {
  value: number | string;
  display: string;
  className?: string;
  color?: string;
}) {
  const flash = useChangeFlash(value);
  return (
    <span
      className={`tnum font-mono ${flash ? "animate-flash rounded px-0.5" : ""} ${className}`}
      style={color ? { color } : undefined}
    >
      {display}
    </span>
  );
}

/** One cross-reference line: label on the left, value on the right. */
function XRef({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[11px] leading-snug text-ink-3">{label}</span>
      <span className="shrink-0 text-right text-[12px] text-ink-1">{children}</span>
    </div>
  );
}

/** The rich live card for the currently selected unit. */
function UnitCard({ node, latest }: { node: GeoNode; latest: Latest }) {
  const keikoPct = 100 - node.pctSanchez;
  const mPp = marginPp(node);
  const marginVotes = node.votos.sanchez - node.votos.keiko;
  const lean = netLean(node);
  const swing = Math.abs(mPp) < 5;

  // National reference frame.
  const nationalPctSanchez = latest.candidates[0].pctValidos;
  const vsCountry = node.pctSanchez - nationalPctSanchez; // +ve = more pro-Sánchez
  const weight =
    latest.count.totalVotosValidos > 0
      ? (node.counted / latest.count.totalVotosValidos) * 100
      : 0;

  const levelLabel =
    node.level === "dep" ? "Departamento" : node.level === "prov" ? "Provincia" : "Distrito";

  return (
    <div className="animate-fadeUp">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-[10px] font-medium uppercase tracking-[0.18em]"
              style={{ color: CANDIDATE_COLOR[node.leader] }}
            >
              {levelLabel}
            </span>
            {swing && (
              <span
                className="rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em]"
                style={{
                  color: ACCENT_ROSE,
                  borderColor: `${ACCENT_ROSE}40`,
                  backgroundColor: `${ACCENT_ROSE}12`,
                }}
              >
                Reñido
              </span>
            )}
          </div>
          <h3 className="truncate font-display text-lg leading-tight text-ink-1">
            {titleCase(node.name)}
          </h3>
        </div>
        <LeaderBadge leader={node.leader} />
      </div>

      {/* Region / type for departments */}
      {node.level === "dep" && (node.region || node.rural !== undefined) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {node.region && (
            <span className="rounded border border-edge bg-surface-3 px-1.5 py-0.5 text-[10px] capitalize text-ink-2">
              {node.region.replace(/_/g, " ")}
            </span>
          )}
          <span className="rounded border border-edge bg-surface-3 px-1.5 py-0.5 text-[10px] text-ink-2">
            {node.rural ? "Rural" : "Urbano"}
          </span>
        </div>
      )}

      {/* Big split */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="flex items-baseline gap-1.5">
            <Flash
              value={node.pctSanchez}
              display={pct(node.pctSanchez)}
              className="text-2xl"
              color={CANDIDATE_COLOR.sanchez}
            />
            <span className="text-[11px] text-ink-3">Sánchez</span>
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-[11px] text-ink-3">Keiko</span>
            <Flash
              value={keikoPct}
              display={pct(keikoPct)}
              className="text-2xl"
              color={CANDIDATE_COLOR.keiko}
            />
          </span>
        </div>
        <SplitBar pctSanchez={node.pctSanchez} />
        <div className="mt-1.5 flex justify-between font-mono text-[11px] tnum text-ink-3">
          <Flash value={node.votos.sanchez} display={int(node.votos.sanchez)} />
          <Flash value={node.votos.keiko} display={int(node.votos.keiko)} />
        </div>
      </div>

      {/* Margin + completeness row */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-edge bg-surface-3 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3">Margen</div>
          <div
            className="tnum font-mono text-sm"
            style={{ color: CANDIDATE_COLOR[node.leader] }}
          >
            {signedInt(marginVotes)}
          </div>
          <div className="tnum font-mono text-[10px] text-ink-3">{signedPp(mPp)}</div>
        </div>
        <div className="rounded-lg border border-edge bg-surface-3 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3">Actas</div>
          <div className="tnum font-mono text-sm text-ink-1">{pct(node.actasPct)}</div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-1">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.min(100, node.actasPct)}%`,
                backgroundColor: node.actasPct >= 99 ? CANDIDATE_COLOR.sanchez : ACCENT_GOLD,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Cross-referenced intelligence ─────────────────────────────────── */}
      <div className="mt-3 rounded-lg border border-edge-strong bg-surface-2 px-3 py-2">
        <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
          Inteligencia cruzada
        </div>

        <XRef label="Votos por contar (est.)">
          <span className="text-ink-1">~{int(node.remainingEst)}</span>
        </XRef>

        {node.remainingEst > 0 && (
          <XRef label="Si lo que falta vota igual">
            aporta{" "}
            <span style={{ color: CANDIDATE_COLOR[lean.leader] }}>
              ~{int(lean.net)} netos
            </span>{" "}
            a {CANDIDATE_SHORT[lean.leader]}
          </XRef>
        )}

        <XRef label="vs. el país">
          <span style={{ color: vsCountry >= 0 ? CANDIDATE_COLOR.sanchez : CANDIDATE_COLOR.keiko }}>
            {signedPp(vsCountry)}
          </span>{" "}
          <span className="text-ink-3">
            más pro-{vsCountry >= 0 ? "Sánchez" : "Keiko"}
          </span>
        </XRef>

        <XRef label="Peso nacional">
          <span className="text-ink-1">{pct(weight, weight < 1 ? 2 : 1)}</span>{" "}
          <span className="text-ink-3">del voto válido</span>
        </XRef>
      </div>
    </div>
  );
}

/** A clickable child row — slim split bar + name + completeness + chevron. */
function ChildRow({
  node,
  onClick,
}: {
  node: GeoNode;
  onClick: () => void;
}) {
  const swing = Math.abs(marginPp(node)) < 5;
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-edge hover:bg-surface-3"
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          backgroundColor: CANDIDATE_COLOR[node.leader],
          boxShadow: swing ? `0 0 7px ${ACCENT_ROSE}` : undefined,
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[12px] text-ink-1">{titleCase(node.name)}</span>
          <span
            className="tnum shrink-0 font-mono text-[11px]"
            style={{ color: CANDIDATE_COLOR[node.leader] }}
          >
            {pct(node.pctSanchez)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1">
            <SplitBar pctSanchez={node.pctSanchez} h={4} />
          </div>
          <span className="tnum shrink-0 font-mono text-[9px] text-ink-3">
            {pct(node.actasPct, 0)} actas
          </span>
        </div>
      </div>
      <span className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-1">
        ›
      </span>
    </button>
  );
}

type SortMode = "margin" | "votos";

export function GeoExplorer({
  path,
  hierarchy,
  latest,
  onNavigate,
  onClose,
  className = "",
}: {
  path: GeoPath | null;
  hierarchy: HierarchyState;
  latest: Latest;
  /** depCode required; province/district codes optional. null = national. */
  onNavigate: (next: GeoPath | null) => void;
  onClose: () => void;
  className?: string;
}) {
  const [sort, setSort] = useState<SortMode>("margin");

  const { depByCode, provByCode, byDep, byProv } = hierarchy;

  // Resolve the active node + its children from the path.
  const view = useMemo(() => {
    if (!path) return null;
    const dep = depByCode.get(path.depCode);
    if (!dep) return null;

    if (path.distCode) {
      const dist = (byProv.get(path.provCode ?? "") ?? []).find(
        (d) => d.code === path.distCode,
      );
      if (!dist) return null;
      const node: GeoNode = {
        level: "dist",
        code: dist.code,
        name: dist.name,
        votos: dist.votos,
        pctSanchez: dist.pctSanchez,
        leader: dist.leader,
        actasPct: dist.actasPct,
        counted: dist.counted,
        remainingEst: dist.remainingEst,
        depCode: dist.depCode,
        provCode: dist.provCode,
      };
      return { node, children: [] as GeoNode[] };
    }

    if (path.provCode) {
      const prov = provByCode.get(path.provCode);
      if (!prov) return null;
      const node: GeoNode = {
        level: "prov",
        code: prov.code,
        name: prov.name,
        votos: prov.votos,
        pctSanchez: prov.pctSanchez,
        leader: prov.leader,
        actasPct: prov.actasPct,
        counted: prov.counted,
        remainingEst: prov.remainingEst,
        depCode: prov.depCode,
        provCode: prov.code,
      };
      const children: GeoNode[] = (byProv.get(prov.code) ?? []).map((d) => ({
        level: "dist",
        code: d.code,
        name: d.name,
        votos: d.votos,
        pctSanchez: d.pctSanchez,
        leader: d.leader,
        actasPct: d.actasPct,
        counted: d.counted,
        remainingEst: d.remainingEst,
        depCode: d.depCode,
        provCode: d.provCode,
      }));
      return { node, children };
    }

    // Department level.
    const node: GeoNode = {
      level: "dep",
      code: dep.code,
      name: dep.name,
      votos: dep.votos,
      pctSanchez: dep.pctSanchez,
      leader: dep.leader,
      actasPct: dep.actasPct,
      counted: dep.counted,
      remainingEst: dep.remainingEst,
      depCode: dep.code,
      region: dep.region,
      rural: dep.rural,
    };
    const children: GeoNode[] = (byDep.get(dep.code) ?? []).map((p) => ({
      level: "prov",
      code: p.code,
      name: p.name,
      votos: p.votos,
      pctSanchez: p.pctSanchez,
      leader: p.leader,
      actasPct: p.actasPct,
      counted: p.counted,
      remainingEst: p.remainingEst,
      depCode: p.depCode,
      provCode: p.code,
    }));
    return { node, children };
  }, [path, depByCode, provByCode, byDep, byProv]);

  const sortedChildren = useMemo(() => {
    if (!view) return [];
    const arr = [...view.children];
    if (sort === "votos") {
      arr.sort(
        (a, b) =>
          b.votos.sanchez + b.votos.keiko - (a.votos.sanchez + a.votos.keiko),
      );
    } else {
      // margin intensity — most lopsided first; toss-ups float to the visible
      // edge via the dot glow regardless.
      arr.sort((a, b) => Math.abs(marginPp(b)) - Math.abs(marginPp(a)));
    }
    return arr;
  }, [view, sort]);

  if (!path || !view) {
    if (hierarchy.loading) {
      return (
        <div className={`glass-2 p-4 ${className}`}>
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 animate-pulseDot rounded-full bg-accent-cyan" />
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
              Cargando jerarquía geográfica…
            </span>
          </div>
        </div>
      );
    }
    // Empty state — invite interaction.
    return (
      <div className={`glass-2 p-4 ${className}`}>
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-3">
          Explorador geográfico
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-2">
          Toca un departamento en el globo para abrir el detalle en vivo y bajar
          a provincia y distrito.
        </p>
        {hierarchy.error && (
          <p className="mt-2 text-[11px] text-accent-rose">{hierarchy.error}</p>
        )}
      </div>
    );
  }

  const { node, children } = view;
  const depName = depByCode.get(node.depCode)?.name ?? "";
  const provName = node.provCode ? provByCode.get(node.provCode)?.name : undefined;

  // Breadcrumb crumbs — each clickable to climb back up.
  const crumbs: { label: string; onClick: (() => void) | null }[] = [
    { label: "Perú", onClick: () => onClose() },
    {
      label: titleCase(depName),
      onClick:
        node.level === "dep" ? null : () => onNavigate({ depCode: node.depCode }),
    },
  ];
  if (provName) {
    crumbs.push({
      label: titleCase(provName),
      onClick:
        node.level === "prov"
          ? null
          : () => onNavigate({ depCode: node.depCode, provCode: node.provCode }),
    });
  }
  if (node.level === "dist") {
    crumbs.push({ label: titleCase(node.name), onClick: null });
  }

  const childLabel = node.level === "dep" ? "Provincias" : "Distritos";

  return (
    <div className={`glass-2 flex flex-col p-4 ${className}`}>
      {/* mobile grab handle */}
      <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-edge-strong sm:hidden" />

      {/* Breadcrumb + close */}
      <div className="flex items-start justify-between gap-2">
        <nav className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px]">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-ink-3">›</span>}
              {c.onClick ? (
                <button
                  onClick={c.onClick}
                  className="rounded text-ink-3 transition-colors hover:text-ink-1"
                >
                  {c.label}
                </button>
              ) : (
                <span className="text-ink-1">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <button
          onClick={onClose}
          aria-label="Cerrar explorador"
          className="shrink-0 rounded-md border border-edge px-2 py-1 text-[11px] text-ink-3 transition-colors hover:border-edge-strong hover:text-ink-1 active:bg-surface-3"
        >
          ✕
        </button>
      </div>

      <div className="my-3 h-px w-full bg-edge" />

      <UnitCard node={node} latest={latest} />

      {/* Children list */}
      {children.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
              {childLabel}{" "}
              <span className="tnum font-mono text-ink-3">({children.length})</span>
            </span>
            <div className="flex items-center gap-1 text-[10px]">
              <button
                onClick={() => setSort("margin")}
                className={`rounded px-1.5 py-0.5 transition-colors ${
                  sort === "margin" ? "text-ink-1" : "text-ink-3 hover:text-ink-2"
                }`}
              >
                margen
              </button>
              <span className="text-edge-strong">·</span>
              <button
                onClick={() => setSort("votos")}
                className={`rounded px-1.5 py-0.5 transition-colors ${
                  sort === "votos" ? "text-ink-1" : "text-ink-3 hover:text-ink-2"
                }`}
              >
                votos
              </button>
            </div>
          </div>
          <div className="-mr-1 max-h-[300px] space-y-0.5 overflow-y-auto pr-1">
            {sortedChildren.map((child) => (
              <ChildRow
                key={child.code}
                node={child}
                onClick={() =>
                  onNavigate(
                    child.level === "prov"
                      ? { depCode: node.depCode, provCode: child.code }
                      : {
                          depCode: node.depCode,
                          provCode: child.provCode,
                          distCode: child.code,
                        },
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      {node.level === "dist" && (
        <p className="mt-3 text-[11px] leading-snug text-ink-3">
          Nivel distrital — la unidad más fina. Usa las migas de pan para subir.
        </p>
      )}
    </div>
  );
}
