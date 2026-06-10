"""Constantes de dominio: fuente ONPE, candidatos, clasificación regional y priors.

IMPORTANTE: ONPE numera los departamentos con SU PROPIO orden (alfabético, con Callao
y Ucayali al final) — NO el orden INEI. p.ej. Lima=14, Cusco=7, Callao=24. Por eso el
código→nombre se resuelve en runtime desde `ubigeos/departamentos`, y la clasificación
regional se indexa por NOMBRE normalizado, no por código.

La clasificación regional codifica el conocimiento de 1ra vuelta: sierra sur/centro y
selva son rurales, reportan tarde, con tilt pro-Sánchez; Lima/Callao y costa norte
urbana reportan temprano, tilt pro-Keiko. El modelo NO inventa votos con esto — cada
estrato aporta su propio split observado — sino que orienta el término de *deriva* de
las actas tardías en el Monte Carlo y colorea el panel geográfico.
"""
from __future__ import annotations

import os
import unicodedata

ORIGIN = "https://resultadosegundavuelta.onpe.gob.pe"
BACKEND = ORIGIN + "/presentacion-backend/"

# idEleccion presidencial 2da vuelta (verificado vía proceso-electoral-activo → idEleccionPrincipal=10)
ID_ELECCION = 10

# codigoAgrupacionPolitica de ONPE (verificado en resumen-general/participantes)
COD_KEIKO = 8     # FUERZA POPULAR
COD_SANCHEZ = 10  # JUNTOS POR EL PERÚ

CANDIDATES = {
    "sanchez": {
        "key": "sanchez", "name": "Roberto Sánchez", "party": "Juntos por el Perú",
        "cod": COD_SANCHEZ, "color": "#3DD9A0", "lean": "izquierda",
    },
    "keiko": {
        "key": "keiko", "name": "Keiko Fujimori", "party": "Fuerza Popular",
        "cod": COD_KEIKO, "color": "#4A9EFF", "lean": "derecha",
    },
}


def candidate_key_for(agrupacion: str) -> str | None:
    a = (agrupacion or "").strip().upper()
    if "FUERZA POPULAR" in a:
        return "keiko"
    if "JUNTOS POR" in a:
        return "sanchez"
    return None


def norm_name(s: str) -> str:
    """Normaliza nombre de departamento: sin tildes, upper, sin espacios extra."""
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return " ".join(s.upper().split())


# Clasificación por NOMBRE normalizado → (macro-región, rural?, tilt actas tardías).
# tilt = candidato favorecido por el residual rural/lento del estrato (dirección de la
# deriva en el Monte Carlo; magnitud pequeña).
_REGION_RAW = {
    "AMAZONAS":      ("selva",         True,  "sanchez"),
    "ANCASH":        ("sierra_centro", True,  "sanchez"),
    "APURIMAC":      ("sierra_sur",    True,  "sanchez"),
    "AREQUIPA":      ("costa_sur",     False, "sanchez"),
    "AYACUCHO":      ("sierra_centro", True,  "sanchez"),
    "CAJAMARCA":     ("sierra_norte",  True,  "sanchez"),
    "CUSCO":         ("sierra_sur",    True,  "sanchez"),
    "HUANCAVELICA":  ("sierra_sur",    True,  "sanchez"),
    "HUANUCO":       ("sierra_centro", True,  "sanchez"),
    "ICA":           ("costa_centro",  False, "keiko"),
    "JUNIN":         ("sierra_centro", True,  "sanchez"),
    "LA LIBERTAD":   ("costa_norte",   False, "keiko"),
    "LAMBAYEQUE":    ("costa_norte",   False, "keiko"),
    "LIMA":          ("costa_centro",  False, "keiko"),
    "LORETO":        ("selva",         True,  "keiko"),   # selva pero Keiko-leaning este ciclo
    "MADRE DE DIOS": ("selva",         True,  "sanchez"),
    "MOQUEGUA":      ("costa_sur",     False, "sanchez"),
    "PASCO":         ("sierra_centro", True,  "sanchez"),
    "PIURA":         ("costa_norte",   False, "keiko"),
    "PUNO":          ("sierra_sur",    True,  "sanchez"),
    "SAN MARTIN":    ("selva",         True,  "sanchez"),
    "TACNA":         ("costa_sur",     False, "sanchez"),
    "TUMBES":        ("costa_norte",   False, "keiko"),
    "CALLAO":        ("costa_centro",  False, "keiko"),
    "UCAYALI":       ("selva",         True,  "sanchez"),
}


def region_for(name: str) -> tuple[str, bool, str]:
    """(macro-región, rural?, tilt) para un nombre de departamento. Default neutro."""
    return _REGION_RAW.get(norm_name(name), ("desconocida", False, "sanchez"))


# Salida: el motor escribe el contrato aquí (servido estático por Next.js).
_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(_ROOT, "apps", "web", "public", "data")
LATEST_PATH = os.path.join(DATA_DIR, "latest.json")
HISTORY_PATH = os.path.join(DATA_DIR, "history.jsonl")
