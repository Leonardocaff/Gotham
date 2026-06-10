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
