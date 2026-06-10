// Spanish-locale formatting helpers. Pure functions, no state.

const nf = new Intl.NumberFormat("es-PE");

export function int(n: number): string {
  return nf.format(Math.round(n));
}

/** Signed integer with explicit + / − sign. */
export function signedInt(n: number): string {
  const s = int(Math.abs(n));
  return n > 0 ? `+${s}` : n < 0 ? `−${s}` : "0";
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

/** Signed percentage point with sign and "pp" unit. */
export function signedPp(n: number, digits = 2): string {
  const v = Math.abs(n).toFixed(digits);
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${v}pp`;
}

/** ONPE fechaActualizacion is a unix ms timestamp. */
export function timeFromEpoch(ms: number): string {
  return new Date(ms).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function timeFromIso(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
