"""Tests del núcleo matemático (puro, sin red). Ejecutar: python -m pytest engine/tests"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gotham.models import ensemble, inference, stratified
from gotham.snapshot import Snapshot, Stratum


def _stratum(name, vs, vk, actas, pct, ambito=1, tilt="sanchez"):
    return Stratum("X", name, 1, "r", False, tilt, vs, vk, actas, pct, ambito)


def _snap(strata, ext_s=0, ext_k=0, ext_pct=0.0):
    vs = sum(s.votos_sanchez for s in strata)
    vk = sum(s.votos_keiko for s in strata)
    return Snapshot(
        fecha_actualizacion=20260609,
        actas_contabilizadas_pct=96.0, actas_jee_pct=1.6, actas_pendientes_pct=1.9,
        contabilizadas=sum(s.actas for s in strata), total_actas=sum(s.actas for s in strata),
        participacion_pct=70.0, total_votos_validos=vs + vk, total_votos_emitidos=vs + vk,
        votos_sanchez=vs, votos_keiko=vk,
        pct_sanchez=100 * vs / (vs + vk), pct_keiko=100 * vk / (vs + vk),
        strata=strata, ext_votos_sanchez=ext_s, ext_votos_keiko=ext_k, ext_actas_pct=ext_pct,
    )


def test_stratum_remaining_zero_at_100pct():
    s = _stratum("A", 100, 100, 10, 100.0)
    assert stratified.stratum_remaining_votes(s) == 0.0


def test_stratified_equals_naive_when_single_stratum():
    """Con un solo estrato, estratificado = naíve (el split del estrato ES el nacional)."""
    snap = _snap([_stratum("A", 600, 400, 100, 90.0)])
    a = stratified.stratified_point(snap)["final_pct_sanchez"]
    b = stratified.naive_swing(snap)["final_pct_sanchez"]
    assert abs(a - b) < 1e-6


def test_stratified_diverges_from_naive_with_lagging_keiko_stratum():
    """Un estrato pro-Keiko menos completo arrastra la proyección bajo el naíve."""
    strata = [
        _stratum("LIMA", 355, 645, 96, 96.0, tilt="keiko"),   # pro-Keiko, menos completo
        _stratum("PUNO", 860, 140, 100, 99.8),                # pro-Sánchez, casi completo
    ]
    snap = _snap(strata)
    strat = stratified.stratified_point(snap)["final_pct_sanchez"]
    naive = stratified.naive_swing(snap)["final_pct_sanchez"]
    assert strat < naive  # el estratificado capta el arrastre de Lima


def test_closed_form_pwin_in_unit_and_components_positive():
    snap = _snap([_stratum("LIMA", 355, 645, 96, 96.0), _stratum("PUNO", 860, 140, 100, 99.8)])
    cf = inference.closed_form(snap)
    assert 0.0 <= cf["p_win"]["sanchez"] <= 1.0
    assert cf["sd_components"]["muestreo_votos"] > 0
    assert cf["sd_components"]["deriva_votos"] >= 0


def test_manski_bounds_straddle_when_remaining_exceeds_margin():
    snap = _snap([_stratum("PAREJO", 510, 490, 96, 80.0)])  # margen +20, restante ~250 >> 20
    b = inference.manski_bounds(snap)
    assert b["margin_votes"][0] <= 0 <= b["margin_votes"][1]
    assert b["straddles_zero"] is True


def test_sensitivity_monotonic_in_delta():
    snap = _snap([_stratum("LIMA", 355, 645, 96, 96.0), _stratum("PUNO", 860, 140, 100, 99.8)])
    sens = inference.sensitivity(snap)
    pw = [r["p_win_sanchez"] for r in sens]
    assert pw == sorted(pw)  # más deriva pro-Sánchez ⇒ mayor P(Sánchez)


def test_montecarlo_check_agrees_with_closed_form():
    snap = _snap([_stratum("LIMA", 3550, 6450, 960, 96.0), _stratum("PUNO", 8600, 1400, 1000, 99.8)])
    cf = inference.closed_form(snap)["p_win"]["sanchez"]
    mc = inference.montecarlo_check(snap, n_sims=40000)["p_win_sanchez"]
    assert abs(cf - mc) < 0.05  # la simulación valida la forma cerrada


def test_ensemble_reports_all_layers():
    snap = _snap([_stratum("LIMA", 355, 645, 96, 96.0), _stratum("PUNO", 860, 140, 100, 99.8)],
                 ext_s=35, ext_k=65, ext_pct=34.0)
    out = ensemble.evaluate(snap)
    assert {"p_win", "bounds", "sensitivity", "exterior", "decision", "models"} <= out.keys()
    assert len(out["models"]) == 4
