"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ActualizarConfiguracionBoxSchema, type Box } from "@centris/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { guardarConfiguracionBoxAction } from "@/lib/actions";

export function FormularioConfiguracionBox({ box }: { box: Box }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(box.nombre);
  const [timezone, setTimezone] = useState(box.timezone);
  const [moneda, setMoneda] = useState(box.moneda);
  const [anticipacionReservaDias, setAnticipacionReservaDias] = useState(
    String(box.anticipacionReservaDias)
  );
  const [ventanaCancelacionMinutos, setVentanaCancelacionMinutos] = useState(
    String(box.ventanaCancelacionMinutos)
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setGuardadoOk(false);

    const validado = ActualizarConfiguracionBoxSchema.safeParse({
      nombre,
      timezone,
      moneda,
      anticipacionReservaDias,
      ventanaCancelacionMinutos
    });

    if (!validado.success) {
      setErrorMsg(
        validado.error.issues[0]?.message ??
          "Revisá los campos del formulario."
      );
      return;
    }

    startTransition(async () => {
      const res = await guardarConfiguracionBoxAction(box.id, validado.data);
      if (!res.ok) {
        setErrorMsg(`${res.errorCode ?? "ERROR"}: ${res.message ?? ""}`);
        return;
      }
      setGuardadoOk(true);
      router.refresh();
    });
  }

  const hayError = Boolean(errorMsg);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parámetros operativos de {box.nombre}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMsg ? (
            <div
              role="alert"
              data-testid="error-configuracion-box"
              className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/15 px-3.5 py-2.5 text-sm text-rose-400"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          ) : null}

          {guardadoOk ? (
            <div
              role="status"
              data-testid="mensaje-exito-configuracion"
              className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-2.5 text-sm text-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Configuración del Box actualizada correctamente.</span>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="cfg-nombre">Nombre del Box</Label>
            <Input
              id="cfg-nombre"
              aria-invalid={hayError}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cfg-timezone">Zona horaria (IANA)</Label>
              <Input
                id="cfg-timezone"
                aria-invalid={hayError}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="America/Argentina/Buenos_Aires"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cfg-moneda">Moneda (ISO 4217)</Label>
              <Input
                id="cfg-moneda"
                aria-invalid={hayError}
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                placeholder="ARS"
                maxLength={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cfg-anticipacion">
                Anticipación de reserva (días)
              </Label>
              <Input
                id="cfg-anticipacion"
                type="number"
                min={1}
                max={90}
                aria-invalid={hayError}
                className="tabular-nums"
                value={anticipacionReservaDias}
                onChange={(e) => setAnticipacionReservaDias(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cfg-ventana">
                Ventana de cancelación (minutos)
              </Label>
              <Input
                id="cfg-ventana"
                type="number"
                min={0}
                max={10080}
                aria-invalid={hayError}
                className="tabular-nums"
                value={ventanaCancelacionMinutos}
                onChange={(e) => setVentanaCancelacionMinutos(e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar configuración"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
