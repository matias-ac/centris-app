"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DiaOcupacionSemanal } from "@centris/shared";
import {
  prepararDatosGraficoOcupacion,
  type DatoGraficoOcupacion
} from "./inicio-estado";

interface TooltipOcupacionProps {
  active?: boolean;
  payload?: Array<{ payload?: DatoGraficoOcupacion }>;
}

function TooltipOcupacion({ active, payload }: TooltipOcupacionProps) {
  const dato = payload?.[0]?.payload;
  if (!active || !dato) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-2 text-xs shadow-none">
      <p className="font-medium text-foreground">
        {dato.diaCorto} · {dato.fecha}
      </p>
      <p className="mt-0.5 tabular-nums text-muted-foreground">
        {dato.reservasConfirmadas} / {dato.cuposTotales} cupos ({dato.porcentaje}%)
      </p>
    </div>
  );
}

export interface GraficoOcupacionSemanalProps {
  dias: readonly DiaOcupacionSemanal[];
}

/**
 * Gráfico semanal Recharts con pista de rayado diagonal oscuro y barra protagonista Volt Lime (#C1F429).
 */
export function GraficoOcupacionSemanal({
  dias
}: GraficoOcupacionSemanalProps) {
  const [montado, setMontado] = useState(false);
  const datos = prepararDatosGraficoOcupacion(dias);

  useEffect(() => {
    setMontado(true);
  }, []);

  if (!montado) {
    return (
      <div
        className="flex h-[196px] items-end gap-2.5 pt-3 tabular-nums"
        aria-label="Ocupación semanal de clases"
      >
        {datos.map((dia) => (
          <div
            key={dia.fecha}
            className="flex h-full flex-1 flex-col items-center gap-2"
          >
            <div
              className="relative flex w-full max-w-[44px] flex-1 items-end overflow-hidden rounded-[14px] border border-border"
              style={{
                background:
                  "repeating-linear-gradient(-45deg, #18191c, #18191c 4px, #22242a 4px, #22242a 8px)"
              }}
            >
              <div
                className={
                  dia.esHoy
                    ? "w-full rounded-[12px] bg-primary text-center text-xs font-semibold text-primary-foreground"
                    : "w-full rounded-[12px] bg-[#262830] text-center text-xs font-medium text-muted-foreground"
                }
                style={{ height: `${Math.max(dia.porcentaje, dia.porcentaje > 0 ? 18 : 0)}%` }}
              >
                {dia.porcentaje > 0 ? (
                  <span className="block pt-1">{dia.porcentaje}%</span>
                ) : null}
              </div>
            </div>
            <span
              className={
                dia.esHoy
                  ? "text-xs font-semibold text-foreground"
                  : "text-xs text-muted-foreground"
              }
            >
              {dia.diaCorto}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="h-[196px] w-full min-w-0 overflow-hidden tabular-nums"
      data-testid="grafico-ocupacion-recharts"
    >
      <ResponsiveContainer width="100%" height={196} minWidth={0}>
        <BarChart
          data={datos}
          margin={{ top: 20, right: 6, left: 6, bottom: 0 }}
          barCategoryGap="20%"
        >
          <defs>
            <pattern
              id="centris-diagonal-track"
              width="8"
              height="8"
              patternTransform="rotate(-45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <rect width="8" height="8" fill="#18191C" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="8"
                stroke="#22242A"
                strokeWidth="4"
              />
            </pattern>
          </defs>
          <XAxis
            dataKey="diaCorto"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#A1A1AA", fontSize: 12 }}
          />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            content={<TooltipOcupacion />}
          />
          <Bar
            dataKey="porcentaje"
            maxBarSize={44}
            radius={[12, 12, 12, 12]}
            isAnimationActive={false}
            background={{ fill: "url(#centris-diagonal-track)", radius: 12 }}
          >
            {datos.map((entry) => (
              <Cell
                key={entry.fecha}
                fill={entry.esHoy ? "#C1F429" : "#262830"}
              />
            ))}
            <LabelList
              dataKey="porcentaje"
              position="top"
              formatter={(valor) =>
                typeof valor === "number" && valor > 0 ? `${valor}%` : ""
              }
              style={{
                fill: "#A1A1AA",
                fontSize: 12,
                fontWeight: 500
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
