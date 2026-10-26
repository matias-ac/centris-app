import { redirect } from "next/navigation";
import { obtenerContextoOperativoWeb } from "@/lib/contexto-box";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const contexto = await obtenerContextoOperativoWeb();
  if (!contexto) {
    redirect("/login");
  }
  if (contexto.afiliacionActiva) {
    redirect("/inicio");
  }
  redirect("/seleccionar-box");
}
