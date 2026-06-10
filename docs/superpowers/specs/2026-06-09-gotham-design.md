# GOTHAM — Diseño (spec)
**Fecha**: 2026-06-09 · **Estado**: aprobado, en ejecución
**Autor**: Leonardo + Claude · **Contexto**: 2da vuelta presidencial Perú 2026 (votada 7-jun-2026, escrutinio en curso)

---

## 1. Propósito

Dashboard de inteligencia electoral en vivo que ingiere el avance de actas de ONPE
para la 2da vuelta y corre un **ensemble de modelos estadísticos** que responde una
pregunta con incertidumbre cuantificada: **¿quién gana, y ya está decidido?**

El valor no es repetir el % de ONPE (lo hacen los medios). Es **corregir el sesgo de
reporte diferencial** — actas urbanas reportan temprano y favorecen a Keiko; actas
rurales/exterior reportan tarde y favorecen a Sánchez (patrón Castillo–Keiko 2021) — y
traducir el ~4% de actas faltantes + las actas en JEE/pendientes (≈3.6%) en una
**P(victoria)** calibrada.

## 2. Situación al diseñar (live, verificada contra ONPE)

- Candidatos: **Roberto Sánchez** (Juntos por el Perú) vs **Keiko Fujimori** (Fuerza Popular).
- Conteo: **96.392% actas** · 1.664% en JEE · 1.944% pendientes JEE.
- Marcador: **Sánchez 50.117% (8,949,171)** vs **Keiko 49.883% (8,907,404)** → +41,767 votos, 0.234pp.
- Proclamación oficial JNE: ~mediados de julio 2026 (impugnaciones probables por el margen).

## 3. Fuente de datos (verificada end-to-end)

Backend JSON de ONPE bajo `https://resultadosegundavuelta.onpe.gob.pe/presentacion-backend/`.
SPA Angular con **fingerprinting anti-bot** → ingestión vía Python **`curl_cffi`** con
`impersonate="chrome124"`. Endpoints **GET** (sin auth, sin XSRF):

| Endpoint | Devuelve |
|---|---|
| `proceso/proceso-electoral-activo` | `idEleccion` activo (=10) |
| `resumen-general/totales?idEleccion=10&tipoFiltro=eleccion` | estado actas (contabilizadas/JEE/pendientes), votos válidos/emitidos, participación |
| `resumen-general/participantes?idEleccion=10&tipoFiltro=<f>&ubigeoNivel1=<dd>` | votos y % por candidato (nacional o por ubigeo) |
| `ubigeos/dep-prov-distritos?idEleccion=10` | jerarquía geográfica (~2,102 ubigeos) |
| `resumen-general/mapa-calor` · `actas/buscar/mesa` | choropleth · acta por mesa |

`tipoFiltro`: `eleccion` (nacional), `ubigeo_nivel_01/02/03` (depto/prov/distrito).
Ámbito exterior vía prefijos 91–95. Riesgo: endpoints internos no documentados, ONPE
puede cambiarlos. Mitigación: cruce con `github.com/oscarzamora/onpe-scraper-2026-2`.

## 4. Arquitectura

```
Gotham/
├── engine/  (Python 3.10+, numpy/scipy/curl_cffi)
│   ├── gotham/ingest/   client.py (curl_cffi+retries) · onpe.py (fetch nacional+por depto)
│   ├── gotham/snapshot.py   raw ONPE → Snapshot canónico (nacional + estratos + estado actas)
│   ├── gotham/models/   stratified · montecarlo · skeptics · ensemble
│   ├── gotham/store.py  escribe latest.json + appendea history.jsonl
│   ├── gotham/run.py    un ciclo: ingest→snapshot→modelos→write
│   ├── gotham/poll.py   loop cada N seg
│   └── tests/test_models.py
└── apps/web/  (Next.js 14, estética Obsidian/Gotham)
    public/data/{latest.json, history.jsonl}  ← el contrato motor↔UI
```

**Flujo**: poller cada 30–60s → curl_cffi fetch nacional + 25 deptos + exterior →
Snapshot canónico → modelos → ensemble → escribe `latest.json` + appendea `history.jsonl`
→ Next.js (cliente) hace polling del JSON y renderiza.

## 5. El "team de matemáticos" — ensemble

| # | Modelo | Escuela | Aporte |
|---|--------|---------|--------|
| 1 | **Estratificado** (MRP-style) | Gauss | proyecta cada estrato con su propio split, ponderado por tamaño real → corrige sesgo urbano |
| 2 | **Monte Carlo** | Ulam | envuelve incertidumbre: shares por estrato (Dirichlet, conc ∝ actas contadas), resolución JEE (Beta), deriva rural, exterior. 200k sims → distribución del margen |
| 3 | **Escépticos** | Taleb–Tukey | pool en disputa (JEE+pendientes 3.6%) con varianza ancha + tilt rural + cola de anulación masiva |
| ↳ | **Ensemble** | — | combina → P(victoria), IC90, **banda de decisión** (DECIDIDO / INCLINADO / INDECIDIBLE) |

v1.1: jerárquico bayesiano explícito + regresión de deriva intra-estrato.
**Calibración**: backtest sobre snapshots de 1ra vuelta — ¿la proyección bracketeó el real?

## 6. Contrato JSON (motor → UI)

`latest.json`: `{ generatedAt, source, count, candidates[], currentMargin, projection{pWin,
finalPct,finalMargin,decision}, models[], strata[], caveat }`.
`history.jsonl`: una línea por snapshot `{ts, actasPct, sanchezPct, keikoPct, marginVotes,
pWinSanchez, projMarginMedian}`.

## 7. Alcance v1

1. Ingestión real (curl_cffi) nacional + 25 deptos + exterior.
2. Snapshot canónico + historial (serie temporal).
3. Ensemble: estratificado + Monte Carlo + escépticos + banda de decisión.
4. Dashboard: gauge P(victoria), serie del margen, progreso de actas, choropleth, panel
   ensemble, banner ONPE-vs-JNE.
5. Backtest 1ra vuelta (calibración).

## 8. Caveat de producto

Gotham muestra **proyección estadística, no resultado oficial**. El conteo ONPE ≠
proclamación JNE (semanas después). Las actas en JEE/pendientes pueden anularse o
reasignarse. En un margen de 0.23pp, todo dentro de ~0.5pp con <97% contado es
genuinamente indecidible.
