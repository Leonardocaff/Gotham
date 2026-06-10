"""Cliente HTTP contra el backend de ONPE.

ONPE sirve un SPA Angular detrás de fingerprinting anti-bot: un `requests`/`fetch`
plano recibe el HTML del SPA, no JSON. El camino probado es `curl_cffi` impersonando
Chrome (`impersonate="chrome124"`). Los endpoints de resultados son GET, sin auth.
"""
from __future__ import annotations

import time
from typing import Any

from curl_cffi import requests

from ..config import BACKEND, ORIGIN

_IMPERSONATE = "chrome124"
_RETRIES = 3
_BACKOFF = (0.5, 1.0, 2.0)


class OnpeError(RuntimeError):
    pass


class OnpeClient:
    """Sesión persistente con backoff exponencial. Reusar entre fetches."""

    def __init__(self) -> None:
        self._s = requests.Session(impersonate=_IMPERSONATE)
        self._s.headers.update(
            {
                "Referer": ORIGIN + "/",
                "Origin": ORIGIN,
                "Accept": "application/json, text/plain, */*",
            }
        )

    def get(self, path: str, **params: Any) -> Any:
        """GET a `<BACKEND><path>` con params; devuelve el campo `data` del envelope.

        El envelope de ONPE es `{"success": bool, "message": str, "data": ...}`.
        Lanza OnpeError si la respuesta no es JSON (cae al fallback SPA) o success=False.
        """
        url = BACKEND + path
        last_exc: Exception | None = None
        for attempt in range(_RETRIES):
            try:
                r = self._s.get(url, params=params, timeout=25)
                ct = r.headers.get("content-type", "")
                if "json" not in ct:
                    # nginx cae al index.html del SPA cuando la ruta/params no matchean
                    raise OnpeError(
                        f"respuesta no-JSON ({len(r.text)}B) para {path} {params} "
                        f"[HTTP {r.status_code} {ct}] — ¿ruta o params inválidos?"
                    )
                body = r.json()
                if not body.get("success", False):
                    raise OnpeError(f"success=False para {path}: {body.get('message')!r}")
                return body.get("data")
            except OnpeError:
                raise  # error de contrato, no de red: no reintentar
            except Exception as e:  # noqa: BLE001 — red/timeout/TLS
                last_exc = e
                if attempt < _RETRIES - 1:
                    time.sleep(_BACKOFF[attempt])
        raise OnpeError(f"fallo de red en {path} tras {_RETRIES} intentos: {last_exc}")
