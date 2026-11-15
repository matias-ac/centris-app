"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ResumenGestionPanel } from "@centris/shared";
import {
  formatearImporteMoneda,
  prepararDatosGraficoCobranza,
  type SegmentoGraficoCobranza
} from "./inicio-estado";

interface TooltipCobranzaProps {
  active?: boolean;
  payload?: Array<{ payload?: SegmentoGraficoCobranza }>;
  moneda: string;
}

function TooltipCobranza({ active, payload, moneda }: TooltipCobranzaProps) {
  const segmento = payload?.[0]?.payload;
  if (!active || !segmento || segmento.nombre === "Sin movimientos") {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-2 text-xs">
      <p className="font-medium text-foreground">{segmento.nombre}</p>
      <p className="mt-0.5 tabular-nums text-muted-foreground">
        {formatearImporteMoneda(segmento.valor, moneda)}
      </p>
    </div>
  );
}

export interface GraficoCobranzaDonutProps {
  cobranza: ResumenGestionPanel["cobranzaMes"];
  moneda: string;
}

/**
 * Gráfico donut Recharts para distribución mensual de cobranza vs saldo pendiente.
 */
export function GraficoCobranzaDonut({
  cobranza,
  moneda
}: GraficoCobranzaDonutProps) {
  const [montado, setMontado] = useState(false);
  const segmentos = prepararDatosGraficoCobranza(cobranza);

  useEffect(() => {
    setMontado(true);
  }, []);

  return (
    <div className="relative h-[128px] w-[128px] shrink-0">
      {montado ? (
        <ResponsiveContainer width={128} height={128}>
          <PieChart>
            <Pie
              data={segmentos}
              dataKey="valor"
              nameKey="nombre"
              innerRadius={40}
              outerRadius={58}
              strokeWidth={0}
              paddingAngle={segmentos.length > 1 ? 2 : 0}
              isAnimationActive={false}
            >
              {segmentos.map((segmento) => (
                <Cell key={segmento.nombre} fill={segmento.color} />
              ))}
            </Pie>
            <Tooltip content={<TooltipCobranza moneda={moneda} />} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="grid h-full w-full place-items-center rounded-full border-[16px] border-secondary" />
      )}

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {cobranza.porcentajeCobrado}%
        </span>
      </div>
    </div>
  );
}
