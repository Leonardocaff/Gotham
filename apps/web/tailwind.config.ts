import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0A0A0C",
        surface: {
          1: "rgba(18,18,22,0.75)",
          2: "rgba(26,26,32,0.65)",
          3: "rgba(36,36,44,0.55)",
        },
        edge: {
          DEFAULT: "rgba(255,255,255,0.06)",
          strong: "rgba(255,255,255,0.10)",
        },
        ink: {
          1: "#F5F5F7",
          2: "#B8B8BA",
          3: "#909092",
        },
        accent: {
          cyan: "#4A9EFF",
          emerald: "#3DD9A0",
          gold: "#FFB43C",
          rose: "#FF7A8A",
          purple: "#9B7AFF",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
        display: ["var(--font-grotesk)", "var(--font-inter)", "sans-serif"],
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.35", transform: "scale(0.8)" },
        },
        flash: {
          "0%": { backgroundColor: "rgba(74,158,255,0.18)" },
          "100%": { backgroundColor: "transparent" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        sheen: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(220%)" },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
        flash: "flash 1.1s ease-out",
        fadeUp: "fadeUp 0.5s ease-out both",
        sheen: "sheen 2.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
