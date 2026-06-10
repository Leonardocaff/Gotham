"""Forense electoral — indicadores de anomalía, NO un detector de fraude.

Un panel estricto de estadísticos rechaza cualquier afirmación de "fraude detectado" a
partir de pruebas de dígitos: la ley de Benford y los tests de último dígito son tamices
de *screening*, conocidos por producir falsos positivos en datos electorales legítimos
(Deckert, Myagkov & Ordeshook 2011). Por eso aquí cada señal reporta su estadístico, su
p-valor y su tamaño de efecto (MAD), con un veredicto sobrio (NORMAL / ATENCIÓN) y un
caveat explícito. La conclusión honesta vive en la síntesis: indicios que ameritan o no
auditoría — nunca una acusación.

Señales:
  1. Benford 2º dígito (2BL, Mebane) — el test preferido en forense electoral.
  2. Benford 1er dígito (Newcomb-Benford) — suplementario; más propenso a falsos positivos.
  3. Último dígito uniforme (Beber & Scacco 2012) — potente a nivel mesa; a nivel distrito
     (sumas de ~48 actas) la suma uniforma el dígito → test conservador, baja potencia.
  4. Libro de integridad (actas) — el conteo real: total, contabilizadas, observadas (JEE),
     pendientes; cuántos votos hay en disputa y qué le pueden hacer al margen. Es la
     respuesta factual a rumores tipo "900 mil actas".

Sustrato: los ~1,892 distritos (mapa-calor nivel_02), votos válidos por candidato. Los
totales distritales abarcan ~10²–10⁵ votos → dominio legítimo de Benford.
"""
from __future__ import annotations

import math
from typing import Any

import numpy as np
from scipy import stats

from ..snapshot import Snapshot

# — distribuciones esperadas —
_BENFORD_1 = [math.log10(1 + 1 / d) for d in range(1, 10)]                       # d=1..9
_BENFORD_2 = [sum(math.log10(1 + 1 / (10 * d1 + d2)) for d1 in range(1, 10))
              for d2 in range(0, 10)]                                            # d=0..9
_UNIFORM_10 = [0.1] * 10

# Umbrales MAD de Nigrini para 1er dígito (conformidad). Referencia citable.
_NIGRINI_MAD = {"close": 0.006, "acceptable": 0.012, "marginal": 0.015}


def _first_digit(n: int) -> int | None:
    n = abs(int(n))
    if n < 1:
        return None
    return int(str(n)[0])


def _second_digit(n: int) -> int | None:
    n = abs(int(n))
    if n < 10:               # sin segundo dígito significativo
        return None
    return int(str(n)[1])


def _last_digit(n: int) -> int:
    return abs(int(n)) % 10


def _chi2_test(observed_counts: list[int], expected_probs: list[float]) -> dict[str, float]:
    """Chi-cuadrado de bondad de ajuste + MAD (tamaño de efecto). df = k-1."""
    obs = np.asarray(observed_counts, dtype=float)
    n = obs.sum()
    exp = np.asarray(expected_probs, dtype=float) * n
    chi2 = float(((obs - exp) ** 2 / exp).sum())
    df = len(observed_counts) - 1
    pvalue = float(stats.chi2.sf(chi2, df))
    obs_p = obs / n if n else obs
    mad = float(np.abs(obs_p - np.asarray(expected_probs)).mean())
    return {"chi2": chi2, "df": df, "pvalue": pvalue, "mad": mad, "n": int(n)}


def _verdict(pvalue: float, mad: float, mad_marginal: float) -> str:
    """Sobrio a propósito: solo ATENCIÓN si hay significancia fuerte Y efecto material.

    Con muchos tests, p<0.05 aislado no dice nada (comparaciones múltiples). Exigimos
    p<0.01 además de una desviación que supere el umbral marginal del tamaño de efecto.
    """
    if pvalue < 0.01 and mad > mad_marginal:
        return "ATENCION"
    return "NORMAL"


def _digit_signal(key: str, label: str, values: list[int], extract, expected: list[float],
                  min_value: int, mad_marginal: float, caveat: str) -> dict[str, Any]:
    digits = [d for d in (extract(v) for v in values if abs(v) >= min_value) if d is not None]
    # dominio de dígitos según el test: Benford-1 es 1..9; 2BL y último dígito son 0..9
    domain = range(1, 10) if "benford1" in key else range(0, 10)
    counts = [sum(1 for d in digits if d == val) for val in domain]
    if sum(counts) < 50:                     # muestra insuficiente para un veredicto
        return {"key": key, "label": label, "verdict": "N/A",
                "detail": "Muestra insuficiente.", "caveat": caveat,
                "n": sum(counts), "pvalue": None, "mad": None,
                "observed": [], "expected": [round(p, 4) for p in expected]}
    res = _chi2_test(counts, expected)
    verdict = _verdict(res["pvalue"], res["mad"], mad_marginal)
    obs_p = [round(c / res["n"], 4) for c in counts]
    return {
        "key": key, "label": label, "verdict": verdict,
        "n": res["n"], "chi2": round(res["chi2"], 2), "df": res["df"],
        "pvalue": res["pvalue"], "mad": round(res["mad"], 5),
        "observed": obs_p, "expected": [round(p, 4) for p in expected],
        "domain": list(domain),
        "detail": (f"χ²={res['chi2']:.1f} (df={res['df']}), p={res['pvalue']:.3g}, "
                   f"MAD={res['mad']:.4f}, N={res['n']}."),
        "caveat": caveat,
    }


def _ledger(snap: Snapshot) -> dict[str, Any]:
    """El conteo real de actas y qué puede hacerle el pool en disputa al margen.

    Respuesta factual y defendible a rumores sobre cantidades de actas: el país tiene un
    universo FIJO de actas; observadas y pendientes son una fracción pequeña y conocida.
    """
    total = snap.total_actas
    counted = snap.contabilizadas
    obs_actas = snap.obs_actas_dom + snap.obs_actas_ext
    pend_actas = total - counted - obs_actas
    obs_votes = snap.obs_votes_dom + snap.obs_votes_ext
    pend_votes = snap.pend_votes_dom + snap.pend_votes_ext
    disputed_votes = obs_votes + pend_votes
    margin = abs(snap.votos_sanchez - snap.votos_keiko)
    # ¿podría el pool en disputa, en su peor caso, revertir el margen?
    pool_can_flip = disputed_votes > margin
    # qué fracción del pool tendría que moverse en bloque para empatar (swing neto)
    swing_needed = (margin / disputed_votes) if disputed_votes > 0 else float("inf")
    return {
        "totalActas": total,
        "countedActas": counted,
        "observedActas": int(obs_actas),       # en el JEE (impugnadas/observadas)
        "pendingActas": int(max(0, pend_actas)),
        "observedVotesEst": round(obs_votes),
        "pendingVotesEst": round(pend_votes),
        "disputedVotesEst": round(disputed_votes),
        "marginVotes": int(margin),
        "poolCanFlip": bool(pool_can_flip),
        "swingNeededFrac": round(swing_needed, 3) if math.isfinite(swing_needed) else None,
    }


def analyze(districts: list[dict[str, Any]], snap: Snapshot) -> dict[str, Any]:
    """Reporte forense. `districts`: filas de onpe.fetch_districts (votos por candidato)."""
    s_votes = [int(d["votos_sanchez"]) for d in districts]
    k_votes = [int(d["votos_keiko"]) for d in districts]
    pooled = s_votes + k_votes                      # ambos candidatos → máxima N

    benford2_caveat = ("2BL (Mebane) es el test preferido en forense electoral, pero un "
                       "rechazo solo orienta la auditoría: la heterogeneidad de tamaños "
                       "distritales puede desviarlo por sí sola.")
    benford1_caveat = ("La ley de Benford sobre datos electorales produce falsos positivos "
                       "(Deckert et al. 2011). Suplementario; se pondera por debajo del 2BL.")
    last_caveat = ("Potente a nivel MESA; aquí los totales distritales son sumas de ~48 "
                   "actas, y sumar uniformiza el último dígito → test conservador, de baja "
                   "potencia (rara vez detecta, casi nunca falso-positivo).")

    signals = [
        _digit_signal("benford2_pooled", "Benford 2º dígito (2BL)", pooled, _second_digit,
                      _BENFORD_2, min_value=10, mad_marginal=0.012, caveat=benford2_caveat),
        _digit_signal("benford1_pooled", "Benford 1er dígito", pooled, _first_digit,
                      _BENFORD_1, min_value=1, mad_marginal=_NIGRINI_MAD["marginal"],
                      caveat=benford1_caveat),
        _digit_signal("last_pooled", "Último dígito uniforme", pooled, _last_digit,
                      _UNIFORM_10, min_value=100, mad_marginal=0.015, caveat=last_caveat),
    ]

    ledger = _ledger(snap)

    flagged = [s for s in signals if s["verdict"] == "ATENCION"]
    if not flagged:
        overall_verdict = "SIN INDICIOS"
        summary = ("Las tres pruebas de dígitos (Benford 1° y 2° dígito, último dígito) salen "
                   "limpias. No hay rastro estadístico de manipulación en lo publicado. Lo único "
                   "que queda abierto es cuánto falta por contar.")
    else:
        names = ", ".join(s["label"] for s in flagged)
        overall_verdict = "REVISAR"
        summary = (f"Hay una señal que vale revisar: {names}. Benford a veces da falsas alarmas, "
                   "así que esto solo apunta a qué actas conviene auditar una por una.")

    return {
        "signals": signals,
        "ledger": ledger,
        "overall": {"verdict": overall_verdict, "summary": summary},
        "disclaimer": ("Es un tamiz estadístico. Ninguna de estas señales acusa fraude por sí "
                       "sola; solo dicen dónde mirar. Quien valida y proclama las actas es el JNE."),
    }
