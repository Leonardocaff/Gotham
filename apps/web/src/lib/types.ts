// Data contract — mirrors what the Python engine writes to public/data/latest.json.

export type CandidateKey = "sanchez" | "keiko";
export type Decision = "DECIDIDO" | "INCLINADO" | "INDECIDIBLE";

export interface Candidate {
  key: CandidateKey;
  name: string;
  party: string;
  color: string;
  votes: number;
  pctValidos: number;
}

export interface CountInfo {
  actasContabilizadasPct: number;
  actasEnJeePct: number;
  actasPendientesPct: number;
  contabilizadas: number;
  totalActas: number;
  participacionPct: number;
  totalVotosValidos: number;
  totalVotosEmitidos: number;
}

export interface FinalPct {
  median: number;
  ci90: [number, number];
}

export interface FinalVotesEntry {
  median: number;
  ci90: [number, number];
}

export interface FinalVotes {
  sanchez: FinalVotesEntry;
  keiko: FinalVotesEntry;
  total: number;
}

export interface SdComponents {
  muestreo_votos: number;
  deriva_votos: number;
  impugnadas_votos: number;
}

export interface Bounds {
  margin_votes: [number, number];
  margin_pct: [number, number];
  straddles_zero: boolean;
}

export interface SensitivityPoint {
  delta_pp: number;
  p_win_sanchez: number;
  margin_votes: number;
  leader: CandidateKey;
}

export interface ExteriorProjection {
  actasPct: number;
  votos: Record<CandidateKey, number>;
  pctSanchez: number;
  remainingVotesEst: number;
  leanKeikoNetEst: number;
}

export interface ContestedScenarioCell {
  annul: number;
  skew_pp: number;
  margin: number;
  leader: CandidateKey;
}

export interface ContestedPools {
  observadas_votos: number;
  observadas_actas: number;
  domestico: {
    observadas_votos: number;
    pendientes_votos: number;
    actas_observadas: number;
  };
  exterior: {
    observadas_votos: number;
    pendientes_votos: number;
    actas_observadas: number;
  };
}

export interface Contested {
  pools: ContestedPools;
  scenarios: {
    annul_rates: number[];
    skews_pp: number[];
    grid: ContestedScenarioCell[][];
    flips_within_grid: boolean;
  };
  bounds_con_anulacion: Bounds;
  nota_legal: string;
}

export interface Projection {
  leader: CandidateKey;
  p_win: Record<CandidateKey, number>;
  final_votes: FinalVotes;
  final_pct: Record<CandidateKey, FinalPct>;
  final_margin: {
    median_votes: number;
    ci90_votes: [number, number];
    median_pct: number;
    ci90_pct: [number, number];
  };
  sd_components: SdComponents;
  bounds: Bounds;
  sensitivity: SensitivityPoint[];
  exterior: ExteriorProjection;
  contested: Contested;
  decision: Decision;
  decision_reason: string;
}

export interface ModelResult {
  key: string;
  label: string;
  leader: CandidateKey;
  final_pct_sanchez?: number;
  final_margin_votes: number;
  final_margin_pct?: number;
  p_win?: Record<CandidateKey, number>;
  ci90_margin_votes?: [number, number];
}

export interface Stratum {
  code: string;
  name: string;
  region: string;
  rural: boolean;
  votos: Record<CandidateKey, number>;
  pctSanchez: number;
  leader: CandidateKey;
  actasPct: number;
}

export interface ContinentStratum {
  code: string;
  name: string;
  votos: Record<CandidateKey, number>;
  pctSanchez: number;
  leader: CandidateKey;
  actasPct: number;
  remainingVotesEst: number;
}

// ── Forensics — anomaly screening, NOT a fraud accusation ───────────────────

export type ForensicVerdict = "NORMAL" | "ATENCION" | "N/A";

/** One digit-distribution test (Benford 2BL/1BL, last-digit). */
export interface ForensicSignal {
  key: string;
  label: string;
  verdict: ForensicVerdict;
  n: number;
  chi2?: number;
  df?: number;
  pvalue: number | null;
  mad: number | null;
  observed: number[];
  expected: number[];
  domain?: number[];
  detail: string;
  caveat: string;
}

/** Factual actas accounting — the answer to "900k actas" style rumors. */
export interface ForensicLedger {
  totalActas: number;
  countedActas: number;
  observedActas: number;
  pendingActas: number;
  observedVotesEst: number;
  pendingVotesEst: number;
  disputedVotesEst: number;
  marginVotes: number;
  poolCanFlip: boolean;
  swingNeededFrac: number | null;
}

export interface Forensics {
  signals: ForensicSignal[];
  ledger: ForensicLedger;
  overall: { verdict: string; summary: string };
  disclaimer: string;
}

// ── Deep forensics (mesa-level) — public/data/forensics_deep.json ───────────

export interface MesaImpossible {
  checked: number;
  count: number;
  rate: number;
  examples: {
    codigoMesa: string;
    dep: string;
    electores: number;
    emitidos: number | null;
    validos: number | null;
    reasons: string[];
  }[];
}

export interface MesaParticipation {
  n: number;
  mean?: number;
  median?: number;
  pctOver95?: number;
  countOver100?: number;
  turnoutShareCorr?: number | null;
  histogram?: { binWidth: number; counts: number[] };
}

export interface DeepForensics {
  generatedAt: string;
  level: "mesa";
  meta: {
    districtsSampled: number;
    districtsTotal: number;
    departmentsCovered: number;
    actasListed: number;
    mesasFetched: number;
    seed: number;
  };
  signals: ForensicSignal[];
  impossible: MesaImpossible;
  participation: MesaParticipation;
  estados: { estado: string; count: number; pct: number }[];
  overall: { verdict: string; summary: string };
  disclaimer: string;
}

export interface Latest {
  generatedAt: string;
  source: {
    idEleccion?: number;
    portal: string;
    fechaActualizacion: number;
  };
  count: CountInfo;
  candidates: [Candidate, Candidate];
  currentMargin: {
    leader: CandidateKey;
    votes: number;
    pct: number;
  };
  projection: Projection;
  models: ModelResult[];
  strata: Stratum[];
  exteriorByContinent: ContinentStratum[];
  forensics?: Forensics | null;
  caveat: string;
}

export interface HistoryPoint {
  ts: string;
  fechaActualizacion: number;
  actasPct: number;
  sanchezPct: number;
  keikoPct: number;
  marginVotes: number;
  pWinSanchez: number;
  projMarginVotes: number;
  decision: Decision;
}

// ── Geographic hierarchy contract — public/data/hierarchy.json ──────────────
// Three flat arrays joined client-side by parent codes. `code` is a 6-digit
// string; departments share their code with latest.json strata[].code.

/** Department-level node. Carries region + rural for the explorer card. */
export interface GeoDepartment {
  code: string;
  name: string;
  region: string;
  rural: boolean;
  votos: Record<CandidateKey, number>;
  pctSanchez: number;
  leader: CandidateKey;
  actasPct: number;
  counted: number;
  remainingEst: number;
}

/** Province node — parented to a department by `depCode`. */
export interface GeoProvince {
  code: string;
  depCode: string;
  name: string;
  votos: Record<CandidateKey, number>;
  pctSanchez: number;
  leader: CandidateKey;
  actasPct: number;
  counted: number;
  remainingEst: number;
}

/** District node — parented to a province by `provCode` (and `depCode`). */
export interface GeoDistrict {
  code: string;
  provCode: string;
  depCode: string;
  name: string;
  votos: Record<CandidateKey, number>;
  pctSanchez: number;
  leader: CandidateKey;
  actasPct: number;
  counted: number;
  remainingEst: number;
}

/** A unit at any level the explorer can show. The shared fields are the ones
 * the live card reads; level-specific extras (region/rural, parent codes) are
 * optional so a single card renderer handles all three tiers. */
export interface GeoNode {
  level: "dep" | "prov" | "dist";
  code: string;
  name: string;
  votos: Record<CandidateKey, number>;
  pctSanchez: number;
  leader: CandidateKey;
  actasPct: number;
  counted: number;
  remainingEst: number;
  depCode: string; // self code at dep level
  provCode?: string;
  region?: string;
  rural?: boolean;
}

export interface Hierarchy {
  generatedAt: string;
  counts: { departments: number; provinces: number; districts: number };
  departments: GeoDepartment[];
  provinces: GeoProvince[];
  districts: GeoDistrict[];
}

// ── Derived helpers shared by globe + panels ────────────────────────────────

export function candidateByKey(
  candidates: readonly Candidate[],
  key: CandidateKey,
): Candidate | undefined {
  return candidates.find((c) => c.key === key);
}

export const CANDIDATE_COLOR: Record<CandidateKey, string> = {
  sanchez: "#3DD9A0",
  keiko: "#4A9EFF",
};

export const CANDIDATE_SHORT: Record<CandidateKey, string> = {
  sanchez: "Sánchez",
  keiko: "Keiko",
};
