"""Estimadores puntuales de población finita.

Marco: NO es un muestreo aleatorio. Observamos un subconjunto NO representativo de una
población finita de actas (la selección — qué actas ya se contaron — está correlacionada
con la geografía y por tanto con la preferencia). El estimando es el conteo final sobre
TODAS las actas.

Dos estimadores, ambos data-driven (sin priors direccionales):

  naive_swing      — el residual se reparte como el split NACIONAL actual. Es el supuesto
                     implícito del titular de ONPE. Sesgado si lo que falta no es como el
                     promedio (lo es: falta Lima y el exterior, pro-Keiko).
  stratified_point — cada estrato (provincia o país) se completa al 100% de SUS actas
                     usando SU PROPIO split observado, ponderado por su restante real.
                     Corrige el sesgo de reporte diferencial entre estratos. (Supuesto:
                     dentro del estrato, las actas que faltan votan como las contadas.)
"""
from __future__ import annotations

from ..snapshot import Snapshot, Stratum


def stratum_remaining_votes(s: Stratum) -> float:
    """Votos válidos por contar en el estrato: counted · (100 − pct)/pct.

    Usa votos/acta del PROPIO estrato (mesas topadas a ~300 electores ⇒ votos/acta
    estable), así el exterior (votos/acta bajo) y Lima (alto) se proyectan correctamente."""
    p = s.pct_actas
    if p <= 0 or p >= 100:
        return 0.0
    return s.counted * (100.0 - p) / p


def _finalize(final_s: float, final_k: float, key: str, label: str) -> dict:
    total = final_s + final_k or 1.0
    pct_s = 100.0 * final_s / total
    return {
        "key": key, "label": label,
        "final_sanchez": final_s, "final_keiko": final_k,
        "final_pct_sanchez": pct_s, "final_pct_keiko": 100.0 - pct_s,
        "final_margin_votes": final_s - final_k,
        "final_margin_pct": 2 * pct_s - 100.0,
        "leader": "sanchez" if final_s >= final_k else "keiko",
    }


def total_remaining(snap: Snapshot) -> float:
    return sum(stratum_remaining_votes(s) for s in snap.strata)


def naive_swing(snap: Snapshot) -> dict:
    R = total_remaining(snap)
    p_nat = snap.votos_sanchez / (snap.votos_sanchez + snap.votos_keiko)
    final_s = snap.votos_sanchez + R * p_nat
    final_k = snap.votos_keiko + R * (1.0 - p_nat)
    return _finalize(final_s, final_k, "naive", "Naíve (swing nacional)")


def stratified_point(snap: Snapshot) -> dict:
    final_s = float(snap.votos_sanchez)
    final_k = float(snap.votos_keiko)
    # OJO: votos_sanchez/keiko nacionales ya incluyen lo contado en todos los estratos;
    # aquí sumamos SOLO el remanente proyectado de cada estrato.
    for s in snap.strata:
        m = stratum_remaining_votes(s)
        final_s += m * s.split_sanchez
        final_k += m * (1.0 - s.split_sanchez)
    return _finalize(final_s, final_k, "stratified", "Estratificado (población finita)")
