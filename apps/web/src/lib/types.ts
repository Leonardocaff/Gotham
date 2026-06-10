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

export interface Projection {
  leader: CandidateKey;
  p_win: Record<CandidateKey, number>;
  final_pct: Record<CandidateKey, FinalPct>;
  final_margin: {
    median_votes: number;
    ci90_votes: [number, number];
    median_pct: number;
    ci90_pct: [number, number];
  };
  decision: Decision;
  decision_reason: string;
}

export interface ModelResult {
  key: string;
  label: string;
  leader: CandidateKey;
  final_pct_sanchez: number;
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
