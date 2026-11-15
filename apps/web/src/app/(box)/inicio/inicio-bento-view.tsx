import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  ShieldAlert
} from "lucide-react";
import {
  tieneAlgunRol,
  type ResumenAtletaPanel,
  type ResumenCoachPanel,
  type ResumenGestionPanel,
  type ResumenPanel,
  type RolAfiliacion
} from "@centris/shared";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { GraficoCobranzaDonut } from "./grafico-cobranza-donut";
import { GraficoOcupacionSemanal } from "./grafico-ocupacion-semanal";
import {
  COLORES_MEDIO_PAGO,
  construirAccesosRapidosPanel,
  formatearFechaCortaInicio,
  formatearImporteMoneda,
  formatearRangoHoraPanel,
  resolverEncabezadoPanel,
  type AccesoRapidoPanel
} from "./inicio-estado";

export interface InicioBentoViewProps {
  roles: readonly RolAfiliacion[];
  resumen: ResumenPanel | null;
  errorCarga: string | null;
}

function EnlaceCircularBento({
  href,
  label
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={buttonClassName("iconCircle")}
    >
      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

interface TarjetaKpiBentoProps {
  titulo: string;
  descripcion: string;
  valor: string | number;
  complemento: ReactNode;
}

function TarjetaKpiBento({
  titulo,
  descripcion,
  valor,
  complemento
}: TarjetaKpiBentoProps) {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descripcion}</CardDescription>
      </CardHeader>
      <CardFooter>
        <span className="rounded-full border border-border bg-secondary px-4 py-2 text-2xl font-medium tabular-nums text-foreground">
          {valor}
        </span>
        {complemento}
      </CardFooter>
    </Card>
  );
}

interface SeccionGestionBentoProps {
  resumen: ResumenPanel;
  gestion: ResumenGestionPanel;
  tieneAdmin: boolean;
  tieneRecepcion: boolean;
}

function SeccionGestionBento({
  resumen,
  gestion,
  tieneAdmin,
  tieneRecepcion
}: SeccionGestionBentoProps) {
  const moneda = resumen.box.moneda;

  return (
    <section
      aria-label="Indicadores de gestión del Box"
      data-testid={
        tieneAdmin
          ? "panel-rol-administrador"
          : tieneRecepcion
            ? "panel-rol-recepcionista"
            : undefined
      }
      className="grid grid-cols-1 gap-4 md:grid-cols-12"
    >
      <div className="grid min-w-0 grid-cols-1 gap-4 md:col-span-12 md:grid-cols-12 xl:col-span-9">
        {/* Ocupación semanal */}
        <Card className="md:col-span-12">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="min-w-0 space-y-1">
              <CardTitle>Ocupación semanal de clases</CardTitle>
              <CardDescription>
                Porcentaje de cupos cubiertos por día en la zona horaria del Box
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="mint" className="tabular-nums">
                Hoy: {gestion.ocupacionSemanal.porcentajeHoy}%
              </Badge>
              <EnlaceCircularBento
                href="/clases"
                label="Ir al Calendario de Clases"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <GraficoOcupacionSemanal dias={gestion.ocupacionSemanal.dias} />
          </CardContent>

          <CardFooter className="gap-3">
            <div className="inline-flex flex-wrap items-baseline gap-2 rounded-full border border-border bg-secondary px-4 py-2">
              <span className="text-[clamp(1.5rem,1.25rem+1vw,2.125rem)] font-medium leading-[1.1] tracking-[-0.025em] tabular-nums text-foreground">
                {gestion.ocupacionSemanal.reservasSemana}
              </span>
              <span className="text-sm text-muted-foreground">
                reservas esta semana
              </span>
            </div>
            <Badge variant="zinc" className="tabular-nums">
              Cupo semanal: {gestion.ocupacionSemanal.cuposSemana}
            </Badge>
          </CardFooter>
        </Card>

        {/* Cobranza mensual */}
        <Card className="flex flex-col justify-between md:col-span-6">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="min-w-0 space-y-1">
              <CardTitle>Cobranza de {resumen.mes.etiqueta}</CardTitle>
              <CardDescription>
                Ingresos válidos por membresías del mes en curso
              </CardDescription>
            </div>
            <EnlaceCircularBento href="/caja" label="Ir a Caja y Morosos" />
          </CardHeader>

          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <GraficoCobranzaDonut
              cobranza={gestion.cobranzaMes}
              moneda={moneda}
            />

            <ul className="min-w-0 flex-1 space-y-2 text-xs text-muted-foreground tabular-nums">
              {gestion.cobranzaMes.desglosePorMedio.length > 0 ? (
                gestion.cobranzaMes.desglosePorMedio.map((item) => (
                  <li
                    key={item.medioPago}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            COLORES_MEDIO_PAGO[item.medioPago] ?? "#A1A1AA"
                        }}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="font-medium text-foreground">
                      {formatearImporteMoneda(item.total, moneda)}
                    </span>
                  </li>
                ))
              ) : (
                <li>Sin pagos registrados en el mes</li>
              )}

              <li className="flex items-center justify-between gap-2 border-t border-border pt-2">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#27272A]"
                  />
                  <span>Pendiente</span>
                </span>
                <span className="font-medium text-foreground">
                  {formatearImporteMoneda(
                    gestion.cobranzaMes.totalPendiente,
                    moneda
                  )}
                </span>
              </li>
            </ul>
          </CardContent>

          <CardFooter>
            <div className="inline-flex items-baseline rounded-full border border-border bg-secondary px-4 py-2">
              <span className="text-[clamp(1.375rem,1.2rem+0.8vw,1.75rem)] font-medium leading-[1.1] tracking-[-0.025em] tabular-nums text-foreground">
                {formatearImporteMoneda(
                  gestion.cobranzaMes.totalCobrado,
                  moneda
                )}
              </span>
            </div>
            <Badge
              variant={
                gestion.cobranzaMes.totalPendiente === 0 ? "mint" : "amber"
              }
            >
              {gestion.cobranzaMes.totalPendiente === 0
                ? "Caja al día"
                : "Saldos pendientes"}
            </Badge>
          </CardFooter>
        </Card>

        {/* Seguimiento de Morosos */}
        <Card
          className="flex flex-col justify-between md:col-span-6"
          data-testid={
            tieneAdmin && tieneRecepcion ? "panel-rol-recepcionista" : undefined
          }
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Seguimiento de saldos</CardTitle>
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#FF6D6D] px-2 text-xs font-semibold tabular-nums text-black">
                  {gestion.morosos.totalCantidad}
                </span>
              </div>
              <CardDescription>
                Atletas con saldo pendiente en su membresía
              </CardDescription>
            </div>
            <EnlaceCircularBento href="/caja" label="Ver morosos en Caja" />
          </CardHeader>

          <CardContent className="space-y-2.5">
            {gestion.morosos.top.length > 0 ? (
              gestion.morosos.top.map((moroso) => (
                <Link
                  key={moroso.afiliacionId}
                  href={`/atletas?afiliacionId=${moroso.afiliacionId}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-border bg-secondary px-3.5 py-2.5 transition-colors hover:border-[#3A3C42]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#FF6D6D]/30 bg-[#FF6D6D]/14 text-xs font-semibold text-[#FF6D6D]">
                      !
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {moroso.nombre}
                      </p>
                      <p className="truncate text-xs tabular-nums text-muted-foreground">
                        {moroso.planNombre} · Debe{" "}
                        {formatearImporteMoneda(moroso.deuda, moneda)}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                </Link>
              ))
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary px-4 py-4 text-sm text-muted-foreground">
                <CheckCircle2
                  className="h-5 w-5 shrink-0 text-[#18FFC8]"
                  aria-hidden="true"
                />
                <span>No hay atletas morosos pendientes hoy.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen operativo del Box */}
        <Card className="md:col-span-12">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="min-w-0 space-y-1">
              <CardTitle>Resumen operativo del Box</CardTitle>
              <CardDescription className="tabular-nums">
                Reglas vigentes: anticipación{" "}
                {resumen.box.anticipacionReservaDias} días
                {" · "}cancelación sin cargo hasta{" "}
                {resumen.box.ventanaCancelacionMinutos} min antes
              </CardDescription>
            </div>
            <EnlaceCircularBento
              href={tieneAdmin ? "/configuracion" : "/atletas"}
              label={
                tieneAdmin
                  ? "Ir a Configuración del Box"
                  : "Ir al Directorio de Atletas"
              }
            />
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-secondary p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Membresías activas
                  </span>
                  <Badge variant="mint">Vigentes</Badge>
                </div>
                <p className="mt-2 text-2xl font-medium tabular-nums text-foreground">
                  {gestion.resumenOperativo.membresiasActivas}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-secondary p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Por vencer (7 días)
                  </span>
                  <Badge variant="amber">Renovar</Badge>
                </div>
                <p className="mt-2 text-2xl font-medium tabular-nums text-foreground">
                  {gestion.resumenOperativo.membresiasPorVencer7Dias}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-secondary p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Saldo pendiente total
                  </span>
                  <Badge
                    variant={gestion.morosos.totalDeuda > 0 ? "coral" : "mint"}
                  >
                    {gestion.morosos.totalDeuda > 0 ? "Moroso" : "Al día"}
                  </Badge>
                </div>
                <p className="mt-2 text-2xl font-medium tabular-nums text-foreground">
                  {formatearImporteMoneda(gestion.morosos.totalDeuda, moneda)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Columna derecha KPIs apilados */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3 md:col-span-12 xl:col-span-3 xl:grid-cols-1">
        <TarjetaKpiBento
          titulo="Clases programadas hoy"
          descripcion="Clases habilitadas para reserva"
          valor={gestion.resumenOperativo.clasesHoy}
          complemento={
            <EnlaceCircularBento
              href="/clases"
              label="Ver clases programadas hoy"
            />
          }
        />

        <TarjetaKpiBento
          titulo="Asistencias marcadas"
          descripcion="Asistencias registradas en la semana"
          valor={gestion.resumenOperativo.asistenciasSemana}
          complemento={
            <EnlaceCircularBento
              href="/clases"
              label="Ir a lista de asistencias"
            />
          }
        />

        <TarjetaKpiBento
          titulo="Tasa de asistencia"
          descripcion="Reservas que efectivamente entrenaron"
          valor={`${gestion.resumenOperativo.tasaAsistenciaPorcentaje}%`}
          complemento={
            <Badge
              variant={
                gestion.resumenOperativo.tasaAsistenciaPorcentaje >= 75
                  ? "mint"
                  : "zinc"
              }
              className="tabular-nums"
            >
              {gestion.resumenOperativo.reservasCerradasSemana} eval.
            </Badge>
          }
        />
      </div>
    </section>
  );
}

interface SeccionCoachBentoProps {
  coach: ResumenCoachPanel;
  nombreBox: string;
  timezone: string;
}

function SeccionCoachBento({
  coach,
  nombreBox,
  timezone
}: SeccionCoachBentoProps) {
  return (
    <section
      aria-label="Piso de entrenamiento Coach"
      data-testid="panel-rol-coach"
      className="grid grid-cols-1 gap-4 md:grid-cols-12"
    >
      <Card className="md:col-span-8">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0 space-y-1">
            <CardTitle>Tus clases de hoy</CardTitle>
            <CardDescription className="tabular-nums">
              Abrí el calendario para registrar asistencias dentro de la ventana
              de {coach.ventanaCorreccionHoras} hs
            </CardDescription>
          </div>
          <EnlaceCircularBento
            href="/clases"
            label="Abrir Calendario de Clases"
          />
        </CardHeader>

        <CardContent className="space-y-2.5">
          {coach.clasesHoy.length > 0 ? (
            coach.clasesHoy.map((clase) => {
              const estaCancelada = clase.canceladaEn !== null;
              const asistenciaCompleta =
                !estaCancelada &&
                clase.reservasConfirmadas > 0 &&
                clase.asistenciasMarcadas >= clase.reservasConfirmadas;

              return (
                <Link
                  key={clase.id}
                  href="/clases"
                  className="flex min-h-11 flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary px-4 py-3 transition-colors hover:border-[#3A3C42]"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium text-foreground">
                      <span className="tabular-nums">
                        {formatearRangoHoraPanel(
                          clase.inicio,
                          clase.fin,
                          timezone
                        )}
                      </span>
                      {" · "}
                      {clase.tipoClaseNombre}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {clase.reservasConfirmadas} / {clase.cupos} inscriptos
                      {" · "}
                      {clase.asistenciasMarcadas} asistencias marcadas
                    </p>
                  </div>

                  {estaCancelada ? (
                    <Badge variant="coral">Cancelada</Badge>
                  ) : asistenciaCompleta ? (
                    <Badge variant="mint">Asistencia lista</Badge>
                  ) : clase.ventanaCorreccionAbierta ? (
                    <Badge variant="amber">Ventana 24 hs abierta</Badge>
                  ) : (
                    <Badge variant="zinc">Programada</Badge>
                  )}
                </Link>
              );
            })
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary px-4 py-4">
              <p className="text-sm text-muted-foreground">
                No tenés clases asignadas para hoy en {nombreBox}.
              </p>
              <Link href="/clases" className={buttonClassName("secondary")}>
                Ver calendario semanal
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-4 md:grid-cols-1">
        <TarjetaKpiBento
          titulo="Ventana de marcado"
          descripcion="Plazo para registrar o corregir asistencia tras finalizar"
          valor={`${coach.ventanaCorreccionHoras} hs`}
          complemento={
            <Badge
              variant={coach.clasesPendientesAsistencia24h > 0 ? "amber" : "mint"}
              className="tabular-nums"
            >
              {coach.clasesPendientesAsistencia24h > 0
                ? `${coach.clasesPendientesAsistencia24h} pendientes`
                : "Al día"}
            </Badge>
          }
        />

        <TarjetaKpiBento
          titulo="Atletas hoy a tu cargo"
          descripcion="Reservas confirmadas en tus clases de hoy"
          valor={coach.atletasHoyACargo}
          complemento={
            <EnlaceCircularBento
              href="/clases"
              label="Ver nómina de inscriptos"
            />
          }
        />
      </div>
    </section>
  );
}

interface SeccionAtletaBentoProps {
  atleta: ResumenAtletaPanel;
  nombreBox: string;
  moneda: string;
  timezone: string;
  anticipacionReservaDias: number;
  ventanaCancelacionMinutos: number;
}

function SeccionAtletaBento({
  atleta,
  nombreBox,
  moneda,
  timezone,
  anticipacionReservaDias,
  ventanaCancelacionMinutos
}: SeccionAtletaBentoProps) {
  return (
    <section
      aria-label="Panel del Atleta"
      data-testid="panel-rol-atleta"
      className="grid grid-cols-1 gap-4 md:grid-cols-12"
    >
      <Card className="flex flex-col justify-between md:col-span-6">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0 space-y-1">
            <CardTitle>
              {atleta.membresiaVigente
                ? `Tu membresía · ${atleta.membresiaVigente.planNombre}`
                : "Tu membresía"}
            </CardTitle>
            <CardDescription className="tabular-nums">
              {atleta.membresiaVigente
                ? `Vigente del ${formatearFechaCortaInicio(atleta.membresiaVigente.fechaInicio)} al ${formatearFechaCortaInicio(atleta.membresiaVigente.fechaFin)}`
                : atleta.membresiaFutura
                  ? `Próxima vigencia: ${atleta.membresiaFutura.planNombre} desde ${formatearFechaCortaInicio(atleta.membresiaFutura.fechaInicio)}`
                  : "Todavía no tenés una membresía vigente asignada en este Box."}
            </CardDescription>
          </div>
          <Badge
            variant={
              atleta.membresiaVigente
                ? "mint"
                : atleta.membresiaFutura
                  ? "amber"
                  : "zinc"
            }
          >
            {atleta.membresiaVigente
              ? "Membresía activa"
              : atleta.membresiaFutura
                ? "Membresía futura"
                : "Sin membresía"}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-3">
          {atleta.membresiaVigente ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-secondary p-4">
                <p className="text-xs text-muted-foreground">
                  {atleta.membresiaVigente.modalidadCreditos === "SEMANAL"
                    ? "Créditos semana"
                    : "Créditos disponibles"}
                </p>
                <p className="mt-1.5 text-[clamp(1.375rem,1.2rem+0.8vw,1.75rem)] font-medium tabular-nums text-foreground">
                  {atleta.membresiaVigente.modalidadCreditos === "ILIMITADO"
                    ? "Ilimitado"
                    : `${atleta.membresiaVigente.creditosDisponiblesPeriodo ?? 0} / ${atleta.membresiaVigente.creditosPorPeriodo ?? 0}`}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-secondary p-4">
                <p className="text-xs text-muted-foreground">Créditos extra</p>
                <p className="mt-1.5 text-[clamp(1.375rem,1.2rem+0.8vw,1.75rem)] font-medium tabular-nums text-foreground">
                  {atleta.membresiaVigente.creditosExtra}
                </p>
              </div>
            </div>
          ) : null}

          {atleta.esMoroso ? (
            <div className="flex items-start gap-3 rounded-2xl border border-[#FBBF24]/30 bg-[#FBBF24]/10 p-3.5 text-xs text-[#FBBF24]">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <div className="space-y-0.5">
                <p className="font-medium tabular-nums">
                  Saldo pendiente:{" "}
                  {formatearImporteMoneda(atleta.saldoPendienteTotal, moneda)}
                </p>
                <p className="text-muted-foreground">
                  Podés seguir reservando tus clases con normalidad y abonar en
                  recepción cuando te acerques al Box.
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>

        <CardFooter>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="tabular-nums">
              Cancelás sin cargo hasta {ventanaCancelacionMinutos} min antes del
              inicio.
            </span>
          </span>
          <EnlaceCircularBento href="/reservas" label="Ir a Mis Reservas" />
        </CardFooter>
      </Card>

      <Card className="flex flex-col justify-between md:col-span-6">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0 space-y-1">
            <CardTitle>Próximas clases reservadas</CardTitle>
            <CardDescription>
              Tus clases confirmadas en {nombreBox}
            </CardDescription>
          </div>
          <EnlaceCircularBento
            href="/reservas"
            label="Gestionar Mis Reservas"
          />
        </CardHeader>

        <CardContent className="space-y-2.5">
          {atleta.proximasReservas.length > 0 ? (
            atleta.proximasReservas.map((reserva) => (
              <div
                key={reserva.reservaId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary px-4 py-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium text-foreground">
                    {reserva.tipoClaseNombre} ·{" "}
                    <span className="tabular-nums">
                      {formatearRangoHoraPanel(
                        reserva.inicio,
                        reserva.fin,
                        timezone
                      )}
                    </span>
                  </p>
                  <p className="truncate text-xs tabular-nums text-muted-foreground">
                    Coach {reserva.coachNombre} · {reserva.reservasConfirmadas} /{" "}
                    {reserva.cupos} cupos
                    {" · "}
                    {reserva.enCurso
                      ? "Clase en curso"
                      : reserva.puedeCancelarSinCargo
                        ? `Sin cargo hasta ${reserva.horaLimiteSinCargo}`
                        : "Ventana tardía"}
                  </p>
                </div>

                <Badge
                  variant={
                    reserva.enCurso || reserva.puedeCancelarSinCargo
                      ? "mint"
                      : "amber"
                  }
                >
                  {reserva.enCurso ? "En curso" : "Confirmada"}
                </Badge>
              </div>
            ))
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary px-4 py-4">
              <div className="flex items-center gap-3">
                <CalendarClock
                  className="h-5 w-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">
                  Todavía no tenés próximas reservas confirmadas.
                </p>
              </div>
              <Link href="/reservas" className={buttonClassName("primary")}>
                Reservar lugar
              </Link>
            </div>
          )}
        </CardContent>

        <CardFooter>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="tabular-nums">
              Anticipación habilitada: {anticipacionReservaDias} días
            </span>
          </span>
          <Link href="/reservas" className={buttonClassName("secondary")}>
            Ver mis reservas
          </Link>
        </CardFooter>
      </Card>
    </section>
  );
}

function SeccionAccesosRapidos({
  accesosRapidos
}: {
  accesosRapidos: readonly AccesoRapidoPanel[];
}) {
  return (
    <section aria-label="Accesos rápidos del Box" className="space-y-3">
      <h2 className="text-[1.0625rem] font-medium leading-[1.3] tracking-[-0.01em] text-foreground">
        Accesos rápidos
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {accesosRapidos.map((acceso) => (
          <Card
            key={acceso.href}
            className="flex items-center justify-between gap-3 p-4 transition-colors hover:border-[#3A3C42]"
          >
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm font-medium text-foreground">
                {acceso.label}
              </p>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {acceso.descripcion}
              </p>
            </div>
            <EnlaceCircularBento
              href={acceso.href}
              label={`Ir a ${acceso.label}`}
            />
          </Card>
        ))}
      </div>
    </section>
  );
}

/**
 * Tablero Dark Bento Cockpit para `/inicio`, adaptado estrictamente a los roles activos (ADR 0007)
 * con métricas reales del Box, gráficos Recharts y accesos rápidos sin datos hardcodeados.
 */
export function InicioBentoView({
  roles,
  resumen,
  errorCarga
}: InicioBentoViewProps) {
  const tieneAdmin = tieneAlgunRol(roles, ["administrador"]);
  const tieneRecepcion = tieneAlgunRol(roles, ["recepcionista"]);
  const tieneCoach = tieneAlgunRol(roles, ["coach"]);
  const tieneAtleta = tieneAlgunRol(roles, ["atleta"]);

  const nombreBox = resumen?.box.nombre ?? "tu Box";
  const moneda = resumen?.box.moneda ?? "ARS";
  const timezone = resumen?.box.timezone ?? "America/Argentina/Buenos_Aires";

  const encabezado = resolverEncabezadoPanel(roles, nombreBox);
  const accesosRapidos = construirAccesosRapidosPanel(roles);

  const gestion = resumen?.gestion ?? null;
  const coach = resumen?.coach ?? null;
  const atleta = resumen?.atleta ?? null;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[clamp(1.375rem,1.2rem+0.8vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground">
            {encabezado.titulo}
          </h1>
          <p className="max-w-[70ch] text-sm text-muted-foreground">
            {encabezado.subtitulo}
          </p>
        </div>

        <Link
          href={encabezado.ctaPrimario.href}
          className={buttonClassName("primary", "shrink-0")}
        >
          {encabezado.ctaPrimario.label}
        </Link>
      </header>

      {errorCarga ? (
        <Card className="border-[#FF6D6D]/35">
          <CardContent className="flex items-start gap-3 p-5 text-sm text-[#FF6D6D]">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{errorCarga}</p>
          </CardContent>
        </Card>
      ) : null}

      {(tieneAdmin || tieneRecepcion) && gestion && resumen ? (
        <SeccionGestionBento
          resumen={resumen}
          gestion={gestion}
          tieneAdmin={tieneAdmin}
          tieneRecepcion={tieneRecepcion}
        />
      ) : null}

      {tieneCoach && coach ? (
        <SeccionCoachBento
          coach={coach}
          nombreBox={nombreBox}
          timezone={timezone}
        />
      ) : null}

      {tieneAtleta && atleta ? (
        <SeccionAtletaBento
          atleta={atleta}
          nombreBox={nombreBox}
          moneda={moneda}
          timezone={timezone}
          anticipacionReservaDias={resumen?.box.anticipacionReservaDias ?? 7}
          ventanaCancelacionMinutos={
            resumen?.box.ventanaCancelacionMinutos ?? 120
          }
        />
      ) : null}

      <SeccionAccesosRapidos accesosRapidos={accesosRapidos} />
    </div>
  );
}
