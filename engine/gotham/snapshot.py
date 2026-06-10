"""Snapshot canónico: normaliza los datos crudos de ONPE a una estructura estable.

Un Snapshot es la entrada de TODOS los modelos. Aísla el resto del motor de la forma
(y rarezas) del backend de ONPE. Inmutable por convención.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .config import CANDIDATES, region_for
from .ingest.client import OnpeClient
from .ingest.onpe import (
    fetch_ambito_status,
    fetch_departamentos_meta,
    fetch_exterior_strata,
    fetch_national,
    fetch_provincias,
)


@dataclass(frozen=True)
class Stratum:
    """Unidad de estratificación: una provincia (ámbito 1) o un país (ámbito 2)."""
    dep_code: str
    dep_name: str
    prov_code: int
    region: str
    rural: bool
    tilt: str
    votos_sanchez: int
    votos_keiko: int
    actas: int          # actas contabilizadas = TAMAÑO MUESTRAL EFECTIVO (la unidad
                        # de correlación es la mesa/acta, no el voto)
    pct_actas: float    # % actas contabilizadas en el estrato
    ambito: int = 1     # 1 = nacional (doméstico), 2 = exterior

    @property
    def counted(self) -> int:
        return self.votos_sanchez + self.votos_keiko

    @property
    def split_sanchez(self) -> float:
        c = self.counted
        return self.votos_sanchez / c if c else 0.5

    @property
    def actas_total_est(self) -> float:
        """Actas totales del estrato, estimadas desde su completitud."""
        return self.actas / (self.pct_actas / 100.0) if self.pct_actas > 0 else self.actas

    @property
    def actas_restantes_est(self) -> float:
        return max(0.0, self.actas_total_est - self.actas)

    @property
    def remaining_votes_est(self) -> float:
        """Votos válidos estimados aún por contar en la provincia, asumiendo
        votos/acta uniforme: counted * (100 - pct)/pct."""
        p = self.pct_actas
        if p <= 0 or p >= 100:
            return 0.0
        return self.counted * (100.0 - p) / p


@dataclass(frozen=True)
class Snapshot:
    fecha_actualizacion: int            # epoch ms de ONPE
    actas_contabilizadas_pct: float
    actas_jee_pct: float
    actas_pendientes_pct: float
    contabilizadas: int
    total_actas: int
    participacion_pct: float
    total_votos_validos: int
    total_votos_emitidos: int
    votos_sanchez: int
    votos_keiko: int
    pct_sanchez: float
    pct_keiko: float
    strata: list[Stratum] = field(default_factory=list)
    # estado del exterior (ámbito 2) para reporte explícito
    ext_votos_sanchez: int = 0
    ext_votos_keiko: int = 0
    ext_actas_pct: float = 0.0
    # actas en disputa (observadas/JEE) vs pendientes (lentas), por ámbito — pools en VOTOS
    obs_votes_dom: float = 0.0
    pend_votes_dom: float = 0.0
    obs_votes_ext: float = 0.0
    pend_votes_ext: float = 0.0
    obs_actas_dom: int = 0
    obs_actas_ext: int = 0

    @property
    def contested_votes(self) -> float:
        """Total de votos en actas observadas/impugnadas (annulment-risk)."""
        return self.obs_votes_dom + self.obs_votes_ext

    @property
    def margin_votes(self) -> int:
        return self.votos_sanchez - self.votos_keiko

    @property
    def leader(self) -> str:
        return "sanchez" if self.margin_votes >= 0 else "keiko"

    @property
    def domestic_strata(self) -> list[Stratum]:
        return [s for s in self.strata if s.ambito == 1]

    @property
    def exterior_strata(self) -> list[Stratum]:
        return [s for s in self.strata if s.ambito == 2]


def build_snapshot(c: OnpeClient) -> Snapshot:
    totales, participantes = fetch_national(c)
    meta = fetch_departamentos_meta(c)
    provincias = fetch_provincias(c)
    exterior = fetch_exterior_strata(c)
    st_dom = fetch_ambito_status(c, 1)
    st_ext = fetch_ambito_status(c, 2)

    by_key: dict[str, dict[str, Any]] = {}
    for p in participantes:
        from .config import candidate_key_for
        k = candidate_key_for(p.get("nombreAgrupacionPolitica", ""))
        if k:
            by_key[k] = p

    strata: list[Stratum] = []
    for pr in provincias:
        dep_name = meta.get(pr["dep_code"], pr["dep_code"])
        region, rural, tilt = region_for(dep_name)
        strata.append(Stratum(
            dep_code=pr["dep_code"], dep_name=dep_name, prov_code=pr["prov_code"],
            region=region, rural=rural, tilt=tilt,
            votos_sanchez=pr["votos_sanchez"], votos_keiko=pr["votos_keiko"],
            actas=pr["actas"], pct_actas=pr["pct_actas"], ambito=1,
        ))

    ext_s = ext_k = 0
    ext_actas_w = ext_actas_n = 0.0
    for pr in exterior:
        ext_s += pr["votos_sanchez"]
        ext_k += pr["votos_keiko"]
        ext_actas_w += pr["pct_actas"] * pr["actas"]
        ext_actas_n += pr["actas"]
        strata.append(Stratum(
            dep_code=pr["dep_code"], dep_name="EXTERIOR", prov_code=pr["prov_code"],
            region="exterior", rural=False, tilt="keiko",
            votos_sanchez=pr["votos_sanchez"], votos_keiko=pr["votos_keiko"],
            actas=pr["actas"], pct_actas=pr["pct_actas"], ambito=2,
        ))
    ext_pct = ext_actas_w / ext_actas_n if ext_actas_n else 0.0

    return Snapshot(
        fecha_actualizacion=int(totales.get("fechaActualizacion", 0)),
        actas_contabilizadas_pct=float(totales.get("actasContabilizadas", 0.0)),
        actas_jee_pct=float(totales.get("actasEnviadasJee", 0.0)),
        actas_pendientes_pct=float(totales.get("actasPendientesJee", 0.0)),
        contabilizadas=int(totales.get("contabilizadas", 0)),
        total_actas=int(totales.get("totalActas", 0)),
        participacion_pct=float(totales.get("participacionCiudadana", 0.0)),
        total_votos_validos=int(totales.get("totalVotosValidos", 0)),
        total_votos_emitidos=int(totales.get("totalVotosEmitidos", 0)),
        votos_sanchez=int(by_key["sanchez"]["totalVotosValidos"]),
        votos_keiko=int(by_key["keiko"]["totalVotosValidos"]),
        pct_sanchez=float(by_key["sanchez"]["porcentajeVotosValidos"]),
        pct_keiko=float(by_key["keiko"]["porcentajeVotosValidos"]),
        strata=strata,
        ext_votos_sanchez=ext_s,
        ext_votos_keiko=ext_k,
        ext_actas_pct=ext_pct,
        obs_votes_dom=st_dom["votos_observados_est"],
        pend_votes_dom=st_dom["votos_pendientes_est"],
        obs_votes_ext=st_ext["votos_observados_est"],
        pend_votes_ext=st_ext["votos_pendientes_est"],
        obs_actas_dom=st_dom["observadas"],
        obs_actas_ext=st_ext["observadas"],
    )
