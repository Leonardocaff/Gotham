"""Ensemble — ensambla los métodos en un veredicto defendible y honesto.

Reporta, lado a lado: el método naíve (titular), el estratificado (data-driven), la
inferencia en forma cerrada (P y IC), las cotas de Manski (lo posible), el barrido de
sensibilidad (lo asumido) y un Monte Carlo de verificación. El veredicto NO esconde
incertidumbre: si el IC90 del margen cruza cero o la sensibilidad cambia el líder dentro
del rango de deriva plausible (±1.5pp), dice INDECIDIBLE. Las cotas de Manski entran como
información (peor caso lógicamente posible, sin probabilidad), no como gate del veredicto.
"""
from __future__ import annotations

from ..snapshot import Snapshot
from . import contested, inference, stratified


def _exterior(snap: Snapshot) -> dict:
    ext = snap.exterior_strata
    cs = sum(s.votos_sanchez for s in ext)
    ck = sum(s.votos_keiko for s in ext)
    rem = sum(inference.stratum_remaining_votes(s) for s in ext)
    tot = cs + ck or 1
    return {
        "actasPct": round(snap.ext_actas_pct, 2),
        "votos": {"sanchez": cs, "keiko": ck},
        "pctSanchez": round(100 * cs / tot, 2),
        "remainingVotesEst": round(rem),
        "leanKeikoNetEst": round(rem * (ck / tot - cs / tot)),  # neto Keiko si remanente ~ split actual
    }


def _decision(p_win_leader: float, cf_ci: list[float], bounds_straddle: bool,
              ext_pct: float, margin_pct_abs: float, sens,
              leader_name: str, counted_pct: float) -> tuple[str, str]:
    """Veredicto basado en la EVIDENCIA EXISTENTE, no en el peor caso lógicamente posible.

    Las cotas de Manski (bounds_straddle) describen lo que sería posible si CADA voto
    restante fuera en una sola dirección — un escenario sin probabilidad, no una
    incertidumbre. Por eso entran como *información* (panel ManskiBounds), no como
    gate del veredicto. El veredicto se decide por:
      • P(líder) — masa de probabilidad bajo el modelo estratificado de población finita,
      • IC90 del margen — ¿cruza cero la incertidumbre real (muestral + deriva + sesgo)?,
      • robustez a la deriva — ¿el líder cambia dentro de ±1.5pp de deriva plausible?,
      • completitud — exterior y conteo nacional.
    """
    cf_crosses = cf_ci[0] < 0 < cf_ci[1]
    # ¿el líder cambia dentro de la deriva plausible (±1.5pp)?
    leaders = {row["leader"] for row in sens if abs(row["delta_pp"]) <= 1.5}
    flips_within_plausible = len(leaders) > 1

    # — INDECIDIBLE: la evidencia real no separa a los candidatos —
    if ext_pct < 80.0 and margin_pct_abs < 0.5:
        return "INDECIDIBLE", (
            f"El exterior está {ext_pct:.0f}% contado (pool grande, pro-Keiko) y el margen "
            f"proyectado es {margin_pct_abs:.2f}pp: pivota en data que aún no existe.")
    if flips_within_plausible or cf_crosses or p_win_leader < 0.80:
        return "INDECIDIBLE", (
            f"P({leader_name})={p_win_leader:.0%}, pero el IC90 del margen cruza cero "
            f"y/o el líder cambia dentro de la deriva plausible (±1.5pp). Empate estadístico.")

    # — DECIDIDO: P alta, IC90 sin cruzar, robusto, y el conteo ya cerró el margen —
    closed = counted_pct >= 99.5 or margin_pct_abs >= 1.0
    if p_win_leader >= 0.95 and closed:
        return "DECIDIDO", (
            f"P({leader_name})={p_win_leader:.0%}, IC90 sin cruzar cero, robusto a ±1.5pp de "
            f"deriva y con {counted_pct:.1f}% de actas contabilizadas.")

    # — INCLINADO: favorito claro y robusto, pero el margen es fino y aún falta cerrar —
    note = (f"margen {margin_pct_abs:.2f}pp con {counted_pct:.1f}% contado aún puede moverse"
            if margin_pct_abs < 1.0 else f"{counted_pct:.1f}% contado, falta cerrar")
    return "INCLINADO", (
        f"P({leader_name})={p_win_leader:.0%}: {leader_name} favorito claro y robusto a la "
        f"deriva, pero {note}; no alcanza el umbral de cierre.")


def evaluate(snap: Snapshot) -> dict:
    naive = stratified.naive_swing(snap)
    strat = stratified.stratified_point(snap)
    cf = inference.closed_form(snap, delta_mean=0.0)        # baseline objetivo (sin deriva)
    bounds = inference.manski_bounds(snap)
    sens = inference.sensitivity(snap)
    mc = inference.montecarlo_check(snap)
    ext = _exterior(snap)
    # capa de actas impugnadas/observadas
    base_margin = strat["final_margin_votes"]
    R = stratified.total_remaining(snap)
    contested_pools = contested.pools(snap)
    contested_scen = contested.scenarios(snap, base_margin)
    bounds_annul = contested.manski_with_annulment(snap, R)

    leader = cf["leader"]
    p_win_leader = cf["p_win"][leader]
    margin_pct_abs = abs(cf["final_margin_pct"]["median"])
    leader_name = "Sánchez" if leader == "sanchez" else "Keiko"
    decision, reason = _decision(p_win_leader, cf["final_margin_votes"]["ci90"],
                                 bounds["straddles_zero"] or contested_scen["flips_within_grid"],
                                 ext["actasPct"], margin_pct_abs, sens,
                                 leader_name, snap.actas_contabilizadas_pct)

    methods = [
        {"key": "naive", "label": naive["label"], "leader": naive["leader"],
         "final_pct_sanchez": round(naive["final_pct_sanchez"], 3),
         "final_margin_votes": round(naive["final_margin_votes"])},
        {"key": "stratified", "label": strat["label"], "leader": strat["leader"],
         "final_pct_sanchez": round(strat["final_pct_sanchez"], 3),
         "final_margin_votes": round(strat["final_margin_votes"])},
        {"key": "closed_form", "label": "Forma cerrada (P, IC)", "leader": cf["leader"],
         "p_win": {k: round(v, 4) for k, v in cf["p_win"].items()},
         "final_pct_sanchez": round(cf["final_pct_sanchez"]["median"], 3),
         "final_margin_votes": round(cf["final_margin_votes"]["median"]),
         "ci90_margin_votes": [round(x) for x in cf["final_margin_votes"]["ci90"]]},
        {"key": "mc_check", "label": "Monte Carlo (verificación)", "leader":
         "sanchez" if mc["p_win_sanchez"] >= 0.5 else "keiko",
         "p_win": {"sanchez": round(mc["p_win_sanchez"], 4),
                   "keiko": round(1 - mc["p_win_sanchez"], 4)},
         "final_pct_sanchez": round(
             100.0 * ((mc["margin_median"] + cf["final_votes"]["total"]) / 2.0)
             / cf["final_votes"]["total"], 3),
         "final_margin_votes": round(mc["margin_median"])},
    ]

    fv = cf["final_votes"]
    return {
        "leader": leader,
        "p_win": {k: round(v, 4) for k, v in cf["p_win"].items()},
        "final_votes": {
            "sanchez": {"median": round(fv["sanchez"]["median"]),
                        "ci90": [round(x) for x in fv["sanchez"]["ci90"]]},
            "keiko": {"median": round(fv["keiko"]["median"]),
                      "ci90": [round(x) for x in fv["keiko"]["ci90"]]},
            "total": round(fv["total"]),
        },
        "final_pct": {
            "sanchez": {"median": round(cf["final_pct_sanchez"]["median"], 3),
                        "ci90": [round(x, 3) for x in cf["final_pct_sanchez"]["ci90"]]},
            "keiko": {"median": round(100 - cf["final_pct_sanchez"]["median"], 3),
                      "ci90": [round(100 - x, 3) for x in cf["final_pct_sanchez"]["ci90"]][::-1]},
        },
        "final_margin": {
            "median_votes": round(cf["final_margin_votes"]["median"]),
            "ci90_votes": [round(x) for x in cf["final_margin_votes"]["ci90"]],
            "median_pct": round(cf["final_margin_pct"]["median"], 3),
            "ci90_pct": [round(x, 3) for x in cf["final_margin_pct"]["ci90"]],
        },
        "sd_components": {k: round(v) for k, v in cf["sd_components"].items()},
        "bounds": {"margin_votes": [round(x) for x in bounds["margin_votes"]],
                   "margin_pct": [round(x, 2) for x in bounds["margin_pct"]],
                   "straddles_zero": bounds["straddles_zero"]},
        "sensitivity": sens,
        "exterior": ext,
        "contested": {
            "pools": contested_pools,
            "scenarios": contested_scen,
            "bounds_con_anulacion": bounds_annul,
            "nota_legal": (
                "El conteo ONPE no es la proclamación del JNE. Los pedidos de NULIDAD ante "
                "el JNE (capa legal adversarial post-conteo) pueden anular o reasignar actas "
                "semanas después y NO están en esta proyección estadística."),
        },
        "decision": decision,
        "decision_reason": reason,
        "models": methods,
    }
