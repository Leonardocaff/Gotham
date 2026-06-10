"""Forense PROFUNDO a nivel mesa — la versión de alta potencia.

A diferencia del tamiz distrital (sumas de ~48 actas, que uniforman los dígitos), aquí los
tests corren sobre conteos CRUDOS por mesa, y el padrón por mesa (electores hábiles)
habilita análisis de participación y detección de mesas imposibles.

DECISIÓN METODOLÓGICA (defendible ante panel estricto): a nivel mesa NO usamos Benford. Los
votos de un candidato por mesa están ACOTADOS (~0–300, sin abarcar órdenes de magnitud), lo
que viola el supuesto de Benford y produce falsos positivos masivos — es el motivo por el que
la literatura desaconseja Benford en conteos por mesa (Deckert, Myagkov & Ordeshook 2011;
Mebane). Benford se reserva al nivel DISTRITO, donde los totales abarcan 10²–10⁵. A nivel
mesa el test válido es el de ÚLTIMO DÍGITO (Beber & Scacco 2012), que no requiere rango de
magnitudes. Además, con N grande el p-valor rechaza ante desviaciones triviales (problema de
N grande), así que el veredicto se ancla en el TAMAÑO DE EFECTO (MAD), no solo en p.

Señales:
  1. Último dígito uniforme (Beber & Scacco 2012) — votos de cada candidato y combinados.
  2. Mesas imposibles — votos/asistentes > padrón, válidos > emitidos: integridad sin
     interpretación (un cero esperado en un conteo limpio).
  3. Participación — distribución, correlación participación↔ventaja del líder (Klimek),
     outliers. DESCRIPTIVO y con caveat fuerte: en zonas rurales homogéneas, alta
     participación + alta ventaja es NORMAL, no fraude.
  4. Estado de actas — censo del estado real (Contabilizada / Observada / …) en la muestra.

NADA aquí prueba fraude: son tamices de alta potencia que señalan dónde auditar.
"""
from __future__ import annotations

from typing import Any

import numpy as np

from .forensics import _UNIFORM_10, _digit_signal, _last_digit

# El último dígito tiene plena potencia sobre conteos crudos; con miles de mesas el p-valor
# rechaza ante ruido, así que exigimos un efecto material (MAD ~2× el ruido muestral).
_LAST_DIGIT_MAD = 0.008


def _digit_battery(s_votes: list[int], k_votes: list[int]) -> list[dict[str, Any]]:
    base_caveat = (
        "Test de Beber-Scacco (2012): bajo conteo honesto el último dígito de un conteo ≥25 es "
        "~Uniforme(0–9), sin importar la magnitud. Veredicto anclado en el tamaño de efecto "
        "(MAD), no solo en p, por el problema de N grande. NO usamos Benford a nivel mesa: los "
        "conteos acotados violan su supuesto y dan falsos positivos. Un rechazo indica dónde "
        "auditar, no prueba fraude.")
    return [
        _digit_signal("mesa_last_pooled", "Último dígito (ambos candidatos)",
                      s_votes + k_votes, _last_digit, _UNIFORM_10,
                      min_value=25, mad_marginal=_LAST_DIGIT_MAD, caveat=base_caveat),
        _digit_signal("mesa_last_sanchez", "Último dígito (Sánchez)", s_votes, _last_digit,
                      _UNIFORM_10, min_value=25, mad_marginal=_LAST_DIGIT_MAD, caveat=base_caveat),
        _digit_signal("mesa_last_keiko", "Último dígito (Keiko)", k_votes, _last_digit,
                      _UNIFORM_10, min_value=25, mad_marginal=_LAST_DIGIT_MAD, caveat=base_caveat),
    ]


def _impossible(mesas: list[dict[str, Any]]) -> dict[str, Any]:
    """Mesas con aritmética imposible — red flag de integridad sin interpretación."""
    flags: list[dict[str, Any]] = []
    checked = 0
    for m in mesas:
        el, em, va = m.get("electores"), m.get("emitidos"), m.get("validos")
        asi = m.get("asistentes")
        vs, vk = m.get("votos_sanchez", 0), m.get("votos_keiko", 0)
        if el is None:
            continue
        checked += 1
        reasons = []
        if va is not None and el > 0 and va > el:
            reasons.append("válidos > electores")
        if asi is not None and el > 0 and asi > el:
            reasons.append("asistentes > electores")
        if em is not None and va is not None and va > em:
            reasons.append("válidos > emitidos")
        if em is not None and va is not None and (vs + vk) > va + 2:  # +2 holgura por blancos/nulos redondeo
            reasons.append("votos candidatos > válidos")
        if reasons:
            flags.append({"codigoMesa": m.get("codigoMesa"), "dep": m.get("dep"),
                          "electores": el, "emitidos": em, "validos": va,
                          "reasons": reasons})
    return {
        "checked": checked,
        "count": len(flags),
        "rate": round(len(flags) / checked, 5) if checked else 0.0,
        "examples": flags[:8],
    }


def _participation(mesas: list[dict[str, Any]]) -> dict[str, Any]:
    """Distribución de participación + correlación participación↔ventaja del líder."""
    turn: list[float] = []
    paired_turn: list[float] = []
    paired_share: list[float] = []
    for m in mesas:
        el, va = m.get("electores"), m.get("validos")
        vs, vk = m.get("votos_sanchez", 0), m.get("votos_keiko", 0)
        p = m.get("participacion")
        if p is None and el and m.get("asistentes") is not None:
            p = 100.0 * m["asistentes"] / el
        if p is None or not (0 <= p <= 200):
            continue
        turn.append(p)
        if va and va > 0:                       # par (participación, ventaja del líder)
            paired_turn.append(p)
            paired_share.append(100.0 * max(vs, vk) / va)
    if not turn:
        return {"n": 0}
    t = np.asarray(turn)
    # histograma para la UI (bins de 2.5pp, 0–100)
    edges = np.arange(0, 102.5, 2.5)
    hist, _ = np.histogram(np.clip(t, 0, 100), bins=edges)
    # correlación participación↔ventaja del líder (Klimek) sobre pares válidos
    corr = None
    if len(paired_turn) > 30:
        corr = float(np.corrcoef(np.asarray(paired_turn), np.asarray(paired_share))[0, 1])
    over95 = int((t >= 95).sum())
    over100 = int((t > 100).sum())
    return {
        "n": len(turn),
        "mean": round(float(t.mean()), 2),
        "median": round(float(np.median(t)), 2),
        "pctOver95": round(100 * over95 / len(turn), 2),
        "countOver100": over100,
        "turnoutShareCorr": round(corr, 3) if corr is not None else None,
        "histogram": {"binWidth": 2.5, "counts": [int(x) for x in hist]},
    }


def _estado_ledger(mesas: list[dict[str, Any]]) -> list[dict[str, Any]]:
    tally: dict[str, int] = {}
    for m in mesas:
        e = m.get("estado") or "—"
        tally[e] = tally.get(e, 0) + 1
    total = sum(tally.values()) or 1
    return sorted(
        ({"estado": k, "count": v, "pct": round(100 * v / total, 2)} for k, v in tally.items()),
        key=lambda x: -x["count"],
    )


def analyze(scan: dict[str, Any]) -> dict[str, Any]:
    """`scan` = salida de actas.sample_mesas → reporte forense profundo."""
    mesas = scan["mesas"]
    s_votes = [int(m["votos_sanchez"]) for m in mesas]
    k_votes = [int(m["votos_keiko"]) for m in mesas]

    signals = _digit_battery(s_votes, k_votes)
    impossible = _impossible(mesas)
    participation = _participation(mesas)
    estados = _estado_ledger(mesas)

    flagged = [s for s in signals if s["verdict"] == "ATENCION"]
    integrity_breach = impossible["count"] > 0
    if not flagged and not integrity_breach:
        verdict = "SIN INDICIOS"
        summary = (f"Revisamos {len(mesas):,} mesas con sus conteos crudos. El último dígito sale "
                   "limpio y ninguna mesa tiene números imposibles. En esta muestra no aparece "
                   "rastro de manipulación.")
    elif integrity_breach and not flagged:
        verdict = "REVISAR"
        summary = (f"Encontramos {impossible['count']} mesa(s) con números que no cuadran (más "
                   "votos o asistentes que electores). Casi siempre son errores de tipeo, pero "
                   "conviene cotejar el acta física. Las pruebas de dígitos salen limpias.")
    else:
        names = ", ".join(s["label"] for s in flagged)
        verdict = "REVISAR"
        summary = (f"Hay una señal de dígitos que vale revisar: {names}"
                   + (f", más {impossible['count']} mesa(s) con números que no cuadran." if integrity_breach else ".")
                   + " Que falle no prueba fraude; solo dice qué acta física conviene auditar.")

    return {
        "level": "mesa",
        "meta": scan["meta"],
        "signals": signals,
        "impossible": impossible,
        "participation": participation,
        "estados": estados,
        "overall": {"verdict": verdict, "summary": summary},
        "disclaimer": ("Es un análisis mesa por mesa sobre una muestra. Tiene mucha potencia, "
                       "pero sigue siendo un tamiz: ninguna señal acusa fraude sola. Quien valida "
                       "las actas es el JNE."),
    }
