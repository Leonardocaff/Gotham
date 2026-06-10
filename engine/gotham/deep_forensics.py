"""Barrido forense PROFUNDO (nivel mesa) — cadencia lenta, separado del poll de 5 min.

Muestrea ~N mesas (clúster por distrito, PPS, cobertura por departamento), trae el detalle
de cada acta en paralelo, corre la batería de mesa (último dígito, mesas imposibles,
participación, estado) y escribe/publica `forensics_deep.json`. El dashboard lo lee aparte
(como hierarchy.json). El barrido completo (~92.7k) tarda ~25 min; la muestra corre en ~3.

Uso:
    python -m gotham.deep_forensics            # muestra por defecto (~11k mesas)
    python -m gotham.deep_forensics 8000 24    # target_mesas workers
    python -m gotham.deep_forensics full 28    # barrido COMPLETO (~92.7k mesas, ~25 min)
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

from .config import DEEP_FORENSICS_PATH
from .ingest import actas, onpe
from .ingest.client import OnpeClient
from .models import mesa_forensics
from .publish import is_enabled, publish_deep_forensics


def run_deep(target_mesas: int = 11000, workers: int = 24, seed: int = 1,
             full: bool = False, verbose: bool = True) -> dict:
    c = OnpeClient()
    districts = onpe.fetch_districts(c)
    if full:
        if verbose:
            print(f"  distritos: {len(districts)} · BARRIDO COMPLETO (~92.7k mesas)…")
        scan = actas.fetch_all_mesas(districts, workers=workers)
    else:
        if verbose:
            print(f"  distritos: {len(districts)} · muestreando ~{target_mesas} mesas…")
        scan = actas.sample_mesas(districts, target_mesas=target_mesas, seed=seed, workers=workers)
    report = mesa_forensics.analyze(scan)
    payload = {"generatedAt": datetime.now(timezone.utc).isoformat(), **report}

    os.makedirs(os.path.dirname(DEEP_FORENSICS_PATH), exist_ok=True)
    with open(DEEP_FORENSICS_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    if is_enabled():
        u = publish_deep_forensics()
        if verbose and u:
            print(f"  ↑ publicado: {u}")
    if verbose:
        m = report["meta"]
        print(f"  mesas: {m['mesasFetched']} en {m['districtsSampled']} distritos "
              f"({m['departmentsCovered']} deptos) · VEREDICTO {report['overall']['verdict']}")
        for s in report["signals"]:
            print(f"    [{s['verdict']}] {s['label']}: {s.get('detail', '')}")
        imp = report["impossible"]
        print(f"    mesas imposibles: {imp['count']}/{imp['checked']}")
    return payload


if __name__ == "__main__":
    arg1 = sys.argv[1] if len(sys.argv) > 1 else "11000"
    wk = int(sys.argv[2]) if len(sys.argv) > 2 else 28
    if arg1.lower() == "full":
        run_deep(workers=wk, full=True)
    else:
        run_deep(target_mesas=int(arg1), workers=wk)
