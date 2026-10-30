import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cerrarSesionAction } from "@/lib/actions";
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
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground">
            Seleccioná tu Box
          </h1>
          <p className="text-sm text-muted-foreground">
            Hola, {contexto.sesion.nombre}. Elegí en qué Box querés operar en
            esta sesión; podrás cambiar de Box activo desde el encabezado en
            cualquier momento.
          </p>
        </div>
        <form action={cerrarSesionAction}>
          <Button type="submit" variant="secondary">
            Cerrar sesión
          </Button>
        </form>
      </header>

      {contexto.afiliaciones.length === 0 ? (
        <section
          data-testid="sin-afiliaciones-box"
          className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground"
        >
          No encontramos Afiliaciones activas asociadas a tu cuenta en este
          momento. Si creés que se trata de un error, cerrá sesión y volvé a
          ingresar o contactá a la administración de tu Box.
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {contexto.afiliaciones.map((afiliacion) => (
            <SelectorBoxCard key={afiliacion.id} afiliacion={afiliacion} />
          ))}
        </section>
      )}
    </main>
  );
}
