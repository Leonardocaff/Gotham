import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sirius.kiranir.com"),
  title: "GOTHAM — Inteligencia Electoral · 2da Vuelta Perú 2026",
  description:
    "Proyección estadística en vivo de la segunda vuelta presidencial 2026: Sánchez vs Fujimori. Estimador estratificado, forense electoral y analista IA.",
  openGraph: {
    title: "GOTHAM — Proyección 2da Vuelta Perú 2026",
    description:
      "Proyección estadística en vivo: estimador estratificado, forense electoral (Benford/último dígito) y analista IA.",
    type: "website",
    locale: "es_PE",
    siteName: "GOTHAM",
  },
  twitter: {
    card: "summary_large_image",
    title: "GOTHAM — Proyección 2da Vuelta Perú 2026",
    description: "Proyección estadística en vivo de la 2da vuelta presidencial 2026.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0A0C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrains.variable} ${grotesk.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
