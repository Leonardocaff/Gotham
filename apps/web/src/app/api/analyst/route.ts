// AI analyst — streams a live intelligence briefing or answers a question,
// grounded in the current Gotham model state. Server-side (uses ANTHROPIC_API_KEY).
import Anthropic from "@anthropic-ai/sdk";
import { ANALYST_MODEL, SYSTEM_PROMPT, digest } from "@/lib/analyst";
import type { Latest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  mode: "brief" | "ask";
  question?: string;
  contract: Latest;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("Falta ANTHROPIC_API_KEY en el servidor.", { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response("Cuerpo inválido.", { status: 400 });
  }
  if (!body?.contract?.projection) {
    return new Response("Falta el contrato de datos.", { status: 400 });
  }

  const state = digest(body.contract);
  const userText =
    body.mode === "ask" && body.question?.trim()
      ? `ESTADO ACTUAL DEL MODELO:\n${state}\n\nPREGUNTA DEL ANALISTA: ${body.question.trim()}\n\nResponde en español, conciso (máx ~120 palabras), anclado en estos números. No declares un ganador si el veredicto es INDECIDIBLE.`
      : `ESTADO ACTUAL DEL MODELO:\n${state}\n\nEscribe el BRIEFING DE INTELIGENCIA en vivo: 110–170 palabras, español, directo, sin preámbulo ni viñetas. Explica qué dice realmente la data (no el titular de ONPE), por qué el resultado es lo que es, dónde está la incertidumbre, y qué lo decidiría. Cita los números clave.`;

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: ANALYST_MODEL,
    max_tokens: 1024,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userText }],
  });

  const encoder = new TextEncoder();
  const rs = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch {
        controller.enqueue(encoder.encode("\n\n[El analista no pudo completar la respuesta.]"));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(rs, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
