import { redirect } from "next/navigation";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";
import { SelectorBoxCard } from "./selector-box-card";

export const dynamic = "force-dynamic";

export default async function SeleccionarBoxPage() {
  const contexto = await obtenerContextoOperativoWeb();
  if (!contexto) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-8">
      <header className="space-y-2 border-b border-border pb-6">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground">
          Seleccioná tu Box
        </h1>
        <p className="text-sm text-muted-foreground">
          Hola, {contexto.sesion.nombre}. Elegí en qué Box querés operar en esta
          sesión; podrás cambiar de Box activo desde el encabezado en cualquier
          momento.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {contexto.afiliaciones.map((afiliacion) => (
          <SelectorBoxCard key={afiliacion.id} afiliacion={afiliacion} />
        ))}
      </section>
    </main>
  );
}
