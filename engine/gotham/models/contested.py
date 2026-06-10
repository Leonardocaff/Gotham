"""Capa de actas en disputa (observadas / impugnadas / JEE) y anulación.

El restante NO es homogéneo. ONPE expone por ámbito cuántas actas están OBSERVADAS (en el
JEE, con error material/firmas/votos que no cuadran → riesgo de anulación) vs simplemente
PENDIENTES (lentas). Hoy el ~90% del restante doméstico son actas observadas (~300k votos
en disputa), mientras el exterior es casi todo pendiente.

La proyección base asume que las observadas se cuentan con el split de su zona. Esta capa
hace explícito lo que eso ignora:

  - ANULACIÓN: una fracción de las observadas se anula (votos eliminados), lo cual es
    DIRECCIONAL — perjudica a quien lidera esas actas. Históricamente el JNE anula <3% de
    las observadas, pero los partidos piden nulidad en zonas específicas (Fuerza Popular,
    2021, en actas rurales pro-Castillo).
  - SKEW: no conocemos la geografía exacta de las observadas; podrían inclinarse más rural
    (pro-Sánchez) o más Lima (pro-Keiko) que el promedio.

Como no hay data per-estrato de las observadas, NO se hornea una dirección: se reporta un
barrido de escenarios (anulación × skew) y una extensión de las cotas de Manski. La capa
LEGAL del JNE (pedidos de nulidad post-conteo) queda como bandera cualitativa, fuera del
modelo estadístico.
"""
from __future__ import annotations

from ..snapshot import Snapshot


def _ambito_split_sanchez(snap: Snapshot, ambito: int) -> float:
    strata = snap.domestic_strata if ambito == 1 else snap.exterior_strata
    s = sum(st.votos_sanchez for st in strata)
    t = sum(st.counted for st in strata) or 1
    return s / t


def pools(snap: Snapshot) -> dict:
    return {
        "observadas_votos": round(snap.contested_votes),
        "observadas_actas": snap.obs_actas_dom + snap.obs_actas_ext,
        "domestico": {"observadas_votos": round(snap.obs_votes_dom),
                      "pendientes_votos": round(snap.pend_votes_dom),
                      "actas_observadas": snap.obs_actas_dom},
        "exterior": {"observadas_votos": round(snap.obs_votes_ext),
                     "pendientes_votos": round(snap.pend_votes_ext),
                     "actas_observadas": snap.obs_actas_ext},
    }


def _delta_margin(snap: Snapshot, annul_rate: float, skew_sanchez: float) -> float:
    """Cambio en el margen final vs. la base (observadas cuentan al split de su ámbito).

    Δ = Σ_ámbito O · [(1−a)·(2(p0+k)−1) − (2p0−1)], con O=votos observados, p0=split base,
    a=tasa de anulación, k=skew pro-Sánchez de las observadas.
    """
    delta = 0.0
    for ambito, O in ((1, snap.obs_votes_dom), (2, snap.obs_votes_ext)):
        p0 = _ambito_split_sanchez(snap, ambito)
        pk = min(max(p0 + skew_sanchez, 0.0), 1.0)
        base = O * (2 * p0 - 1)
        scen = O * (1 - annul_rate) * (2 * pk - 1)
        delta += scen - base
    return delta


def scenarios(snap: Snapshot, base_margin: float,
              annul_rates=(0.0, 0.05, 0.10, 0.20),
              skews=(-0.05, 0.0, 0.05)) -> dict:
    """Grid (anulación × skew) → margen final ajustado y líder."""
    grid = []
    for a in annul_rates:
        row = []
        for k in skews:
            m = base_margin + _delta_margin(snap, a, k)
            row.append({"annul": round(a, 3), "skew_pp": round(k * 100, 1),
                        "margin": round(m), "leader": "sanchez" if m >= 0 else "keiko"})
        grid.append(row)
    leaders = {cell["leader"] for r in grid for cell in r}
    return {"annul_rates": list(annul_rates), "skews_pp": [round(k * 100, 1) for k in skews],
            "grid": grid, "flips_within_grid": len(leaders) > 1}


def manski_with_annulment(snap: Snapshot, base_remaining: float) -> dict:
    """Cotas extendidas: además del remanente, las observadas podrían anularse (retirar
    votos del líder local). Envelope sin supuestos sobre dirección."""
    O = snap.contested_votes
    cur = snap.margin_votes
    M = base_remaining
    total = snap.votos_sanchez + snap.votos_keiko + M
    hi = cur + M                      # todo el remanente a Sánchez
    lo = cur - M - O                  # remanente a Keiko + anulación de observadas pro-Sánchez
    return {"margin_votes": [round(lo), round(hi)],
            "margin_pct": [round(100 * lo / total, 2), round(100 * hi / total, 2)],
            "straddles_zero": lo < 0 < hi}
