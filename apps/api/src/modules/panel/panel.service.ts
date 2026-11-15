import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  ESTADOS_RESERVA_QUE_CONSUMEN_CREDITO,
  HORAS_VENTANA_CORRECCION_ASISTENCIA,
  calcularDisponibilidadCreditos,
  calcularSaldoMembresia,
  construirDiasSemanaPanel,
  evaluarVentanaCancelacion,
  evaluarVentanaCorreccionAsistencia,
  obtenerFechaLocal,
  obtenerRangoMesLocal,
  obtenerRangoPeriodoSemanal,
  sumarDiasAFecha,
  tieneAlgunRol,
  type Box,
  type MedioPago,
  type ModalidadCreditos,
  type ResumenAtletaPanel,
  type ResumenCoachPanel,
  type ResumenGestionPanel,
  type ResumenPanel,
  type RolAfiliacion
} from "@centris/shared";
import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { DomainException } from "../../common/errors/domain.exception.js";
import {
  DatabaseService,
  type DrizzleTx
} from "../../database/database.service.js";
import {
  afiliaciones,
  boxes,
  clases,
  membresias,
  pagos,
  planes,
  reservas,
  tiposClase,
  usuarios
} from "../../database/schema/index.js";

const ETIQUETAS_MEDIO_PAGO: Record<MedioPago, string> = {
  TRANSFERENCIA: "Transferencia",
  EFECTIVO: "Efectivo",
  OTRO: "Otro"
};

function formatearHoraLocal(instante: Date, timezone: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(instante);
}

interface PagoBasico {
  membresiaId: string;
  monto: number;
  anuladoEn: Date | null;
}

/**
 * Agrupa los pagos por membresía preservando `anuladoEn` para delegar la regla de saldo al dominio compartido.
 */
function agruparPagosPorMembresia(
  filasPagos: readonly PagoBasico[]
): Map<string, Array<{ monto: number; anuladoEn: Date | null }>> {
  const porMembresia = new Map<
    string,
    Array<{ monto: number; anuladoEn: Date | null }>
  >();

  for (const pago of filasPagos) {
    const lista = porMembresia.get(pago.membresiaId) ?? [];
    lista.push({ monto: pago.monto, anuladoEn: pago.anuladoEn });
    porMembresia.set(pago.membresiaId, lista);
  }

  return porMembresia;
}

function calcularOcupacionSemanal(
  filasClasesSemana: ReadonlyArray<{
    inicio: Date;
    cupos: number;
    reservasConfirmadas: number;
    asistenciasMarcadas: number;
  }>,
  boxTimezone: string,
  fechaLocal: string,
  lunesSemana: string,
  ahora: Date
) {
  const diasBase = construirDiasSemanaPanel(lunesSemana, fechaLocal);
  const acumuladoPorDia = new Map<
    string,
    { cupos: number; reservas: number; clasesCount: number }
  >();
  for (const d of diasBase) {
    acumuladoPorDia.set(d.fecha, { cupos: 0, reservas: 0, clasesCount: 0 });
  }

  let asistenciasSemana = 0;
  let reservasCerradasSemana = 0;

  for (const fila of filasClasesSemana) {
    const fechaClase = obtenerFechaLocal(fila.inicio, boxTimezone);
    const bucket = acumuladoPorDia.get(fechaClase);
    if (bucket) {
      bucket.cupos += fila.cupos;
      bucket.reservas += fila.reservasConfirmadas;
      bucket.clasesCount += 1;
    }
    asistenciasSemana += fila.asistenciasMarcadas;
    if (fila.inicio <= ahora) {
      reservasCerradasSemana += fila.reservasConfirmadas;
    }
  }

  const dias = diasBase.map((d) => {
    const datos = acumuladoPorDia.get(d.fecha) ?? {
      cupos: 0,
      reservas: 0,
      clasesCount: 0
    };
    const porcentaje =
      datos.cupos > 0
        ? Math.min(100, Math.round((datos.reservas / datos.cupos) * 100))
        : 0;
    return {
      ...d,
      cuposTotales: datos.cupos,
      reservasConfirmadas: datos.reservas,
      porcentaje
    };
  });

  const reservasSemana = dias.reduce(
    (acc, d) => acc + d.reservasConfirmadas,
    0
  );
  const cuposSemana = dias.reduce((acc, d) => acc + d.cuposTotales, 0);
  const hoyDia = dias.find((d) => d.esHoy);
  const clasesHoy = acumuladoPorDia.get(fechaLocal)?.clasesCount ?? 0;
  const tasaAsistenciaPorcentaje =
    reservasCerradasSemana > 0
      ? Math.min(
          100,
          Math.round((asistenciasSemana / reservasCerradasSemana) * 100)
        )
      : 0;

  return {
    ocupacionSemanal: {
      dias,
      reservasSemana,
      cuposSemana,
      porcentajeHoy: hoyDia?.porcentaje ?? 0
    },
    clasesHoy,
    asistenciasSemana,
    reservasCerradasSemana,
    tasaAsistenciaPorcentaje
  };
}

function calcularCobranzaYMorosos(
  filasMembresias: ReadonlyArray<{
    id: string;
    afiliacionId: string;
    precio: number;
    fechaInicio: string;
    fechaFin: string;
    planNombre: string;
    usuarioNombre: string;
  }>,
  filasPagos: ReadonlyArray<{
    membresiaId: string;
    monto: number;
    medioPago: string;
    fechaPago: string;
    anuladoEn: Date | null;
  }>,
  fechaLocal: string,
  inicioMes: string,
  finMes: string
) {
  const pagosPorMembresia = agruparPagosPorMembresia(filasPagos);
  const cobradoPorMedio = new Map<MedioPago, number>();
  let totalCobradoMes = 0;

  for (const pago of filasPagos) {
    if (
      pago.anuladoEn === null &&
      pago.fechaPago >= inicioMes &&
      pago.fechaPago <= finMes
    ) {
      totalCobradoMes += pago.monto;
      const medio = pago.medioPago as MedioPago;
      cobradoPorMedio.set(medio, (cobradoPorMedio.get(medio) ?? 0) + pago.monto);
    }
  }

  const limite7Dias = sumarDiasAFecha(fechaLocal, 7);
  let membresiasActivas = 0;
  let membresiasPorVencer7Dias = 0;
  let totalPendiente = 0;

  const morososPorAfiliacion = new Map<
    string,
    {
      afiliacionId: string;
      nombre: string;
      planNombre: string;
      deuda: number;
    }
  >();

  for (const m of filasMembresias) {
    const vigenteHoy = m.fechaInicio <= fechaLocal && m.fechaFin >= fechaLocal;
    if (vigenteHoy) {
      membresiasActivas += 1;
      if (m.fechaFin <= limite7Dias) {
        membresiasPorVencer7Dias += 1;
      }
    }

    const saldo = calcularSaldoMembresia(
      m.precio,
      pagosPorMembresia.get(m.id) ?? []
    );
    if (saldo > 0) {
      totalPendiente += saldo;
      const existente = morososPorAfiliacion.get(m.afiliacionId);
      if (!existente) {
        morososPorAfiliacion.set(m.afiliacionId, {
          afiliacionId: m.afiliacionId,
          nombre: m.usuarioNombre,
          planNombre: m.planNombre,
          deuda: saldo
        });
      } else {
        existente.deuda += saldo;
      }
    }
  }

  const morososOrdenados = Array.from(morososPorAfiliacion.values()).sort(
    (a, b) => b.deuda - a.deuda
  );
  const totalCobranzaObjetivo = totalCobradoMes + totalPendiente;
  const porcentajeCobrado =
    totalCobranzaObjetivo > 0
      ? Math.min(100, Math.round((totalCobradoMes / totalCobranzaObjetivo) * 100))
      : 0;

  const desglosePorMedio = Array.from(cobradoPorMedio.entries())
    .map(([medioPago, total]) => ({
      medioPago,
      label: ETIQUETAS_MEDIO_PAGO[medioPago] ?? medioPago,
      total
    }))
    .sort((a, b) => b.total - a.total);

  return {
    cobranzaMes: {
      totalCobrado: totalCobradoMes,
      totalPendiente,
      porcentajeCobrado,
      desglosePorMedio
    },
    morosos: {
      totalCantidad: morososOrdenados.length,
      totalDeuda: totalPendiente,
      top: morososOrdenados.slice(0, 4)
    },
    membresiasActivas,
    membresiasPorVencer7Dias
  };
}

@Injectable()
export class PanelService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  async obtenerResumen(
    contexto: {
      boxId: string;
      afiliacionId: string;
      roles: readonly RolAfiliacion[];
    },
    ahora: Date = new Date()
  ): Promise<ResumenPanel> {
    return this.db.withBoxTransaction(contexto.boxId, async (tx) => {
      const [boxFila] = await tx
        .select()
        .from(boxes)
        .where(and(eq(boxes.id, contexto.boxId), isNull(boxes.deletedAt)));

      if (!boxFila) {
        throw new DomainException(
          ERROR_CODES.BOX_NO_SELECCIONADO,
          "El Box activo no existe o se encuentra dado de baja.",
          HttpStatus.BAD_REQUEST
        );
      }

      const box: Box = {
        id: boxFila.id,
        nombre: boxFila.nombre,
        slug: boxFila.slug,
        timezone: boxFila.timezone,
        moneda: boxFila.moneda,
        anticipacionReservaDias: boxFila.anticipacionReservaDias,
        ventanaCancelacionMinutos: boxFila.ventanaCancelacionMinutos
      };

      const fechaLocal = obtenerFechaLocal(ahora, box.timezone);
      const semana = obtenerRangoPeriodoSemanal(fechaLocal);
      const mes = obtenerRangoMesLocal(fechaLocal);

      const esGestion = tieneAlgunRol(contexto.roles, [
        "administrador",
        "recepcionista"
      ]);
      const esCoach = tieneAlgunRol(contexto.roles, ["coach"]);
      const esAtleta = tieneAlgunRol(contexto.roles, ["atleta"]);

      const gestion = esGestion
        ? await this.construirResumenGestion(
            tx,
            box,
            fechaLocal,
            semana,
            mes.inicioMes,
            mes.finMes,
            ahora
          )
        : null;
      const coach = esCoach
        ? await this.construirResumenCoach(
            tx,
            box,
            contexto.afiliacionId,
            fechaLocal,
            ahora
          )
        : null;
      const atleta = esAtleta
        ? await this.construirResumenAtleta(
            tx,
            box,
            contexto.afiliacionId,
            fechaLocal,
            ahora
          )
        : null;

      return {
        box,
        fechaLocal,
        semana: {
          desde: semana.lunes,
          hasta: semana.domingo
        },
        mes: {
          clave: mes.clave,
          etiqueta: mes.etiqueta
        },
        gestion,
        coach,
        atleta
      };
    });
  }

  private async construirResumenGestion(
    tx: DrizzleTx,
    box: Box,
    fechaLocal: string,
    semana: { lunes: string; domingo: string },
    inicioMes: string,
    finMes: string,
    ahora: Date
  ): Promise<ResumenGestionPanel> {
    const filasClasesSemana = await tx
      .select({
        id: clases.id,
        inicio: clases.inicio,
        fin: clases.fin,
        cupos: clases.cupos,
        reservasConfirmadas: sql<number>`COALESCE(COUNT(${reservas.id}) FILTER (WHERE ${reservas.estado} = 'CONFIRMADA'), 0)::int`,
        asistenciasMarcadas: sql<number>`COALESCE(COUNT(${reservas.id}) FILTER (WHERE ${reservas.estado} = 'CONFIRMADA' AND ${reservas.asistenciaMarcadaEn} IS NOT NULL), 0)::int`
      })
      .from(clases)
      .leftJoin(
        reservas,
        and(eq(reservas.claseId, clases.id), eq(reservas.boxId, clases.boxId))
      )
      .where(
        and(
          eq(clases.boxId, box.id),
          isNull(clases.deletedAt),
          isNull(clases.canceladaEn),
          sql`(${clases.inicio} AT TIME ZONE ${box.timezone})::date >= ${semana.lunes}::date`,
          sql`(${clases.inicio} AT TIME ZONE ${box.timezone})::date <= ${semana.domingo}::date`
        )
      )
      .groupBy(clases.id);

    const filasMembresias = await tx
      .select({
        id: membresias.id,
        afiliacionId: membresias.afiliacionId,
        precio: membresias.precio,
        fechaInicio: membresias.fechaInicio,
        fechaFin: membresias.fechaFin,
        planNombre: planes.nombre,
        usuarioNombre: usuarios.nombre
      })
      .from(membresias)
      .innerJoin(
        planes,
        and(eq(membresias.planId, planes.id), eq(membresias.boxId, planes.boxId))
      )
      .innerJoin(
        afiliaciones,
        and(
          eq(membresias.afiliacionId, afiliaciones.id),
          eq(membresias.boxId, afiliaciones.boxId)
        )
      )
      .innerJoin(usuarios, eq(afiliaciones.usuarioId, usuarios.id))
      .where(
        and(
          eq(membresias.boxId, box.id),
          isNull(membresias.deletedAt),
          eq(afiliaciones.activo, true),
          isNull(afiliaciones.deletedAt)
        )
      )
      .orderBy(desc(membresias.fechaFin));

    const filasPagos = await tx
      .select({
        id: pagos.id,
        membresiaId: pagos.membresiaId,
        monto: pagos.monto,
        medioPago: pagos.medioPago,
        fechaPago: pagos.fechaPago,
        anuladoEn: pagos.anuladoEn
      })
      .from(pagos)
      .where(eq(pagos.boxId, box.id));

    const ocupacion = calcularOcupacionSemanal(
      filasClasesSemana,
      box.timezone,
      fechaLocal,
      semana.lunes,
      ahora
    );
    const finanzas = calcularCobranzaYMorosos(
      filasMembresias,
      filasPagos,
      fechaLocal,
      inicioMes,
      finMes
    );

    return {
      ocupacionSemanal: ocupacion.ocupacionSemanal,
      cobranzaMes: finanzas.cobranzaMes,
      morosos: finanzas.morosos,
      resumenOperativo: {
        membresiasActivas: finanzas.membresiasActivas,
        membresiasPorVencer7Dias: finanzas.membresiasPorVencer7Dias,
        clasesHoy: ocupacion.clasesHoy,
        asistenciasSemana: ocupacion.asistenciasSemana,
        reservasCerradasSemana: ocupacion.reservasCerradasSemana,
        tasaAsistenciaPorcentaje: ocupacion.tasaAsistenciaPorcentaje
      }
    };
  }

  private async construirResumenCoach(
    tx: DrizzleTx,
    box: Box,
    coachAfiliacionId: string,
    fechaLocal: string,
    ahora: Date
  ): Promise<ResumenCoachPanel> {
    const desdeReciente = sumarDiasAFecha(fechaLocal, -2);
    const filas = await tx
      .select({
        id: clases.id,
        inicio: clases.inicio,
        fin: clases.fin,
        cupos: clases.cupos,
        canceladaEn: clases.canceladaEn,
        tipoClaseNombre: tiposClase.nombre,
        reservasConfirmadas: sql<number>`COALESCE(COUNT(${reservas.id}) FILTER (WHERE ${reservas.estado} = 'CONFIRMADA'), 0)::int`,
        asistenciasMarcadas: sql<number>`COALESCE(COUNT(${reservas.id}) FILTER (WHERE ${reservas.estado} = 'CONFIRMADA' AND ${reservas.asistenciaMarcadaEn} IS NOT NULL), 0)::int`
      })
      .from(clases)
      .innerJoin(
        tiposClase,
        and(
          eq(clases.tipoClaseId, tiposClase.id),
          eq(clases.boxId, tiposClase.boxId)
        )
      )
      .leftJoin(
        reservas,
        and(eq(reservas.claseId, clases.id), eq(reservas.boxId, clases.boxId))
      )
      .where(
        and(
          eq(clases.boxId, box.id),
          eq(clases.coachAfiliacionId, coachAfiliacionId),
          isNull(clases.deletedAt),
          sql`(${clases.inicio} AT TIME ZONE ${box.timezone})::date >= ${desdeReciente}::date`,
          sql`(${clases.inicio} AT TIME ZONE ${box.timezone})::date <= ${fechaLocal}::date`
        )
      )
      .groupBy(clases.id, tiposClase.nombre)
      .orderBy(asc(clases.inicio));

    const clasesHoy = [];
    let clasesPendientesAsistencia24h = 0;
    let atletasHoyACargo = 0;

    for (const fila of filas) {
      const ventana = evaluarVentanaCorreccionAsistencia({
        claseInicio: fila.inicio,
        claseFin: fila.fin,
        ahora
      });

      const tienePendientes =
        fila.canceladaEn === null &&
        ventana.dentroDeVentana &&
        fila.reservasConfirmadas > fila.asistenciasMarcadas;

      if (tienePendientes) {
        clasesPendientesAsistencia24h += 1;
      }

      if (obtenerFechaLocal(fila.inicio, box.timezone) === fechaLocal) {
        if (fila.canceladaEn === null) {
          atletasHoyACargo += fila.reservasConfirmadas;
        }
        clasesHoy.push({
          id: fila.id,
          tipoClaseNombre: fila.tipoClaseNombre,
          inicio: fila.inicio.toISOString(),
          fin: fila.fin.toISOString(),
          cupos: fila.cupos,
          reservasConfirmadas: fila.reservasConfirmadas,
          asistenciasMarcadas: fila.asistenciasMarcadas,
          canceladaEn: fila.canceladaEn ? fila.canceladaEn.toISOString() : null,
          ventanaCorreccionAbierta: ventana.dentroDeVentana
        });
      }
    }

    return {
      clasesHoy,
      clasesPendientesAsistencia24h,
      atletasHoyACargo,
      ventanaCorreccionHoras: HORAS_VENTANA_CORRECCION_ASISTENCIA
    };
  }

  private async construirResumenAtleta(
    tx: DrizzleTx,
    box: Box,
    afiliacionId: string,
    fechaLocal: string,
    ahora: Date
  ): Promise<ResumenAtletaPanel> {
    const filasMembresias = await tx
      .select({
        id: membresias.id,
        precio: membresias.precio,
        modalidadCreditos: membresias.modalidadCreditos,
        creditosPorPeriodo: membresias.creditosPorPeriodo,
        creditosExtra: membresias.creditosExtra,
        fechaInicio: membresias.fechaInicio,
        fechaFin: membresias.fechaFin,
        planNombre: planes.nombre
      })
      .from(membresias)
      .innerJoin(
        planes,
        and(eq(membresias.planId, planes.id), eq(membresias.boxId, planes.boxId))
      )
      .where(
        and(
          eq(membresias.boxId, box.id),
          eq(membresias.afiliacionId, afiliacionId),
          isNull(membresias.deletedAt)
        )
      )
      .orderBy(asc(membresias.fechaInicio));

    const membresiaIds = filasMembresias.map((m) => m.id);
    const pagosAtleta =
      membresiaIds.length > 0
        ? await tx
            .select({
              membresiaId: pagos.membresiaId,
              monto: pagos.monto,
              anuladoEn: pagos.anuladoEn
            })
            .from(pagos)
            .where(
              and(
                eq(pagos.boxId, box.id),
                inArray(pagos.membresiaId, membresiaIds)
              )
            )
        : [];

    const pagosPorMembresia = agruparPagosPorMembresia(pagosAtleta);

    let saldoPendienteTotal = 0;
    const saldoPorMembresia = new Map<string, number>();
    for (const m of filasMembresias) {
      const saldo = calcularSaldoMembresia(
        m.precio,
        pagosPorMembresia.get(m.id) ?? []
      );
      saldoPorMembresia.set(m.id, saldo);
      saldoPendienteTotal += saldo;
    }

    const filaVigente =
      filasMembresias.find(
        (m) => m.fechaInicio <= fechaLocal && m.fechaFin >= fechaLocal
      ) ?? null;
    const filaFutura =
      filasMembresias.find((m) => m.fechaInicio > fechaLocal) ?? null;

    let membresiaVigente: ResumenAtletaPanel["membresiaVigente"] = null;
    if (filaVigente) {
      const reservasMembresia = await tx
        .select({
          claseInicio: clases.inicio
        })
        .from(reservas)
        .innerJoin(
          clases,
          and(eq(reservas.claseId, clases.id), eq(reservas.boxId, clases.boxId))
        )
        .where(
          and(
            eq(reservas.boxId, box.id),
            eq(reservas.membresiaId, filaVigente.id),
            inArray(
              reservas.estado,
              ESTADOS_RESERVA_QUE_CONSUMEN_CREDITO as string[]
            )
          )
        );

      const fechasConsumidas = reservasMembresia.map((r) =>
        obtenerFechaLocal(r.claseInicio, box.timezone)
      );

      const disponibilidad = calcularDisponibilidadCreditos({
        modalidadCreditos: filaVigente.modalidadCreditos as ModalidadCreditos,
        creditosPorPeriodo: filaVigente.creditosPorPeriodo,
        creditosExtra: filaVigente.creditosExtra,
        fechasClasesConsumidas: fechasConsumidas,
        fechaClaseObjetivo: fechaLocal
      });

      const saldoVigente = saldoPorMembresia.get(filaVigente.id) ?? 0;

      membresiaVigente = {
        id: filaVigente.id,
        planNombre: filaVigente.planNombre,
        modalidadCreditos: filaVigente.modalidadCreditos as ModalidadCreditos,
        fechaInicio: filaVigente.fechaInicio,
        fechaFin: filaVigente.fechaFin,
        creditosPorPeriodo: filaVigente.creditosPorPeriodo,
        creditosDisponiblesPeriodo: disponibilidad.creditosRestantesPeriodo,
        creditosExtra: disponibilidad.creditosExtraRestantes,
        saldoPendiente: saldoVigente,
        esMoroso: saldoVigente > 0
      };
    }

    const proximasFilas = await tx
      .select({
        reservaId: reservas.id,
        claseId: clases.id,
        tipoClaseNombre: tiposClase.nombre,
        coachNombre: usuarios.nombre,
        inicio: clases.inicio,
        fin: clases.fin,
        cupos: clases.cupos
      })
      .from(reservas)
      .innerJoin(
        clases,
        and(eq(reservas.claseId, clases.id), eq(reservas.boxId, clases.boxId))
      )
      .innerJoin(
        tiposClase,
        and(
          eq(clases.tipoClaseId, tiposClase.id),
          eq(clases.boxId, tiposClase.boxId)
        )
      )
      .innerJoin(
        afiliaciones,
        and(
          eq(clases.coachAfiliacionId, afiliaciones.id),
          eq(clases.boxId, afiliaciones.boxId)
        )
      )
      .innerJoin(usuarios, eq(afiliaciones.usuarioId, usuarios.id))
      .where(
        and(
          eq(reservas.boxId, box.id),
          eq(reservas.afiliacionId, afiliacionId),
          eq(reservas.estado, "CONFIRMADA"),
          isNull(clases.deletedAt),
          isNull(clases.canceladaEn),
          gte(clases.fin, ahora)
        )
      )
      .orderBy(asc(clases.inicio))
      .limit(3);

    const claseIds = proximasFilas.map((r) => r.claseId);
    const conteoCupos =
      claseIds.length > 0
        ? await tx
            .select({
              claseId: reservas.claseId,
              total: sql<number>`COUNT(*)::int`
            })
            .from(reservas)
            .where(
              and(
                eq(reservas.boxId, box.id),
                inArray(reservas.claseId, claseIds),
                eq(reservas.estado, "CONFIRMADA")
              )
            )
            .groupBy(reservas.claseId)
        : [];

    const mapaCupos = new Map<string, number>();
    for (const c of conteoCupos) {
      mapaCupos.set(c.claseId, c.total);
    }

    const proximasReservas = proximasFilas.map((fila) => {
      const evaluacion = evaluarVentanaCancelacion({
        claseInicio: fila.inicio,
        ahora,
        ventanaCancelacionMinutos: box.ventanaCancelacionMinutos
      });
      const limiteSinCargo = new Date(
        fila.inicio.getTime() - box.ventanaCancelacionMinutos * 60 * 1000
      );

      return {
        reservaId: fila.reservaId,
        claseId: fila.claseId,
        tipoClaseNombre: fila.tipoClaseNombre,
        coachNombre: fila.coachNombre,
        inicio: fila.inicio.toISOString(),
        fin: fila.fin.toISOString(),
        cupos: fila.cupos,
        reservasConfirmadas: mapaCupos.get(fila.claseId) ?? 1,
        enCurso: fila.inicio <= ahora && fila.fin >= ahora,
        puedeCancelarSinCargo: evaluacion.permitida && !evaluacion.esTardia,
        horaLimiteSinCargo: formatearHoraLocal(limiteSinCargo, box.timezone)
      };
    });

    return {
      membresiaVigente,
      membresiaFutura: filaFutura
        ? {
            id: filaFutura.id,
            planNombre: filaFutura.planNombre,
            fechaInicio: filaFutura.fechaInicio,
            fechaFin: filaFutura.fechaFin
          }
        : null,
      esMoroso: saldoPendienteTotal > 0,
      saldoPendienteTotal,
      proximasReservas
    };
  }
}
