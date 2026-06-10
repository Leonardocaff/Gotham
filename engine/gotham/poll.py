"""Poller: ejecuta un ciclo cada N segundos. Tolera fallos puntuales de ONPE.

Uso:
    python -m gotham.poll            # cada 60s, infinito (local)
    python -m gotham.poll 30         # cada 30s, infinito
    python -m gotham.poll 60 250     # cada 60s durante ~250s (CI), luego sale

Código de salida (modo acotado): 0 si publicó al menos una vez; 3 si ONPE bloqueó toda
la ventana (IP de datacenter servido el SPA). El workflow usa el 3 para re-disparar la
corrida en un runner con IP nueva.
"""
from __future__ import annotations

import sys
import time

from .ingest.client import OnpeError
from .run import run_once

DEFAULT_INTERVAL = 60


def main() -> int:
    interval = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INTERVAL
    max_seconds = int(sys.argv[2]) if len(sys.argv) > 2 else None
    print(f"[gotham] poll cada {interval}s"
          + (f" durante ~{max_seconds}s" if max_seconds else " — Ctrl-C para salir"))
    start = time.time()
    published = False
    while True:
        t0 = time.time()
        try:
            run_once(verbose=True)
            published = True
        except OnpeError as e:
            print(f"[ONPE] {e} — reintento en {interval}s", file=sys.stderr)
        except Exception as e:  # noqa: BLE001 — el poller no debe morir
            print(f"[err] {e} — reintento en {interval}s", file=sys.stderr)
        if max_seconds is not None and time.time() - start >= max_seconds:
            break
        elapsed = time.time() - t0
        time.sleep(max(1.0, interval - elapsed))
    # Modo acotado (CI): señaliza si quedamos bloqueados toda la ventana.
    if max_seconds is not None and not published:
        print("[gotham] ONPE bloqueó toda la ventana — salida 3 (re-disparar)", file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
