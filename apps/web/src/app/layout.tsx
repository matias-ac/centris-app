import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap"
});

const oswald = Oswald({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  variable: "--font-oswald",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Centris — Gestión Multitenant de Boxes",
  description:
    "Plataforma de gestión para boxes y centros de entrenamiento funcional con aislamiento PostgreSQL RLS."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${oswald.variable} dark`}>
      <body className="bg-background text-foreground font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
