"""Jerarquía geográfica viva: departamento → provincia → distrito.

Construye, desde los ~1,892 distritos de ONPE + sus nombres, una estructura plana de
3 niveles donde cada nodo lleva su data viva (split, completitud, restante estimado,
líder). El frontend la arma en árbol por códigos de padre para el drill profundo.
"""
from __future__ import annotations

from collections import defaultdict

from .config import region_for
from .ingest.client import OnpeClient
from .ingest.onpe import fetch_districts, fetch_ubigeo_names


def _metrics(vs: float, vk: float, wpct: float, actas: float) -> dict:
    counted = vs + vk
    pct_s = 100.0 * vs / counted if counted else 50.0
    pct_actas = (wpct / actas) if actas else 0.0
    rem = counted * (100.0 - pct_actas) / pct_actas if 0 < pct_actas < 100 else 0.0
    return {
        "votos": {"sanchez": round(vs), "keiko": round(vk)},
        "pctSanchez": round(pct_s, 2),
        "leader": "sanchez" if vs >= vk else "keiko",
        "actasPct": round(pct_actas, 2),
        "counted": round(counted),
        "remainingEst": round(rem),
    }


def build(c: OnpeClient) -> dict:
    districts = fetch_districts(c)
    names = fetch_ubigeo_names(c)

    def parts(code: str) -> list[str]:
        raw = names.get(code, "")
        return [p.strip() for p in raw.split("\\")] if raw else []

    prov_agg: dict[str, list] = defaultdict(lambda: [0.0, 0.0, 0.0, 0.0, "", ""])  # vs,vk,wpct,actas,name,dep
    dep_agg: dict[str, list] = defaultdict(lambda: [0.0, 0.0, 0.0, 0.0, ""])       # vs,vk,wpct,actas,name

    dist_nodes = []
    for d in districts:
        vs, vk = d["votos_sanchez"], d["votos_keiko"]
        w = d["pct_actas"] * d["actas"]
        nm = parts(d["dist_code"])
        dep_name = nm[0] if len(nm) > 0 else d["dep_code"]
        prov_name = nm[1] if len(nm) > 1 else d["prov_code"]
        dist_name = nm[2] if len(nm) > 2 else d["dist_code"]

        m = _metrics(vs, vk, w, d["actas"])
        dist_nodes.append({"code": d["dist_code"], "provCode": d["prov_code"],
                           "depCode": d["dep_code"], "name": dist_name, **m})

        pa = prov_agg[d["prov_code"]]
        pa[0] += vs; pa[1] += vk; pa[2] += w; pa[3] += d["actas"]; pa[4] = prov_name; pa[5] = d["dep_code"]
        da = dep_agg[d["dep_code"]]
        da[0] += vs; da[1] += vk; da[2] += w; da[3] += d["actas"]; da[4] = dep_name

    prov_nodes = []
    for code, (vs, vk, w, ac, name, dep) in sorted(prov_agg.items()):
        prov_nodes.append({"code": code, "depCode": dep, "name": name,
                           **_metrics(vs, vk, w, ac)})

    dep_nodes = []
    for code, (vs, vk, w, ac, name) in sorted(dep_agg.items()):
        region, rural, _ = region_for(name)
        dep_nodes.append({"code": code, "name": name, "region": region, "rural": rural,
                          **_metrics(vs, vk, w, ac)})

    return {
        "departments": dep_nodes,
        "provinces": prov_nodes,
        "districts": dist_nodes,
        "counts": {"departments": len(dep_nodes), "provinces": len(prov_nodes),
                   "districts": len(dist_nodes)},
    }
