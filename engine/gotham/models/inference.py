"""Inferencia defendible sobre el estimador estratificado.

Tres capas, separando explícitamente lo que la DATA dice de lo que se ASUME de lo que es
POSIBLE — la distinción que un panel estricto exige:

  1. closed_form   — distribución del margen final bajo el estimador estratificado, con
     incertidumbre de DOS fuentes, ambas defendibles:
       (a) muestreo: dentro de cada estrato la share remanente tiene varianza finita
           p(1−p)/n, con n = ACTAS contadas (la mesa es la unidad de correlación, no el
           voto). Derivada de la data, sin supuestos.
       (b) deriva sistémica δ: las actas que faltan podrían, en bloque, votar distinto a
           las contadas (sesgo de reporte diferencial residual). Se modela como un shift
           uniforme δ ~ Normal(δ_mean, σ_δ). Es el ÚNICO supuesto, y es explícito.
     Como ambos términos son lineales/gaussianos, el margen final es Normal y P(victoria)
     es cerrada: Φ(μ/σ). Sin ruido de simulación.

  2. manski_bounds — cotas sin supuestos: todo el remanente a un candidato o al otro. Es
     lo lógicamente posible; si las cotas cruzan cero, el resultado no está matemáticamente
     cerrado.

  3. sensitivity  — P(victoria) como función de la deriva asumida δ_mean. Hace transparente
     cuánta deriva pro-Sánchez (o pro-Keiko) haría falta para cambiar el veredicto. La
     subjetividad queda como un dial visible, no como un número escondido.

montecarlo_check valida (1) por simulación (Beta por estrato + δ).
"""
from __future__ import annotations

import numpy as np
from scipy.stats import norm

from ..snapshot import Snapshot
from .stratified import stratum_remaining_votes

SIGMA_DELTA = 0.015   # σ de la deriva sistémica (1.5pp); anclado en el corrimiento de
                      # cuenta tardía 2021. La sensibilidad se reporta para todo el rango.
SIGMA_SKEW = 0.03     # σ de la incertidumbre direccional del pool de actas observadas
                      # (no conocemos su geografía exacta ⇒ ±3pp de skew en su split).


def _arrays(snap: Snapshot):
    m = np.array([stratum_remaining_votes(s) for s in snap.strata])      # remanente por estrato
    p = np.array([s.split_sanchez for s in snap.strata])                 # share Sánchez observada
    n = np.array([max(s.actas, 1) for s in snap.strata], dtype=float)    # actas = tamaño muestral
    return m, p, n


def closed_form(snap: Snapshot, delta_mean: float = 0.0, sigma_delta: float = SIGMA_DELTA) -> dict:
    m, p, n = _arrays(snap)
    M = float(m.sum())
    counted_s = float(snap.votos_sanchez)
    counted_total = float(snap.votos_sanchez + snap.votos_keiko)

    mu_rem = float(np.sum(m * p)) + M * delta_mean
    var_samp = float(np.sum(m ** 2 * p * (1 - p) / n))          # muestreo (data)
    var_delta = (M ** 2) * (sigma_delta ** 2)                   # deriva sistémica (supuesto)
    O = float(snap.contested_votes)                             # votos en actas observadas
    var_contested = (O ** 2) * (SIGMA_SKEW ** 2)                # incertidumbre direccional del pool en disputa
    sd_rem = float(np.sqrt(var_samp + var_delta + var_contested))

    final_s_mean = counted_s + mu_rem
    total = counted_total + M
    margin_mean = 2 * final_s_mean - total
    margin_sd = 2 * sd_rem
    pct_s_mean = 100.0 * final_s_mean / total

    p_win_s = float(norm.cdf(margin_mean / margin_sd)) if margin_sd > 0 else float(margin_mean > 0)
    z = 1.6448536269514722  # 90%
    keiko_final_mean = total - final_s_mean
    return {
        "remaining_total": M,
        "p_win": {"sanchez": p_win_s, "keiko": 1.0 - p_win_s},
        "final_votes": {
            "sanchez": {"median": final_s_mean,
                        "ci90": [final_s_mean - z * sd_rem, final_s_mean + z * sd_rem]},
            "keiko": {"median": keiko_final_mean,
                      "ci90": [keiko_final_mean - z * sd_rem, keiko_final_mean + z * sd_rem]},
            "total": total,
        },
        "final_pct_sanchez": {
            "median": pct_s_mean,
            "ci90": [pct_s_mean - z * 100 * sd_rem / total, pct_s_mean + z * 100 * sd_rem / total],
        },
        "final_margin_votes": {
            "median": margin_mean,
            "ci90": [margin_mean - z * margin_sd, margin_mean + z * margin_sd],
        },
        "final_margin_pct": {
            "median": 100.0 * margin_mean / total,
            "ci90": [100.0 * (margin_mean - z * margin_sd) / total,
                     100.0 * (margin_mean + z * margin_sd) / total],
        },
        "sd_components": {
            "muestreo_votos": float(np.sqrt(var_samp)),
            "deriva_votos": float(np.sqrt(var_delta)),
            "impugnadas_votos": float(np.sqrt(var_contested)),
        },
        "leader": "sanchez" if margin_mean >= 0 else "keiko",
    }


def manski_bounds(snap: Snapshot) -> dict:
    M = float(sum(stratum_remaining_votes(s) for s in snap.strata))
    cur = snap.margin_votes
    total = snap.votos_sanchez + snap.votos_keiko + M
    hi, lo = cur + M, cur - M   # todo a Sánchez / todo a Keiko
    return {
        "remaining_total": M,
        "margin_votes": [lo, hi],
        "margin_pct": [100.0 * lo / total, 100.0 * hi / total],
        "straddles_zero": lo < 0 < hi,
    }


def sensitivity(snap: Snapshot, deltas=None) -> list[dict]:
    if deltas is None:
        deltas = [-0.03, -0.02, -0.015, -0.01, -0.005, 0.0, 0.005, 0.01, 0.015, 0.02, 0.03]
    out = []
    for d in deltas:
        cf = closed_form(snap, delta_mean=d)
        out.append({
            "delta_pp": round(d * 100, 2),
            "p_win_sanchez": round(cf["p_win"]["sanchez"], 4),
            "margin_votes": round(cf["final_margin_votes"]["median"]),
            "leader": cf["leader"],
        })
    return out


def montecarlo_check(snap: Snapshot, n_sims: int = 50_000,
                     sigma_delta: float = SIGMA_DELTA) -> dict:
    """Valida closed_form por simulación: Beta(n·p, n·(1−p)) por estrato + δ sistémico."""
    rng = np.random.default_rng(seed=snap.fecha_actualizacion or 20260609)
    m, p, n = _arrays(snap)
    a = np.clip(n * p, 1e-3, None)
    b = np.clip(n * (1 - p), 1e-3, None)
    # share remanente por estrato y simulación
    q = rng.beta(a[None, :], b[None, :], size=(n_sims, len(p)))          # (N, S)
    delta = rng.normal(0.0, sigma_delta, size=(n_sims, 1))
    q = np.clip(q + delta, 0.0, 1.0)
    sanchez_rem = q @ m                                                   # (N,)
    # incertidumbre direccional del pool de actas observadas (consistente con closed_form)
    contested = rng.normal(0.0, float(snap.contested_votes) * SIGMA_SKEW, size=n_sims)
    final_s = snap.votos_sanchez + sanchez_rem + contested
    total = snap.votos_sanchez + snap.votos_keiko + float(m.sum())
    margin = 2 * final_s - total
    p_win = float(np.mean(margin > 0))
    return {
        "p_win_sanchez": p_win,
        "margin_median": float(np.median(margin)),
        "margin_ci90": [float(np.percentile(margin, 5)), float(np.percentile(margin, 95))],
        "n_sims": n_sims,
    }
