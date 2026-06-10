"""Poller: ejecuta un ciclo cada N segundos. Tolera fallos puntuales de ONPE.

Uso:
    python -m gotham.poll            # cada 60s
    python -m gotham.poll 30         # cada 30s
"""
from __future__ import annotations

import sys
import time

from .ingest.client import OnpeError
from .run import run_once

DEFAULT_INTERVAL = 60


def main() -> int:
    interval = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INTERVAL
    print(f"[gotham] poll cada {interval}s — Ctrl-C para salir")
    while True:
        t0 = time.time()
        try:
            run_once(verbose=True)
        except OnpeError as e:
            print(f"[ONPE] {e} — reintento en {interval}s", file=sys.stderr)
        except Exception as e:  # noqa: BLE001 — el poller no debe morir
            print(f"[err] {e} — reintento en {interval}s", file=sys.stderr)
        elapsed = time.time() - t0
        time.sleep(max(1.0, interval - elapsed))


if __name__ == "__main__":
    raise SystemExit(main())
