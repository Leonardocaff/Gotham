import { ImageResponse } from "next/og";
import type { Latest } from "@/lib/types";

// Vista previa para redes (Open Graph / Twitter). Refleja la proyección EN VIVO:
// se regenera por request leyendo el mismo contrato que el dashboard.
export const runtime = "edge";
export const dynamic = "force-dynamic";
export const alt = "GOTHAM — Proyección 2da vuelta Perú 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CANVAS = "#0A0A0C";
const EMERALD = "#3DD9A0";
const CYAN = "#4A9EFF";
const GOLD = "#FFB43C";
const INK1 = "#F5F5F7";
const INK3 = "#909092";

const nf = new Intl.NumberFormat("es-PE");

async function loadLatest(): Promise<Latest | null> {
  const base = (process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) return null;
  try {
    const res = await fetch(`${base}/latest.json`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Latest;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const d = await loadLatest();

  // Defaults so the card always renders even before data is wired.
  const p = d?.projection;
  const sPct = d ? d.candidates[0].pctValidos : 50;
  const kPct = d ? d.candidates[1].pctValidos : 50;
  const leader = p?.leader ?? "keiko";
  const leaderName = leader === "sanchez" ? "Sánchez" : "Keiko";
  const leaderColor = leader === "sanchez" ? EMERALD : CYAN;
  const pWin = p ? Math.round(p.p_win[leader] * 100) : 50;
  const decision = p?.decision ?? "—";
  const actas = d ? d.count.actasContabilizadasPct.toFixed(1) : "—";
  const marginVotes = p ? Math.abs(p.final_margin.median_votes) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: CANVAS,
          padding: "56px 64px",
          fontFamily: "sans-serif",
          color: INK1,
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: 2, color: INK1 }}>GOTHAM</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 12, background: "#FF7A8A" }} />
              <div style={{ fontSize: 18, color: INK1, letterSpacing: 2 }}>EN VIVO</div>
            </div>
          </div>
          <div style={{ fontSize: 20, color: INK3, letterSpacing: 1 }}>{`${actas}% actas`}</div>
        </div>

        <div style={{ display: "flex", fontSize: 24, color: INK3, marginTop: 8, letterSpacing: 1 }}>
          Proyección · 2da vuelta presidencial · Perú 2026
        </div>

        {/* candidates */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 48 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 16, height: 16, borderRadius: 16, background: EMERALD }} />
              <div style={{ fontSize: 26, color: INK1 }}>Roberto Sánchez</div>
            </div>
            <div style={{ fontSize: 92, fontWeight: 700, color: EMERALD, lineHeight: 1 }}>
              {`${sPct.toFixed(1)}%`}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 26, color: INK1 }}>Keiko Fujimori</div>
              <div style={{ width: 16, height: 16, borderRadius: 16, background: CYAN }} />
            </div>
            <div style={{ fontSize: 92, fontWeight: 700, color: CYAN, lineHeight: 1 }}>
              {`${kPct.toFixed(1)}%`}
            </div>
          </div>
        </div>

        {/* split bar */}
        <div style={{ display: "flex", width: "100%", height: 18, borderRadius: 10, overflow: "hidden", marginTop: 32, background: "#1a1a20" }}>
          <div style={{ width: `${sPct}%`, background: EMERALD }} />
          <div style={{ width: `${kPct}%`, background: CYAN }} />
        </div>

        {/* footer: verdict + P + margin */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 44 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 2,
                color: GOLD,
                border: `2px solid ${GOLD}88`,
                borderRadius: 10,
                padding: "8px 18px",
              }}
            >
              {decision}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: INK1 }}>
              P(victoria) {leaderName}{" "}
              <span style={{ color: leaderColor, fontWeight: 700, marginLeft: 8 }}>{`${pWin}%`}</span>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: INK3 }}>
            margen ~{nf.format(marginVotes)} votos
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 28, fontSize: 18, color: INK3 }}>
          Proyección estadística — no es resultado oficial del JNE · sirius.kiranir.com
        </div>
      </div>
    ),
    size,
  );
}
