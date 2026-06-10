"""Serialización al contrato JSON (motor → UI) y persistencia.

Escribe `latest.json` (estado completo actual) y appendea `history.jsonl` (una línea por
snapshot, para la serie temporal). El contrato es la ÚNICA superficie que consume el
dashboard Next.js.
"""
from __future__ import annotations

import json
import os
from collections import defaultdict
from datetime import datetime, timezone

from .config import CANDIDATES, HISTORY_PATH, LATEST_PATH
from .snapshot import Snapshot

CAVEAT = (
    "Proyección estadística, NO resultado oficial. El conteo ONPE no es la proclamación "
    "del JNE (semanas después). Las actas en JEE/pendientes pueden anularse o reasignarse. "
    "Con <97% de actas y margen sub-0.5pp, el resultado es genuinamente indecidible."
)


def _departments(snap: Snapshot) -> list[dict]:
    """Agrega los estratos-provincia a departamento para el choropleth."""
    agg: dict[str, dict] = defaultdict(
        lambda: {"votos_sanchez": 0, "votos_keiko": 0, "wpct": 0.0, "actas": 0,
                 "name": "", "region": "", "rural": False}
    )
    for s in snap.domestic_strata:  # exterior va aparte en projection.exterior
        a = agg[s.dep_code]
        a["votos_sanchez"] += s.votos_sanchez
        a["votos_keiko"] += s.votos_keiko
        a["wpct"] += s.pct_actas * s.actas
        a["actas"] += s.actas
        a["name"] = s.dep_name
        a["region"] = s.region
        a["rural"] = s.rural
    out = []
    for code, a in sorted(agg.items()):
        total = a["votos_sanchez"] + a["votos_keiko"] or 1
        out.append({
            "code": code,
            "name": a["name"],
            "region": a["region"],
            "rural": a["rural"],
            "votos": {"sanchez": a["votos_sanchez"], "keiko": a["votos_keiko"]},
            "pctSanchez": round(100 * a["votos_sanchez"] / total, 2),
            "leader": "sanchez" if a["votos_sanchez"] >= a["votos_keiko"] else "keiko",
            "actasPct": round(a["wpct"] / a["actas"], 2) if a["actas"] else 0,
        })
    return out


_CONT = {"91": "África", "92": "América", "93": "Asia", "94": "Europa", "95": "Oceanía"}


def _exterior_by_continent(snap: Snapshot) -> list[dict]:
    """Agrega los estratos del exterior por continente para el globe."""
    from collections import defaultdict
    from .models.stratified import stratum_remaining_votes
    agg: dict[str, dict] = defaultdict(
        lambda: {"votos_sanchez": 0, "votos_keiko": 0, "wpct": 0.0, "actas": 0, "rem": 0.0})
    for s in snap.exterior_strata:
        cont = s.dep_code.replace("EXT", "")[:2]
        a = agg[cont]
        a["votos_sanchez"] += s.votos_sanchez
        a["votos_keiko"] += s.votos_keiko
        a["wpct"] += s.pct_actas * s.actas
        a["actas"] += s.actas
        a["rem"] += stratum_remaining_votes(s)
    out = []
    for code, a in sorted(agg.items()):
        total = a["votos_sanchez"] + a["votos_keiko"] or 1
        out.append({
            "code": code, "name": _CONT.get(code, code),
            "votos": {"sanchez": a["votos_sanchez"], "keiko": a["votos_keiko"]},
            "pctSanchez": round(100 * a["votos_sanchez"] / total, 2),
            "leader": "sanchez" if a["votos_sanchez"] >= a["votos_keiko"] else "keiko",
            "actasPct": round(a["wpct"] / a["actas"], 2) if a["actas"] else 0,
            "remainingVotesEst": round(a["rem"]),
        })
    return out


def build_contract(snap: Snapshot, result: dict) -> dict:
    margin_leader = snap.leader
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "idEleccion": 10,
            "portal": "resultadosegundavuelta.onpe.gob.pe",
            "fechaActualizacion": snap.fecha_actualizacion,
        },
        "count": {
            "actasContabilizadasPct": snap.actas_contabilizadas_pct,
            "actasEnJeePct": snap.actas_jee_pct,
            "actasPendientesPct": snap.actas_pendientes_pct,
            "contabilizadas": snap.contabilizadas,
            "totalActas": snap.total_actas,
            "participacionPct": snap.participacion_pct,
            "totalVotosValidos": snap.total_votos_validos,
            "totalVotosEmitidos": snap.total_votos_emitidos,
        },
        "candidates": [
            {**{k: CANDIDATES[key][k] for k in ("key", "name", "party", "color")},
             "votes": snap.votos_sanchez if key == "sanchez" else snap.votos_keiko,
             "pctValidos": snap.pct_sanchez if key == "sanchez" else snap.pct_keiko}
            for key in ("sanchez", "keiko")
        ],
        "currentMargin": {
            "leader": margin_leader,
            "votes": abs(snap.margin_votes),
            "pct": round(abs(snap.pct_sanchez - snap.pct_keiko), 3),
        },
        "projection": {k: result[k] for k in
                       ("leader", "p_win", "final_pct", "final_margin", "sd_components",
                        "bounds", "sensitivity", "exterior", "contested",
                        "decision", "decision_reason")},
        "models": result["models"],
        "strata": _departments(snap),
        "exteriorByContinent": _exterior_by_continent(snap),
        "caveat": CAVEAT,
    }


def write_latest(contract: dict) -> None:
    os.makedirs(os.path.dirname(LATEST_PATH), exist_ok=True)
    with open(LATEST_PATH, "w", encoding="utf-8") as f:
        json.dump(contract, f, ensure_ascii=False, indent=2)


def append_history(contract: dict) -> None:
    os.makedirs(os.path.dirname(HISTORY_PATH), exist_ok=True)
    proj = contract["projection"]
    row = {
        "ts": contract["generatedAt"],
        "fechaActualizacion": contract["source"]["fechaActualizacion"],
        "actasPct": contract["count"]["actasContabilizadasPct"],
        "sanchezPct": contract["candidates"][0]["pctValidos"],
        "keikoPct": contract["candidates"][1]["pctValidos"],
        "marginVotes": contract["currentMargin"]["votes"] *
        (1 if contract["currentMargin"]["leader"] == "sanchez" else -1),
        "pWinSanchez": proj["p_win"]["sanchez"],
        "projMarginVotes": proj["final_margin"]["median_votes"],
        "decision": proj["decision"],
    }
    # dedup: no appendear si el último fechaActualizacion es idéntico
    if os.path.exists(HISTORY_PATH):
        try:
            with open(HISTORY_PATH, "r", encoding="utf-8") as f:
                lines = f.readlines()
            if lines:
                last = json.loads(lines[-1])
                if last.get("fechaActualizacion") == row["fechaActualizacion"]:
                    return
        except (json.JSONDecodeError, OSError):
            pass
    with open(HISTORY_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
