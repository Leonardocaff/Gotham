"""Fetchers de alto nivel contra ONPE.

Estrategia de ingestión (verificada en vivo, 9-jun-2026):
  - Nacional (titular): `resumen-general/totales` + `resumen-general/participantes`
    con tipoFiltro="eleccion". GET, devuelve estado de actas y split nacional.
  - Estratos (proyección): `resumen-general/mapa-calor` con tipoFiltro="ubigeo_nivel_01"
    devuelve 196 filas a nivel PROVINCIA por candidato. Dos llamadas (una por candidato)
    se mergean por (ubigeoNivel01, ubigeoNivel02). Cada fila trae votos válidos del
    candidato + % actas contabilizadas de esa provincia → todo lo necesario para
    estratificar en una pasada barata.
  - Meta departamentos: `ubigeos/departamentos` da código→nombre (orden propio de ONPE).
"""
from __future__ import annotations

from typing import Any

from ..config import COD_KEIKO, COD_SANCHEZ, ID_ELECCION
from .client import OnpeClient


def fetch_active_election(c: OnpeClient) -> dict[str, Any]:
    return c.get("proceso/proceso-electoral-activo")


def fetch_national(c: OnpeClient) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    p = {"idEleccion": ID_ELECCION, "tipoFiltro": "eleccion",
         "ubigeoNivel1": "", "ubigeoNivel2": "", "ubigeoNivel3": ""}
    return c.get("resumen-general/totales", **p), c.get("resumen-general/participantes", **p)


def fetch_ambito_status(c: OnpeClient, ambito: int) -> dict[str, Any]:
    """Estado de actas de un ámbito (1=doméstico, 2=exterior): observadas vs pendientes.

    ONPE no expone el desglose observadas/pendientes por provincia (el filtro geográfico
    de `totales` se ignora), pero sí por ámbito. Es la granularidad disponible para
    cuantificar el pool en disputa (annulment-risk) por separado del meramente lento.
    """
    d = c.get(
        "resumen-general/totales",
        idEleccion=ID_ELECCION, tipoFiltro="ambito_geografico", idAmbitoGeografico=ambito,
        ubigeoNivel1="", ubigeoNivel2="", ubigeoNivel3="",
    )
    contab = max(int(d.get("contabilizadas", 0)), 1)
    vpa = d.get("totalVotosValidos", 0) / contab        # votos por acta del ámbito
    return {
        "observadas": int(d.get("enviadasJee", 0)),     # actas en JEE (impugnadas/observadas)
        "pendientes": int(d.get("pendientesJee", 0)),   # actas pendientes (lentas)
        "votos_observados_est": d.get("enviadasJee", 0) * vpa,
        "votos_pendientes_est": d.get("pendientesJee", 0) * vpa,
        "votos_por_acta": vpa,
    }


def fetch_departamentos_meta(c: OnpeClient) -> dict[str, str]:
    """Código ubigeo nivel-01 (int como string, p.ej. '140000') → nombre departamento."""
    data = c.get("ubigeos/departamentos", idEleccion=ID_ELECCION, idAmbitoGeografico=1)
    return {str(d["ubigeo"]): d["nombre"] for d in data}


def _mapa_calor(c: OnpeClient, cod: int, ambito: int = 1) -> list[dict[str, Any]]:
    return c.get(
        "resumen-general/mapa-calor",
        codigoAgrupacionPolitica=cod,
        idAmbitoGeografico=ambito,
        idEleccion=ID_ELECCION,
        ubigeoNivel01="", ubigeoNivel02="", ubigeoNivel03="",
        tipoFiltro="ubigeo_nivel_01",
    )


def fetch_exterior_strata(c: OnpeClient) -> list[dict[str, Any]]:
    """Estratos del exterior (ámbito 2) a granularidad de país/consulado.

    El exterior reporta MUY lento (hoy ~34% de actas) y tira a la derecha (Keiko), así
    que es un pool grande, pendiente y direccional — no puede omitirse. Se ingiere por
    país (no agregado) para estratificar con toda la data disponible.
    """
    sanchez = _mapa_calor(c, COD_SANCHEZ, ambito=2)
    keiko = {(r["ubigeoNivel01"], r["ubigeoNivel02"]): r for r in _mapa_calor(c, COD_KEIKO, ambito=2)}
    out: list[dict[str, Any]] = []
    for r in sanchez:
        kr = keiko.get((r["ubigeoNivel01"], r["ubigeoNivel02"]))
        if kr is None:
            continue
        out.append({
            "dep_code": "EXT" + str(r["ubigeoNivel01"]),
            "prov_code": r["ubigeoNivel02"],
            "votos_sanchez": r["participante"]["totalVotosValidos"],
            "votos_keiko": kr["participante"]["totalVotosValidos"],
            "actas": r["actasContabilizadas"],
            "pct_actas": r["porcentajeActasContabilizadas"],
        })
    return out


def fetch_provincias(c: OnpeClient) -> list[dict[str, Any]]:
    """Lista de estratos-provincia con votos de ambos candidatos y completitud.

    Cada item: {dep_code, prov_code, dep_name?(None, se rellena luego),
                votos_sanchez, votos_keiko, actas, pct_actas}
    """
    sanchez = _mapa_calor(c, COD_SANCHEZ)
    keiko = {(r["ubigeoNivel01"], r["ubigeoNivel02"]): r for r in _mapa_calor(c, COD_KEIKO)}
    out: list[dict[str, Any]] = []
    for r in sanchez:
        key = (r["ubigeoNivel01"], r["ubigeoNivel02"])
        kr = keiko.get(key)
        if kr is None:
            continue
        out.append({
            "dep_code": str(r["ubigeoNivel01"]).zfill(6),
            "prov_code": r["ubigeoNivel02"],
            "votos_sanchez": r["participante"]["totalVotosValidos"],
            "votos_keiko": kr["participante"]["totalVotosValidos"],
            "actas": r["actasContabilizadas"],
            "pct_actas": r["porcentajeActasContabilizadas"],
        })
    return out
