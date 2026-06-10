"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import type { Latest } from "@/lib/types";
import { Panel } from "@/components/ui/Panel";
import { int } from "@/lib/format";

const REPO = "https://github.com/Leonardocaff/Gotham";

function Tex({ tex, block }: { tex: string; block?: boolean }) {
  const html = katex.renderToString(tex, { displayMode: !!block, throwOnError: false });
  return (
    <span
      className={block ? "my-1.5 block overflow-x-auto text-ink-1" : "text-ink-1"}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-edge pt-3">
      <h3 className="mb-1 font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-2">
        {title}
      </h3>
      <div className="space-y-1 text-[12.5px] leading-relaxed text-ink-2">{children}</div>
    </div>
  );
}

export function Methodology({ latest }: { latest: Latest }) {
  const [lo, hi] = latest.projection.bounds.margin_votes;
  const M = Math.round((hi - lo) / 2);
  const cur = (hi + lo) / 2;
  const qTie = M > 0 ? 50 - (100 * cur) / (2 * M) : 50;
  const sd = latest.projection.sd_components;

  return (
    <Panel
      title="Metodología"
      hint="Cómo se calcula la proyección, paso a paso"
      aside={
        <a
          href={REPO}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-edge px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-2 transition hover:border-edge-strong hover:text-ink-1"
        >
          ↗ código abierto
        </a>
      }
    >
      <div className="space-y-3">
        <p className="text-[12.5px] leading-relaxed text-ink-2">
          El conteo de ONPE <strong className="text-ink-1">no es una muestra aleatoria</strong>:
          las actas urbanas y rápidas reportan primero, las rurales y del exterior después.
          El estimando es el resultado final sobre <em>todas</em> las actas; lo desconocido es
          el voto de las actas que faltan.
        </p>

        <Section title="Estimador estratificado (población finita)">
          <p>
            En cada estrato <Tex tex="s" /> (196 provincias + 77 países) se proyecta el restante
            con su <strong className="text-ink-1">propio split observado</strong>{" "}
            <Tex tex="p_s" />, ponderado por los votos que aún faltan{" "}
            <Tex tex="m_s" />:
          </p>
          <Tex
            block
            tex={"\\hat V_{\\text{Sánchez}} = \\sum_s\\big[\\,c_s + m_s\\,p_s\\,\\big],\\qquad m_s = c_s\\,\\frac{100-\\pi_s}{\\pi_s}"}
          />
          <p className="text-[11px] text-ink-3">
            <Tex tex="c_s" /> = votos contados, <Tex tex="\pi_s" /> = % de actas del estrato.
            Esto corrige el sesgo de reporte entre estratos automáticamente.
          </p>
        </Section>

        <Section title="Inferencia — forma cerrada">
          <p>
            El margen final es lineal en variables ~gaussianas, así que P(victoria) es cerrada:
          </p>
          <Tex block tex={"P(\\text{victoria}) = \\Phi\\!\\left(\\frac{\\mu}{\\sigma}\\right)"} />
          <p>La varianza separa lo que la data dice de lo que se asume:</p>
          <Tex
            block
            tex={"\\sigma^2 = \\underbrace{\\sum_s \\frac{m_s^2\\,p_s(1-p_s)}{n_s}}_{\\text{muestreo}} + \\underbrace{M^2\\sigma_\\delta^2}_{\\text{deriva}} + \\underbrace{O^2\\sigma_{\\text{skew}}^2}_{\\text{impugnadas}}"}
          />
          <p className="text-[11px] text-ink-3">
            <Tex tex="n_s" /> = actas (unidad de correlación), <Tex tex="M" /> = total restante,{" "}
            <Tex tex="O" /> = votos en actas observadas/JEE. Hoy: muestreo {int(sd.muestreo_votos)},
            deriva {int(sd.deriva_votos)}, impugnadas {int(sd.impugnadas_votos)} (votos sd).
          </p>
        </Section>

        <Section title="Cotas de Manski — lo posible">
          <p>Sin ningún supuesto sobre el restante, el margen final está acotado por:</p>
          <Tex block tex={"\\text{margen} \\in [\\,\\text{actual}-M,\\ \\text{actual}+M\\,]"} />
          <p className="text-[11px] text-ink-3">
            Si el intervalo cruza cero, el resultado está matemáticamente abierto.
          </p>
        </Section>

        <Section title="Umbral de remonte">
          <p>El umbral de empate — cuota del restante para dar vuelta el resultado:</p>
          <Tex
            block
            tex={"q^{*} = \\tfrac{1}{2} - \\frac{\\text{margen actual}}{2M} \\approx " + qTie.toFixed(1) + "\\%"}
          />
        </Section>

        <Section title="Forense — tamiz de anomalías">
          <p>
            Sobre los ~1,892 distritos se corren tres tests de dígitos. Benford (1er y 2º
            dígito) compara la frecuencia observada con la esperada{" "}
            <Tex tex="P(d)=\log_{10}(1+1/d)" />; el último dígito se contrasta contra la
            uniforme. El estadístico es <Tex tex="\chi^2" /> de bondad de ajuste:
          </p>
          <Tex
            block
            tex={"\\chi^2 = \\sum_{d}\\frac{(O_d - E_d)^2}{E_d},\\qquad E_d = N\\,P(d)"}
          />
          <p className="text-[11px] text-ink-3">
            Un rechazo <strong className="text-ink-1">no prueba fraude</strong> — Benford
            produce falsos positivos en datos electorales (Deckert et al. 2011). Es un tamiz
            que señala dónde auditar, complementado por el libro de integridad de actas
            (universo fijo de {int(latest.count.totalActas)} actas).
          </p>
        </Section>

        <Section title="Fuente de datos">
          <p>
            Backend en vivo de ONPE —{" "}
            <a
              href="https://resultadosegundavuelta.onpe.gob.pe"
              target="_blank"
              rel="noreferrer"
              className="text-accent-cyan hover:underline"
            >
              resultadosegundavuelta.onpe.gob.pe
            </a>{" "}
            (idEleccion {latest.source.idEleccion ?? 10}), 273 estratos, refresco continuo.
          </p>
          <p className="text-[11px] text-ink-3">
            Proyección estadística, <strong className="text-ink-1">NO</strong> resultado oficial:
            el conteo ONPE no es la proclamación del JNE. Código y modelo abiertos en{" "}
            <a href={REPO} target="_blank" rel="noreferrer" className="text-accent-cyan hover:underline">
              github.com/Leonardocaff/Gotham
            </a>
            .
          </p>
        </Section>
      </div>
    </Panel>
  );
}
