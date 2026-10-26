"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ROLES_AFILIACION,
  type AfiliacionConUsuario,
  type RolAfiliacion
} from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  bajaAfiliacionAction,
  guardarRolesAfiliacionAction
} from "@/lib/actions";

function FilaAfiliacionBox({
  afiliacion,
  boxId
}: {
  afiliacion: AfiliacionConUsuario;
  boxId: string;
}) {
  const router = useRouter();
  const [rolesSeleccionados, setRolesSeleccionados] = useState<RolAfiliacion[]>(
    afiliacion.roles
  );
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function alternarRol(rol: RolAfiliacion, checked: boolean) {
    setGuardadoOk(false);
    setErrorMsg(null);
    setRolesSeleccionados((prev) =>
      checked
        ? Array.from(new Set([...prev, rol]))
        : prev.filter((r) => r !== rol)
    );
  }

  function handleGuardarRoles() {
    setErrorMsg(null);
    setGuardadoOk(false);
    startTransition(async () => {
      const res = await guardarRolesAfiliacionAction(
        boxId,
        afiliacion.id,
        rolesSeleccionados
      );
      if (!res.ok) {
        setErrorMsg(`${res.errorCode ?? "ERROR"}: ${res.message ?? ""}`);
        return;
      }
      setGuardadoOk(true);
      router.refresh();
    });
  }

  function handleDarDeBaja() {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await bajaAfiliacionAction(boxId, afiliacion.id);
      if (!res.ok) {
        setErrorMsg(`${res.errorCode ?? "ERROR"}: ${res.message ?? ""}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <tr
      data-testid={`fila-afiliacion-${afiliacion.id}`}
      className="border-t border-border hover:bg-muted/40"
    >
      <td className="px-4 py-3 text-sm text-foreground">
        <div className="font-medium">{afiliacion.usuario.nombre}</div>
        <div className="text-xs text-muted-foreground">
          {afiliacion.usuario.email}
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="flex flex-wrap gap-3">
          {ROLES_AFILIACION.map((rol) => (
            <label
              key={rol}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer"
            >
              <input
                type="checkbox"
                data-testid={`checkbox-rol-${rol}-${afiliacion.id}`}
                checked={rolesSeleccionados.includes(rol)}
                onChange={(e) => alternarRol(rol, e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="capitalize">{rol}</span>
            </label>
          ))}
        </div>
        {errorMsg ? (
          <p
            className="mt-1 inline-flex items-center gap-1.5 text-xs text-rose-400"
            role="alert"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </p>
        ) : null}
        {guardadoOk ? (
          <div className="mt-1">
            <Badge
              variant="emerald"
              data-testid={`estado-guardado-${afiliacion.id}`}
            >
              Roles actualizados
            </Badge>
          </div>
        ) : null}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            onClick={handleGuardarRoles}
            disabled={isPending}
          >
            Guardar roles
          </Button>
          <Button
            variant="destructive"
            onClick={handleDarDeBaja}
            disabled={isPending}
          >
            Dar de baja
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function TablaAfiliacionesBox({
  afiliaciones,
  boxId
}: {
  afiliaciones: AfiliacionConUsuario[];
  boxId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Afiliaciones activas en el Box (
          <span className="tabular-nums">{afiliaciones.length}</span>)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-t border-border bg-secondary text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Roles atómicos componibles</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {afiliaciones.map((afiliacion) => (
                <FilaAfiliacionBox
                  key={afiliacion.id}
                  afiliacion={afiliacion}
                  boxId={boxId}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
