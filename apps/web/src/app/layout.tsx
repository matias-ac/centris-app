import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="es" className="dark">
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
