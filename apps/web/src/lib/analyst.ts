// Server-side: builds the system prompt + compact data digest for the AI analyst.
import type { Latest, DeepForensics } from "./types";

const fmt = new Intl.NumberFormat("es-PE");
const n = (x: number) => fmt.format(Math.round(x));
const pp = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(2)}pp`;

/**
 * SYSTEM_PROMPT is stable (cacheable). It teaches the analyst Gotham's methodology
 * so it interprets the numbers correctly and never invents data.
 */
export const SYSTEM_PROMPT = `Eres el ANALISTA DE INTELIGENCIA de Gotham, una plataforma de proyección electoral en vivo para la 2da vuelta presidencial de Perú 2026: Roberto Sánchez (Juntos por el Perú, izquierda) vs Keiko Fujimori (Fuerza Popular, derecha).

Tu trabajo: leer el estado del modelo y producir análisis afilado, honesto y cuantificado — como un analista de Palantir, no como un vocero. Escribes SIEMPRE en español, directo, sin preámbulo, sin meta-comentario ("Basado en los datos...", "Aquí está..."), sin viñetas salvo que ayuden. Citas los números reales que te doy. Nunca inventes cifras que no estén en el estado.

CÓMO FUNCIONA EL MODELO (entiéndelo para interpretar bien — la DIRECCIÓN actual sale del ESTADO que te doy abajo, NO la asumas):
- El titular de ONPE (% actual) puede ser ENGAÑOSO: el voto restante no es representativo. Suele estar dominado por estratos de reporte lento (Lima Metropolitana, voto del exterior) cuya composición política difiere del promedio nacional. Mira el estado actual para ver hacia quién se inclina hoy.
- Gotham usa un estimador estratificado de población finita sobre 273 estratos (196 provincias + 77 países), proyectando cada uno con su propio split observado. Por eso el método "naíve" (extrapolar el % nacional) puede diferir de los rigurosos; cuál favorece a quién depende del estado actual.
- Tres fuentes de incertidumbre: muestreo (data), deriva sistémica (supuesto), y ACTAS IMPUGNADAS/observadas en el JEE (riesgo legal, hoy la mayor fuente).
- "Cotas de Manski" = lo matemáticamente posible sin supuestos; si cruzan cero el resultado está abierto.
- "Sensibilidad" = cuánta deriva pro-Sánchez (en pp) haría falta para que gane.
- VEREDICTO: DECIDIDO / INCLINADO / INDECIDIBLE. INDECIDIBLE no significa empate 50/50 — significa que pivota en data que aún no existe (exterior incompleto, actas en disputa).
- CAVEAT clave: el conteo ONPE ≠ proclamación del JNE (semanas después); las actas en JEE pueden anularse o reasignarse. Es proyección estadística, no resultado oficial.

FORENSE / FRAUDE (sé riguroso y desinflador de pánico):
- Gotham corre tamices forenses sobre los datos publicados: Benford 2º dígito (2BL, el test preferido en forense electoral), Benford 1er dígito y uniformidad del último dígito, más un "libro de integridad" de actas. Te doy sus resultados en el ESTADO.
- Un rechazo de Benford NO prueba fraude (falsos positivos conocidos en datos electorales, Deckert et al. 2011); es motivo de auditoría, no veredicto. Si los tests salen NORMAL, dilo claro: no hay evidencia estadística de manipulación.
- Para rumores de cifras (p.ej. "900 mil actas"): ancla en el LIBRO DE INTEGRIDAD. El país tiene un universo FIJO de actas (~92,766). Cifras de cientos de miles/millones de "actas" no existen. Distingue actas observadas (JEE, capa legal normal) de fraude.
- Separa SIEMPRE tres cosas: (a) errores/lentitud de conteo, (b) disputa legal de actas en el JEE, (c) manipulación. Solo (c) es "fraude" y no hay evidencia de ella en los dígitos.

REGLAS:
- Honestidad sobre la incertidumbre por encima de todo. No declares un ganador si el veredicto es INDECIDIBLE; explica POR QUÉ está reñido y QUÉ lo decidiría.
- Para contrafácticos ("¿qué necesita X para ganar?"), usa la sensibilidad, el exterior y las cotas para dar condiciones concretas y cuantificadas.
- Sé conciso. Responde directamente.`;

/** Forensics block — only emitted if the contract carries it. */
function forensicDigest(d: Latest): string {
  const f = d.forensics;
  if (!f) return "";
  const sig = f.signals
    .map(
      (s) =>
        `${s.label}: ${s.verdict}${s.pvalue !== null ? ` (p=${s.pvalue < 0.001 ? "<0.001" : s.pvalue.toFixed(3)}, MAD=${s.mad ?? "—"})` : ""}`,
    )
    .join("; ");
  const l = f.ledger;
  return `
FORENSE (tamices de anomalía, NO prueba de fraude): VEREDICTO=${f.overall.verdict}. ${sig}.
LIBRO DE INTEGRIDAD: ${n(l.totalActas)} actas totales · ${n(l.countedActas)} contabilizadas · ${n(l.observedActas)} observadas en JEE (~${n(l.observedVotesEst)} votos) · ${n(l.pendingActas)} pendientes. Pool en disputa ~${n(l.disputedVotesEst)} votos vs margen actual ${n(l.marginVotes)} — ${l.poolCanFlip ? `puede revertir (swing neto ${l.swingNeededFrac !== null ? (l.swingNeededFrac * 100).toFixed(1) + "%" : "—"} del pool)` : "no revierte aunque se anule entero"}.`;
}

/** Mesa-level deep-forensics block — only if the separate scan is loaded. */
function deepForensicDigest(deep?: DeepForensics | null): string {
  if (!deep) return "";
  const sig = deep.signals
    .map((s) => `${s.label}: ${s.verdict}${s.pvalue !== null ? ` (p=${s.pvalue < 0.001 ? "<0.001" : s.pvalue.toFixed(3)}, MAD=${s.mad ?? "—"})` : ""}`)
    .join("; ");
  const pa = deep.participation;
  return `
FORENSE PROFUNDO (nivel MESA, muestra de ${n(deep.meta.mesasFetched)} mesas en ${deep.meta.districtsSampled} distritos / ${deep.meta.departmentsCovered} deptos): VEREDICTO=${deep.overall.verdict}. Test válido a nivel mesa = ÚLTIMO DÍGITO (Beber-Scacco); NO se usa Benford a nivel mesa (conteos acotados → falsos positivos). ${sig}. Mesas con aritmética imposible: ${deep.impossible.count}/${deep.impossible.checked}. Participación media ${pa.mean ?? "—"}%, mesas >100%: ${pa.countOver100 ?? "—"}. Estados: ${deep.estados.map((e) => `${e.estado} ${e.pct}%`).join(", ")}.`;
}

/** Compact, token-efficient digest of the current contract state. */
export function digest(d: Latest, deep?: DeepForensics | null): string {
  const [s, k] = d.candidates;
  const p = d.projection;
  const fv = p.final_votes;
  const ext = p.exterior;
  const topStrata = [...d.strata]
    .sort((a, b) => Math.abs(b.pctSanchez - 50) - Math.abs(a.pctSanchez - 50))
    .slice(0, 6)
    .map((x) => `${x.name} ${x.pctSanchez.toFixed(0)}%S (${x.actasPct.toFixed(0)}% actas)`)
    .join("; ");
  const methods = d.models
    .map((m) => `${m.label}: ${m.leader}${m.final_pct_sanchez != null ? ` ${m.final_pct_sanchez.toFixed(2)}%S` : ""} margen ${m.final_margin_votes >= 0 ? "+" : ""}${n(m.final_margin_votes)}${m.p_win ? ` P(K)=${(m.p_win.keiko * 100).toFixed(0)}%` : ""}`)
    .join("\n");
  const sens = p.sensitivity
    .filter((r) => [-2, -1, 0, 1, 2].includes(r.delta_pp))
    .map((r) => `δ${r.delta_pp >= 0 ? "+" : ""}${r.delta_pp}pp→P(S)=${(r.p_win_sanchez * 100).toFixed(0)}%`)
    .join("  ");

  return `CONTEO: ${d.count.actasContabilizadasPct.toFixed(2)}% actas nacionales · JEE ${d.count.actasEnJeePct.toFixed(2)}% · pendientes ${d.count.actasPendientesPct.toFixed(2)}% · participación ${d.count.participacionPct.toFixed(1)}%
AHORA: Sánchez ${s.pctValidos.toFixed(3)}% (${n(s.votes)}) vs Keiko ${k.pctValidos.toFixed(3)}% (${n(k.votes)}) — margen ${n(d.currentMargin.votes)} a favor de ${d.currentMargin.leader}.

PROYECCIÓN FINAL (Gotham):
- Votos: Sánchez ${n(fv.sanchez.median)} [IC90 ${n(fv.sanchez.ci90[0])}–${n(fv.sanchez.ci90[1])}] vs Keiko ${n(fv.keiko.median)} [IC90 ${n(fv.keiko.ci90[0])}–${n(fv.keiko.ci90[1])}]
- %: Sánchez ${p.final_pct.sanchez.median.toFixed(2)}% vs Keiko ${p.final_pct.keiko.median.toFixed(2)}%
- Margen proyectado: ${n(p.final_margin.median_votes)} votos (${pp(p.final_margin.median_pct)}) IC90 [${n(p.final_margin.ci90_votes[0])}, ${n(p.final_margin.ci90_votes[1])}]
- P(victoria): Sánchez ${(p.p_win.sanchez * 100).toFixed(1)}% · Keiko ${(p.p_win.keiko * 100).toFixed(1)}%
- VEREDICTO: ${p.decision} — ${p.decision_reason}
- Líder proyectado: ${p.leader}

DESCOMPOSICIÓN DE INCERTIDUMBRE (sd del margen, votos): muestreo ${n(p.sd_components.muestreo_votos)} · deriva ${n(p.sd_components.deriva_votos)} · impugnadas ${n(p.sd_components.impugnadas_votos)}.
COTAS DE MANSKI (lo posible): margen [${n(p.bounds.margin_votes[0])}, ${n(p.bounds.margin_votes[1])}] — ${p.bounds.straddles_zero ? "cruzan cero (abierto)" : "no cruzan cero"}.
SENSIBILIDAD: ${sens}.

ACTAS IMPUGNADAS (JEE): ${n(p.contested.pools.observadas_votos)} votos en ${p.contested.pools.observadas_actas} actas observadas (doméstico ${n(p.contested.pools.domestico.observadas_votos)}, exterior ${n(p.contested.pools.exterior.observadas_votos)}). ${p.contested.scenarios.flips_within_grid ? "El líder CAMBIA según anulación×skew." : "El líder es estable a la anulación."}

EXTERIOR (pivotal): ${ext.actasPct.toFixed(1)}% contado · ${ext.pctSanchez.toFixed(1)}% Sánchez · ~${n(ext.remainingVotesEst)} votos por contar · efecto neto estimado ${n(ext.leanKeikoNetEst)} a Keiko. Por continente: ${d.exteriorByContinent.map((c) => `${c.name} ${c.pctSanchez.toFixed(0)}%S (${c.actasPct.toFixed(0)}%, ~${n(c.remainingVotesEst)} rest.)`).join("; ")}.
${forensicDigest(d)}${deepForensicDigest(deep)}

MÉTODOS:
${methods}

ESTRATOS MÁS POLARIZADOS: ${topStrata}.`;
}

export const ANALYST_MODEL = process.env.ANALYST_MODEL || "claude-opus-4-8";
