"""Un ciclo: ingiere ONPE → snapshot → ensemble → escribe contrato.

Uso:
    python -m gotham.run            # un ciclo, imprime resumen
"""
from __future__ import annotations

import sys

from .ingest.client import OnpeClient, OnpeError
from .models import ensemble
from .snapshot import build_snapshot
from .store import append_history, build_contract, write_latest


def run_once(verbose: bool = True) -> dict:
    c = OnpeClient()
    snap = build_snapshot(c)
    result = ensemble.evaluate(snap)
    contract = build_contract(snap, result)
    write_latest(contract)
    append_history(contract)
    if verbose:
        _print_summary(contract)
    return contract


def _print_summary(c: dict) -> None:
    cnt, proj = c["count"], c["projection"]
    s, k = c["candidates"]
    ext = proj["exterior"]
    print(f"\n  ACTAS {cnt['actasContabilizadasPct']:.3f}%  (JEE {cnt['actasEnJeePct']:.2f}% · "
          f"pend {cnt['actasPendientesPct']:.2f}%)   EXTERIOR {ext['actasPct']:.1f}% contado")
    print(f"  AHORA   Sánchez {s['pctValidos']:.3f}%  vs  Keiko {k['pctValidos']:.3f}%  "
          f"(margen {c['currentMargin']['votes']:,} → {c['currentMargin']['leader']})")
    print("  --- métodos ---")
    for m in c["models"]:
        pw = f"  P(S)={m['p_win']['sanchez']:.0%}" if "p_win" in m else ""
        pct = f"{m['final_pct_sanchez']:.3f}%S" if "final_pct_sanchez" in m else "        "
        print(f"    {m['label']:30} {pct}  "
              f"margen {m['final_margin_votes']:+,}{pw}  → {m['leader']}")
    fm = proj["final_margin"]
    print(f"  PROYECC (forma cerrada, δ=0)  Sánchez {proj['final_pct']['sanchez']['median']:.3f}%")
    sc = proj["sd_components"]
    print(f"  MARGEN  {fm['median_votes']:+,} votos  IC90 [{fm['ci90_votes'][0]:,}, {fm['ci90_votes'][1]:,}]"
          f"   (sd: muestreo {sc['muestreo_votos']:,} + deriva {sc['deriva_votos']:,} + impugnadas {sc['impugnadas_votos']:,})")
    con = proj["contested"]
    print(f"  IMPUGNADAS  {con['pools']['observadas_actas']:,} actas observadas ≈ "
          f"{con['pools']['observadas_votos']:,} votos en disputa (JEE)"
          f"{'  ⚠ el líder cambia en el grid anulación×skew' if con['scenarios']['flips_within_grid'] else ''}")
    b = proj["bounds"]
    print(f"  COTAS Manski  [{b['margin_votes'][0]:+,}, {b['margin_votes'][1]:+,}]  "
          f"{'(cruzan 0 → abierto)' if b['straddles_zero'] else '(no cruzan 0)'}")
    print(f"  EXTERIOR  {ext['pctSanchez']:.1f}%S contado · ~{ext['remainingVotesEst']:,} por contar · "
          f"neto Keiko est. {ext['leanKeikoNetEst']:+,}")
    print(f"  P(victoria)  Sánchez {proj['p_win']['sanchez']:.1%}  ·  Keiko {proj['p_win']['keiko']:.1%}")
    print("  SENSIBILIDAD (δ deriva pro-Sánchez en pp → P(S)):")
    print("    " + "  ".join(f"{r['delta_pp']:+.1f}:{r['p_win_sanchez']:.0%}" for r in proj["sensitivity"]
                              if r['delta_pp'] in (-2.0, -1.0, 0.0, 1.0, 2.0)))
    print(f"  VEREDICTO   [{proj['decision']}] {proj['decision_reason']}")


def main() -> int:
    try:
        run_once()
        return 0
    except OnpeError as e:
        print(f"[ONPE] {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
