"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { AfiliacionConBox } from "@centris/shared";

export function SelectorBoxHeader({
  afiliaciones,
  boxActivoId,
  onSeleccionarBox
}: {
  afiliaciones: AfiliacionConBox[];
  boxActivoId: string;
  onSeleccionarBox: (boxId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevoBoxId = e.target.value;
    startTransition(async () => {
      await onSeleccionarBox(nuevoBoxId);
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
      className="min-h-11 cursor-pointer rounded-full border border-border bg-card px-3.5 text-base font-medium text-foreground transition-colors hover:border-[#3A3C42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      {afiliaciones.map((afiliacion) => (
        <option
          key={afiliacion.boxId}
          value={afiliacion.boxId}
          className="bg-card text-foreground"
        >
          {afiliacion.box.nombre}
        </option>
      ))}
    </select>
  );
}
