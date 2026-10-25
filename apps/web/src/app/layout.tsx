import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Centris — Gestión Multitenant de Boxes",
  description:
    "Sistema de gestión de Boxes con aislamiento PostgreSQL FORCE ROW LEVEL SECURITY."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
