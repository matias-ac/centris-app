"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { AfiliacionConBox } from "@centris/shared";
import { seleccionarBoxAction } from "@/lib/actions";

export function SelectorBoxHeader({
  afiliaciones,
  boxActivoId
}: {
  afiliaciones: AfiliacionConBox[];
  boxActivoId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevoBoxId = e.target.value;
    startTransition(async () => {
      await seleccionarBoxAction(nuevoBoxId);
      router.refresh();
    });
  }

  return (
    <select
      aria-label="Cambiar Box activo"
      data-testid="selector-box-header"
      value={boxActivoId}
      onChange={handleChange}
      disabled={isPending}
      className="h-11 rounded-lg border border-border bg-secondary px-3 text-base font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {afiliaciones.map((afiliacion) => (
        <option key={afiliacion.boxId} value={afiliacion.boxId}>
          {afiliacion.box.nombre}
        </option>
      ))}
    </select>
  );
}
