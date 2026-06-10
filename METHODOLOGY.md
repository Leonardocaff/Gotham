# GOTHAM — Metodología (defendible ante panel estricto)

> Proyección del resultado final de la 2da vuelta presidencial Perú 2026 a partir del
> conteo parcial de ONPE. Objetivo: usar TODA la data disponible, sin priors
> direccionales subjetivos, separando lo que la data dice de lo que se asume de lo que es
> posible.

## 1. El problema estadístico

El conteo de ONPE **no es una muestra aleatoria** del electorado. Es un subconjunto NO
representativo de una población finita de actas, donde la selección (qué actas ya se
contaron) está correlacionada con la geografía y por tanto con la preferencia: las actas
urbanas (Lima, costa) y de transmisión rápida reportan temprano; las rurales (sierra,
selva) y del **exterior** reportan tarde. Por eso `% actual ≠ % final`, y en un margen de
~0.2pp el titular nacional puede apuntar al ganador equivocado.

Estimando: el conteo final sobre **todas** las actas. Lo desconocido: el split de las
actas aún no contadas.

## 2. Datos (todos los disponibles)

Fuente: backend JSON de ONPE (`resultadosegundavuelta.onpe.gob.pe/presentacion-backend`).

- **273 estratos**: 196 provincias (ámbito 1, doméstico) + 77 países/consulados (ámbito 2,
  exterior). Vía `resumen-general/mapa-calor?tipoFiltro=ubigeo_nivel_01`, una llamada por
  candidato y ámbito.
- Por estrato: votos válidos de cada candidato, **actas contabilizadas** (tamaño muestral)
  y **% de completitud**.
- Nacional + por ámbito: estado de actas (contabilizadas / JEE / pendientes), votos
  válidos/emitidos, participación.

El **voto exterior** se trata como estrato propio: reporta lento (hoy ~60% contado, ~226k
votos por contar) y se inclina fuerte a Keiko (~65%). Omitirlo sesga la proyección.

## 3. Estimador (sin priors direccionales)

**Población finita estratificada.** Para cada estrato *s* con `c_s` votos contados, split
observado `p_s = Sánchez/(Sánchez+Keiko)`, completitud `π_s` y actas `n_s`:

- Votos restantes del estrato: `m_s = c_s · (1 − π_s)/π_s` (usa votos/acta del propio
  estrato; las mesas están topadas a ~300 electores ⇒ votos/acta es estable).
- Proyección puntual (supuesto H0 — *dentro del estrato, lo que falta vota como lo
  contado*): `final = Σ_s [contado_s + m_s · p_s]`.

Esto corrige el sesgo de reporte diferencial **entre** estratos automáticamente: el
remanente de Lima se proyecta con el split de Lima, el del exterior con el del exterior.

Se reporta junto al **naíve** (todo el remanente al split nacional) para exhibir el sesgo
del titular.

## 4. Incertidumbre (dos fuentes, ambas explícitas)

El margen final es lineal en variables aproximadamente gaussianas ⇒ **forma cerrada**,
`P(victoria) = Φ(μ/σ)`, sin ruido de simulación. Validado por Monte Carlo (Beta por
estrato + δ), que coincide dentro de <1pp.

1. **Muestreo (data, sin supuestos).** Dentro de cada estrato la share remanente tiene
   varianza finita `p_s(1−p_s)/n_s`, con **n_s = ACTAS** (la mesa es la unidad de
   correlación, no el voto — clave para no subestimar σ). Contribución a la varianza del
   conteo Sánchez: `Σ m_s² · p_s(1−p_s)/n_s`.
2. **Deriva sistémica δ (el único supuesto, explícito).** Las actas que faltan podrían, en
   bloque, votar distinto a las contadas (sesgo de reporte residual dentro de estrato).
   `δ ~ Normal(δ_mean, σ_δ)`, uniforme sobre estratos. Baseline `δ_mean = 0` (sin
   dirección). `σ_δ = 1.5pp`, anclado en el corrimiento de cuenta tardía de 2021.
   Contribución: `(Σ m_s)² · σ_δ²`.

## 4b. Actas impugnadas / observadas (JEE) y anulación

El restante NO es homogéneo. ONPE expone por ámbito cuántas actas están **observadas** (en
el JEE, con error material/firmas/votos que no cuadran → riesgo de anulación) vs solo
**pendientes** (lentas). Hoy ~90% del restante doméstico son observadas (~300k votos en
disputa); el exterior es casi todo pendiente.

- La proyección base cuenta las observadas con el split de su zona.
- **Anulación**: una fracción se anula (votos eliminados) — direccional, perjudica al líder
  local de esas actas. (JNE históricamente anula <3%; los partidos piden nulidad selectiva.)
- **Skew**: sin data per-estrato de las observadas, su dirección es incierta (±3pp).

Tratamiento: (i) la incertidumbre direccional del pool observado entra en la forma cerrada
como término `(O·σ_skew)²` — hoy es la MAYOR fuente de varianza; (ii) se reporta un grid de
escenarios (anulación × skew); (iii) las cotas de Manski se extienden para incluir anulación
total del pool observado. La capa **legal del JNE** (pedidos de nulidad post-conteo) es
adversarial, no estadística: queda como bandera cualitativa fuera del modelo.

## 5. Lo que es posible: cotas de Manski

Sin ningún supuesto sobre el remanente: todo a Sánchez (`margen + M`) o todo a Keiko
(`margen − M`). Si las cotas cruzan cero, el resultado **no está matemáticamente cerrado**.
Es el envelope honesto de lo posible.

## 6. Lo que se asume: barrido de sensibilidad

`P(Sánchez)` como función de la deriva asumida `δ_mean ∈ [−3pp, +3pp]`. Hace visible
cuánta deriva pro-Sánchez (p.ej. el clásico sesgo rural/JEE) haría falta para cambiar el
veredicto. La subjetividad queda como un dial transparente, no como un número escondido.

## 7. Veredicto

`DECIDIDO` solo si `P(líder) ≥ 95%`, robusto a la deriva plausible (±1.5pp) y el IC90 no
cruza cero. `INDECIDIBLE` si el líder cambia dentro de la deriva plausible, si las cotas
cruzan cero, o si el exterior (pool pivotal) está <80% contado con margen <0.5pp — la
lección de 2021/2026-1ra: con poca data pivotal y margen sub-0.5pp el resultado es
genuinamente indecidible.

## 8. Limitaciones conocidas (honestidad ante el panel)

- `σ_δ` está anclado en 2021, no calibrado del historial de ESTE conteo. v1.1: calibrar
  `σ_δ` y la deriva intra-estrato regresando share vs. orden de reporte sobre los snapshots
  de 1ra vuelta (backtest de calibración).
- H0 asume MCAR dentro de estrato; una regresión de deriva por orden de reporte lo
  refinaría.
- Anulación de actas en JEE (que removería votos, mayormente del líder local) se absorbe
  hoy en `σ_δ`; modelarla explícitamente es v1.1.
- Estratificación a nivel provincia/país; bajar a distrito es posible pero de ganancia
  marginal.

## 9. Lectura actual (snapshot vivo, ~96.4% nacional / ~60% exterior)

- **Naíve (titular ONPE)**: Sánchez +42k → Sánchez.
- **Estratificado / forma cerrada**: Keiko, margen ≈ −38k, `P(Sánchez) ≈ 6%`.
- **Cotas Manski**: [−519k, +602k] — cruzan cero (abierto).
- **Sensibilidad**: ni con +2pp de deriva pro-Sánchez supera 26%.
- **Veredicto**: INDECIDIBLE mientras el exterior (pivotal, pro-Keiko) siga completándose,
  pero la data disponible **revierte el titular**: el voto por contar (Lima + exterior) es
  desproporcionadamente pro-Keiko y excede la ventaja actual de Sánchez.
