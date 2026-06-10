"""Ingestión a nivel MESA (acta) — el sustrato del forense profundo.

Endpoint crackeado leyendo el bundle del SPA de ONPE (no documentado):
  GET presentacion-backend/actas?pagina&tamanio&idEleccion&idAmbitoGeografico&idUbigeo
      → lista paginada de actas de un DISTRITO (idUbigeo = ubigeo nivel_03). Metadata
        (id, idMesa, codigoMesa, estadoActa); los votos vienen NULL aquí.
  GET presentacion-backend/actas/{id}
      → acta COMPLETA: totalElectoresHabiles, totalVotosEmitidos, totalVotosValidos,
        totalAsistentes, porcentajeParticipacionCiudadana, estadoActa, y detalle[] con
        adAgrupacionPolitica + adVotos por partido. UNA llamada = una mesa con voto +
        padrón → habilita Benford/último dígito sobre conteos CRUDOS y la huella de
        participación (Klimek/Kobak).

Importante: estos endpoints solo responden a GET (el POST del SPA cae al SPA vía CDN).
~62 mesas/s con 24 hilos; el barrido completo (~92.7k) toma ~25 min, así que el forense
profundo MUESTREA distritos (PPS) para correr en minutos con potencia estadística de sobra.
"""
from __future__ import annotations

import threading
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from curl_cffi import requests

from ..config import COD_KEIKO, COD_SANCHEZ, ID_ELECCION, ORIGIN, BACKEND

_IMPERSONATE = "chrome124"
_tl = threading.local()


def _session() -> requests.Session:
    """Una sesión curl_cffi por hilo (no compartir entre hilos)."""
    s = getattr(_tl, "s", None)
    if s is None:
        s = requests.Session(impersonate=_IMPERSONATE)
        s.headers.update({"Referer": ORIGIN + "/", "Origin": ORIGIN,
                          "Accept": "application/json, text/plain, */*"})
        _tl.s = s
    return s


def _get(path: str, _retries: int = 2, **params: Any) -> Any | None:
    """GET con reintento ligero — sobre ~92.7k mesas, un fallo transitorio no debe
    perder un acta. Devuelve None solo si agota reintentos o la respuesta no es JSON."""
    for attempt in range(_retries + 1):
        try:
            r = _session().get(BACKEND + path, params=params, timeout=30)
            if "json" not in r.headers.get("content-type", ""):
                return None
            body = r.json()
            return body.get("data") if body.get("success") else None
        except Exception:  # noqa: BLE001 — red/timeout; reintentar salvo el último
            if attempt >= _retries:
                return None
    return None


def list_district_actas(ubigeo: int, ambito: int = 1) -> list[dict[str, Any]]:
    """Todas las actas (metadata, incl. `id`) de un distrito; sigue la paginación.

    Todo distrito tiene ≥1 acta, así que una primera página vacía/None es señal de
    throttle del CDN (SPA fallback) — se reintenta con backoff antes de rendirse, para
    que el barrido completo no pierda distritos enteros bajo carga."""
    out: list[dict[str, Any]] = []
    page = 1
    first_empty_tries = 0
    while True:
        d = _get("actas", pagina=page, tamanio=500, idEleccion=ID_ELECCION,
                 idAmbitoGeografico=ambito, idUbigeo=ubigeo)
        if not d or not d.get("content"):
            if page == 1 and first_empty_tries < 4:   # probable throttle: reintentar
                first_empty_tries += 1
                time.sleep(0.5 * first_empty_tries)
                continue
            break
        out.extend(d["content"])
        if page >= int(d.get("totalPaginas", 1)):
            break
        page += 1
    return out


def fetch_acta(acta_id: int) -> dict[str, Any] | None:
    """Acta completa por id → mesa normalizada (votos por candidato + padrón)."""
    d = _get(f"actas/{acta_id}")
    if not d:
        return None
    # El detalle de actas/{id} usa campos n-prefijo (nagrupacionPolitica / nvotos);
    # buscar/mesa usa ad-prefijo. Soportamos ambos por robustez.
    votos = {COD_SANCHEZ: 0, COD_KEIKO: 0}
    for row in d.get("detalle") or []:
        cod = row.get("nagrupacionPolitica", row.get("adAgrupacionPolitica"))
        if cod in votos:
            votos[cod] = int(row.get("nvotos", row.get("adVotos")) or 0)
    return {
        "codigoMesa": d.get("codigoMesa"),
        "dep": d.get("ubigeoNivel01"),
        "prov": d.get("ubigeoNivel02"),
        "dist": d.get("ubigeoNivel03"),
        "electores": _intornone(d.get("totalElectoresHabiles")),
        "emitidos": _intornone(d.get("totalVotosEmitidos")),
        "validos": _intornone(d.get("totalVotosValidos")),
        "asistentes": _intornone(d.get("totalAsistentes")),
        "participacion": _floatornone(d.get("porcentajeParticipacionCiudadana")),
        "estado": d.get("descripcionEstadoActa"),
        "votos_sanchez": votos[COD_SANCHEZ],
        "votos_keiko": votos[COD_KEIKO],
    }


def _intornone(x: Any) -> int | None:
    try:
        return int(x) if x is not None else None
    except (TypeError, ValueError):
        return None


def _floatornone(x: Any) -> float | None:
    try:
        return float(x) if x is not None else None
    except (TypeError, ValueError):
        return None


def _pps_sample_districts(districts: list[dict[str, Any]], target_mesas: int,
                          seed: int) -> list[dict[str, Any]]:
    """Muestra distritos proporcional al tamaño (PPS), con al menos un distrito por
    departamento para cobertura geográfica. Determinista dado `seed` (sin Date/random
    globales: barajado por hash estable). Devuelve los distritos elegidos."""
    # barajado determinista: ordena por hash(seed, dep, dist)
    def keyf(d: dict) -> int:
        return hash((seed, d["dep_code"], d.get("dist_code", "")))
    by_dep: dict[str, list[dict]] = {}
    for d in districts:
        by_dep.setdefault(d["dep_code"], []).append(d)
    chosen: list[dict] = []
    seen: set = set()
    # 1) un distrito por departamento (el más grande) para cobertura
    for dep, ds in by_dep.items():
        big = max(ds, key=lambda x: x.get("actas", 0))
        chosen.append(big)
        seen.add((big["dep_code"], big.get("dist_code")))
    # 2) resto por PPS hasta alcanzar el objetivo de mesas
    pool = sorted((d for d in districts if (d["dep_code"], d.get("dist_code")) not in seen),
                  key=keyf)
    acc = sum(d.get("actas", 0) for d in chosen)
    for d in pool:
        if acc >= target_mesas:
            break
        chosen.append(d)
        acc += d.get("actas", 0)
    return chosen


def _fetch_details(ids: list[int], workers: int) -> list[dict[str, Any]]:
    """Trae el detalle de cada acta en paralelo, con una segunda pasada para los
    ids que fallaron (None) — así el barrido completo no pierde mesas por baches."""
    out: list[dict[str, Any]] = []
    failed: list[int] = []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for i, m in zip(ids, ex.map(fetch_acta, ids)):
            (out if m is not None else failed).append(m if m is not None else i)
    out = [m for m in out if isinstance(m, dict)]
    if failed:                                   # reintento de los caídos
        with ThreadPoolExecutor(max_workers=workers) as ex:
            for m in ex.map(fetch_acta, failed):
                if m is not None:
                    out.append(m)
    return out


def fetch_all_mesas(districts: list[dict[str, Any]], workers: int = 28) -> dict[str, Any]:
    """Barrido COMPLETO: TODAS las mesas del país (~92.7k). Lista cada distrito y trae
    el detalle de cada acta en paralelo. ~25 min. Para cobertura total (no muestral)."""
    ids: list[int] = []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for actas in ex.map(lambda d: list_district_actas(int(d["dist_code"])), districts):
            ids.extend(a["id"] for a in actas if a.get("id") is not None)
    mesas = _fetch_details(ids, workers)
    return {
        "mesas": mesas,
        "meta": {
            "mode": "full",
            "districtsSampled": len(districts),
            "districtsTotal": len({(d["dep_code"], d.get("dist_code")) for d in districts}),
            "departmentsCovered": len({d["dep_code"] for d in districts}),
            "actasListed": len(ids),
            "mesasFetched": len(mesas),
            "seed": 0,
        },
    }


def sample_mesas(districts: list[dict[str, Any]], target_mesas: int = 11000,
                 seed: int = 1, workers: int = 24) -> dict[str, Any]:
    """Muestra ~`target_mesas` mesas (clúster por distrito, PPS) y trae su detalle en
    paralelo. Devuelve {mesas, meta}. `districts` = salida de onpe.fetch_districts."""
    chosen = _pps_sample_districts(districts, target_mesas, seed)
    # listar actas de los distritos elegidos (concurrente)
    ids: list[int] = []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for actas in ex.map(lambda d: list_district_actas(int(d["dist_code"])), chosen):
            ids.extend(a["id"] for a in actas if a.get("id") is not None)
    # traer detalle de cada acta (concurrente)
    mesas: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for m in ex.map(fetch_acta, ids):
            if m is not None:
                mesas.append(m)
    return {
        "mesas": mesas,
        "meta": {
            "districtsSampled": len(chosen),
            "districtsTotal": len({(d["dep_code"], d.get("dist_code")) for d in districts}),
            "departmentsCovered": len({d["dep_code"] for d in chosen}),
            "actasListed": len(ids),
            "mesasFetched": len(mesas),
            "seed": seed,
        },
    }
