"""Publica el contrato a Vercel Blob (store externo) para data en vivo sin redeploy.

El poller escribe los archivos locales (para dev) y, si `BLOB_READ_WRITE_TOKEN` está en el
entorno, los sube también a Vercel Blob con un pathname estable. El dashboard desplegado
lee esa URL pública con `cache:'no-store'`, así que actualiza en vivo sin reconstruir.

Cache: se fija `x-cache-control-max-age` bajo para que el CDN no sirva data vieja.
"""
from __future__ import annotations

import os

from curl_cffi import requests

from .config import HIERARCHY_PATH, HISTORY_PATH, LATEST_PATH

_API = "https://blob.vercel-storage.com/"
_PREFIX = "gotham/"
_MAX_AGE = 30  # seg — el CDN refresca cada 30s (coincide con el polling del cliente)


def _token() -> str:
    return os.environ.get("BLOB_READ_WRITE_TOKEN", "").strip().strip('"')


def _put(local_path: str, pathname: str, content_type: str, max_age: int = _MAX_AGE) -> str | None:
    token = _token()
    if not token or not os.path.exists(local_path):
        return None
    with open(local_path, "rb") as f:
        data = f.read()
    r = requests.put(
        _API + _PREFIX + pathname, data=data,
        headers={
            "authorization": "Bearer " + token,
            "x-api-version": "7",
            "x-content-type": content_type,
            "x-add-random-suffix": "0",
            "x-allow-overwrite": "1",
            "x-cache-control-max-age": str(max_age),
        },
        impersonate="chrome124", timeout=25,
    )
    return r.json().get("url") if r.status_code == 200 else None


def publish_all() -> tuple[str | None, str | None]:
    """Sube latest.json + history.jsonl. Devuelve (url_latest, url_history) o (None, None)
    si no hay token (modo local sin Blob)."""
    return (
        _put(LATEST_PATH, "latest.json", "application/json"),
        _put(HISTORY_PATH, "history.jsonl", "application/x-ndjson"),
    )


def publish_hierarchy() -> str | None:
    """Sube hierarchy.json a Blob (cache más largo: cambia despacio, es grande)."""
    return _put(HIERARCHY_PATH, "hierarchy.json", "application/json", max_age=60)


def is_enabled() -> bool:
    return bool(_token())
