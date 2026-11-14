import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import {
  BENTO_TITLE_CLASSES,
  Card,
  CardContent,
  CardHeader
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface AccesoRestringidoCardProps {
  descripcion: string;
  titulo?: string;
  badgeLabel?: string;
  headingAs?: "h1" | "h2";
}

/**
 * Card Bento accesible para vistas restringidas por permiso operativo dentro de un Box.
 */
export function AccesoRestringidoCard({
  descripcion,
  titulo = "Acceso exclusivo de Administración",
  badgeLabel = "Permiso requerido",
  headingAs = "h2"
}: AccesoRestringidoCardProps) {
  const Heading = headingAs;

  return (
    <Card
      data-testid="acceso-denegado-rol"
      className="max-w-2xl border-[#FF6D6D]/28"
    >
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <Heading className={cn(BENTO_TITLE_CLASSES, "text-xl")}>
          {titulo}
        </Heading>
        <Badge variant="coral">{badgeLabel}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {descripcion}
        </p>
        <div>
          <Link href="/inicio" className={buttonClassName("secondary")}>
            Volver al panel
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
