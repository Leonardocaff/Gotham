# GOTHAM

Inteligencia electoral en vivo para la **2da vuelta presidencial Perú 2026** (Roberto
Sánchez vs Keiko Fujimori). Ingiere el avance de actas de ONPE y proyecta el resultado
final con un estimador estratificado de población finita — corrigiendo el sesgo de reporte
diferencial que hace engañoso el titular del conteo.

🌐 **Live:** https://gotham-wine.vercel.app

## Data en vivo (Vercel Blob)

El dashboard desplegado lee el contrato desde **Vercel Blob** (`NEXT_PUBLIC_DATA_BASE_URL`),
no de archivos estáticos — así actualiza sin redeploy. El poller publica a Blob cada ciclo
si `BLOB_READ_WRITE_TOKEN` está en el entorno:

```bash
cd engine
export BLOB_READ_WRITE_TOKEN=$(cd ../apps/web && vercel env pull /tmp/g.env --environment=production --yes >/dev/null && grep BLOB /tmp/g.env | cut -d= -f2- | tr -d '"')
python -m gotham.poll 60        # publica a Blob cada 60s → dashboard live
```

Para que quede corriendo siempre: un `launchd`/`systemd`/`cron` que ejecute el poller, o
déjalo en un `tmux`. Sin el token, el poller solo escribe local (modo dev).

> **Proyección estadística, NO resultado oficial.** El conteo ONPE no es la proclamación
> del JNE. Ver `METHODOLOGY.md`.

## Arquitectura

```
engine/      Motor Python: ingestión ONPE (curl_cffi) → snapshot → modelos → contrato JSON
apps/web/    Dashboard Next.js (Palantir/Obsidian) con globe Mapbox clickeable
  public/data/{latest.json, history.jsonl}   ← contrato motor↔UI
docs/ METHODOLOGY.md
```

## Correr

**1. Motor (poller cada 60s):**
```bash
cd engine
pip install -r requirements.txt
python -m gotham.run          # un ciclo
python -m gotham.poll 60      # loop en vivo (escribe apps/web/public/data/)
```

**2. Dashboard:**
```bash
cd apps/web
pnpm install
echo "NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx" > .env.local   # token Mapbox
pnpm dev                       # http://localhost:3000
```

## Modelo (resumen — ver METHODOLOGY.md)

- **273 estratos**: 196 provincias + 77 países del exterior, cada uno proyectado con su
  propio split observado y completitud real. Sin priors direccionales.
- **Voto exterior** como estrato propio (pivotal, pro-Keiko, reporta lento).
- **Actas impugnadas/observadas (JEE)** modeladas aparte del remanente pendiente, con
  anulación direccional + grid de escenarios.
- **Inferencia**: forma cerrada `P(victoria)=Φ(μ/σ)` con varianza de muestreo (a nivel
  acta) + deriva sistémica + pool en disputa; validada por Monte Carlo.
- **Honestidad**: cotas de Manski (lo posible), barrido de sensibilidad (lo asumido), capa
  legal JNE como bandera. Veredicto DECIDIDO / INCLINADO / INDECIDIBLE.

## Tests

```bash
cd engine && python -m pytest tests/ -q
```
