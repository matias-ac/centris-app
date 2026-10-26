"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { AfiliacionConBox } from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { seleccionarBoxAction } from "@/lib/actions";

export function SelectorBoxCard({
  afiliacion
}: {
  afiliacion: AfiliacionConBox;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleElegirBox() {
    startTransition(async () => {
      await seleccionarBoxAction(afiliacion.boxId);
      router.push("/inicio");
      router.refresh();
    });
  }

  return (
    <Card data-testid={`opcion-box-${afiliacion.boxId}`}>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{afiliacion.box.nombre}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {afiliacion.box.moneda} · {afiliacion.box.timezone}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {afiliacion.roles.map((rol) => (
            <Badge key={rol} variant="zinc">
              {rol}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleElegirBox}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "Abriendo Box..." : "Ingresar al Box"}
        </Button>
      </CardContent>
    </Card>
  );
}
