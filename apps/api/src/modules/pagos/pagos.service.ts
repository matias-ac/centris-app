import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  calcularSaldoMembresia,
  determinarEstadoMoroso,
  type AnularPago,
  type CrearPago,
  type FiltroMorosos,
  type Moroso,
  type Pago,
  type PagoConRegistrador
} from "@centris/shared";
import { and, desc, eq, isNull } from "drizzle-orm";
import { DomainException } from "../../common/errors/domain.exception.js";
import {
  DatabaseService,
  UUID_REGEX
} from "../../database/database.service.js";
import {
  afiliaciones,
  membresias,
  pagos,
  planes,
  usuarios
} from "../../database/schema/index.js";

function mapearPago(fila: typeof pagos.$inferSelect): Pago {
  return {
    id: fila.id,
    boxId: fila.boxId,
    membresiaId: fila.membresiaId,
    monto: fila.monto,
    medioPago: fila.medioPago as Pago["medioPago"],
    fechaPago: fila.fechaPago,
    registradoPorUsuarioId: fila.registradoPorUsuarioId,
    anuladoEn: fila.anuladoEn ? fila.anuladoEn.toISOString() : null,
    anuladoPorUsuarioId: fila.anuladoPorUsuarioId,
    motivoAnulacion: fila.motivoAnulacion,
    createdAt: fila.createdAt.toISOString()
  };
}

function exigirUuid(id: string, nombreCampo: string): void {
  if (!UUID_REGEX.test(id)) {
    throw new DomainException(
      ERROR_CODES.VALIDACION_FALLIDA,
      `El identificador ${nombreCampo} no es un UUID válido.`,
      HttpStatus.BAD_REQUEST,
      { [nombreCampo]: ["UUID inválido"] }
    );
  }
}

@Injectable()
export class PagosService {
  constructor(
    @Inject(DatabaseService)
    private readonly db: DatabaseService
  ) {}

  async registrarPago(
    boxId: string,
    registradoPorUsuarioId: string,
    input: CrearPago
  ): Promise<Pago> {
    exigirUuid(input.membresiaId, "membresiaId");

    return this.db.withBoxTransaction(boxId, async (tx) => {
      const [membresia] = await tx
        .select()
        .from(membresias)
        .where(
          and(
            eq(membresias.id, input.membresiaId),
            eq(membresias.boxId, boxId),
            isNull(membresias.deletedAt)
          )
        );

      if (!membresia) {
        throw new DomainException(
          ERROR_CODES.VALIDACION_FALLIDA,
          "Membresía no encontrada en el Box activo.",
          HttpStatus.NOT_FOUND,
          { membresiaId: ["Membresía inexistente en este Box"] }
        );
      }

      const [insertado] = await tx
        .insert(pagos)
        .values({
          boxId,
          membresiaId: input.membresiaId,
          monto: input.monto,
          medioPago: input.medioPago,
          fechaPago: input.fechaPago,
          registradoPorUsuarioId
        })
        .returning();

      if (!insertado) {
        throw new DomainException(
          ERROR_CODES.ERROR_INTERNO,
          "No se pudo registrar el Pago en la base de datos.",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      return mapearPago(insertado);
    });
  }

  async anularPago(
    boxId: string,
    pagoId: string,
    anuladoPorUsuarioId: string,
    input: AnularPago
  ): Promise<Pago> {
    exigirUuid(pagoId, "pagoId");

    return this.db.withBoxTransaction(boxId, async (tx) => {
      const [pagoExistente] = await tx
        .select()
        .from(pagos)
        .where(and(eq(pagos.id, pagoId), eq(pagos.boxId, boxId)));

      if (!pagoExistente) {
        throw new DomainException(
          ERROR_CODES.VALIDACION_FALLIDA,
          "Pago no encontrado en el Box activo.",
          HttpStatus.NOT_FOUND,
          { pagoId: ["Pago inexistente"] }
        );
      }

      if (pagoExistente.anuladoEn !== null) {
        throw new DomainException(
          ERROR_CODES.PAGO_YA_ANULADO,
          "El pago ya fue anulado previamente.",
          HttpStatus.CONFLICT,
          { pagoId: ["El pago ya se encuentra anulado"] }
        );
      }

      const [actualizado] = await tx
        .update(pagos)
        .set({
          anuladoEn: new Date(),
          anuladoPorUsuarioId,
          motivoAnulacion: input.motivoAnulacion
        })
        .where(and(eq(pagos.id, pagoId), eq(pagos.boxId, boxId)))
        .returning();

      if (!actualizado) {
        throw new DomainException(
          ERROR_CODES.ERROR_INTERNO,
          "No se pudo anular el Pago.",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      return mapearPago(actualizado);
    });
  }

  async obtenerEstadoMembresia(
    boxId: string,
    membresiaId: string
  ): Promise<{
    membresiaId: string;
    precio: number;
    pagos: PagoConRegistrador[];
    totalPagado: number;
    saldo: number;
    esMoroso: boolean;
  }> {
    exigirUuid(membresiaId, "membresiaId");

    return this.db.withBoxTransaction(boxId, async (tx) => {
      const [membresia] = await tx
        .select()
        .from(membresias)
        .where(
          and(
            eq(membresias.id, membresiaId),
            eq(membresias.boxId, boxId),
            isNull(membresias.deletedAt)
          )
        );

      if (!membresia) {
        throw new DomainException(
          ERROR_CODES.VALIDACION_FALLIDA,
          "Membresía no encontrada en el Box activo.",
          HttpStatus.NOT_FOUND,
          { membresiaId: ["Membresía inexistente en este Box"] }
        );
      }

      const filasPagos = await tx
        .select({
          pago: pagos,
          registradorNombre: usuarios.nombre
        })
        .from(pagos)
        .innerJoin(
          usuarios,
          eq(pagos.registradoPorUsuarioId, usuarios.id)
        )
        .where(and(eq(pagos.membresiaId, membresiaId), eq(pagos.boxId, boxId)))
        .orderBy(desc(pagos.createdAt));

      const listaPagos: PagoConRegistrador[] = filasPagos.map((fila) => ({
        ...mapearPago(fila.pago),
        registradoPorNombre: fila.registradorNombre
      }));

      const saldo = calcularSaldoMembresia(membresia.precio, listaPagos);
      const totalPagado = listaPagos
        .filter((p) => !p.anuladoEn)
        .reduce((acc, p) => acc + p.monto, 0);

      return {
        membresiaId: membresia.id,
        precio: membresia.precio,
        pagos: listaPagos,
        totalPagado,
        saldo,
        esMoroso: determinarEstadoMoroso(saldo)
      };
    });
  }

  async listarMorosos(
    boxId: string,
    filtro?: FiltroMorosos
  ): Promise<Moroso[]> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      // 1. Obtener todas las membresías activas del Box con su Plan y Afiliación
      const filasMembresias = await tx
        .select({
          membresia: membresias,
          nombrePlan: planes.nombre,
          afiliacion: afiliaciones,
          usuario: usuarios
        })
        .from(membresias)
        .innerJoin(planes, eq(membresias.planId, planes.id))
        .innerJoin(afiliaciones, eq(membresias.afiliacionId, afiliaciones.id))
        .innerJoin(usuarios, eq(afiliaciones.usuarioId, usuarios.id))
        .where(
          and(
            eq(membresias.boxId, boxId),
            isNull(membresias.deletedAt),
            eq(afiliaciones.activo, true),
            isNull(afiliaciones.deletedAt)
          )
        );

      if (filasMembresias.length === 0) {
        return [];
      }

      // 2. Obtener todos los pagos del Box
      const todosLosPagos = await tx
        .select()
        .from(pagos)
        .where(eq(pagos.boxId, boxId));

      const pagosPorMembresia = new Map<string, typeof todosLosPagos>();
      for (const p of todosLosPagos) {
        const lista = pagosPorMembresia.get(p.membresiaId) ?? [];
        lista.push(p);
        pagosPorMembresia.set(p.membresiaId, lista);
      }

      // 3. Agrupar por Atleta/Afiliación y calcular saldos
      const atletasMorososMap = new Map<string, Moroso>();

      for (const fila of filasMembresias) {
        const pagosMembresia = pagosPorMembresia.get(fila.membresia.id) ?? [];
        const saldoMembresia = calcularSaldoMembresia(
          fila.membresia.precio,
          pagosMembresia
        );

        if (saldoMembresia > 0) {
          const totalPagado = pagosMembresia
            .filter((p) => p.anuladoEn === null)
            .reduce((acc, p) => acc + p.monto, 0);

          let moroso = atletasMorososMap.get(fila.afiliacion.id);
          if (!moroso) {
            moroso = {
              afiliacionId: fila.afiliacion.id,
              usuarioId: fila.usuario.id,
              nombre: fila.usuario.nombre,
              email: fila.usuario.email,
              totalDeuda: 0,
              membresiasConDeuda: []
            };
            atletasMorososMap.set(fila.afiliacion.id, moroso);
          }

          moroso.totalDeuda += saldoMembresia;
          moroso.membresiasConDeuda.push({
            membresiaId: fila.membresia.id,
            nombrePlan: fila.nombrePlan,
            precio: fila.membresia.precio,
            totalPagado,
            saldo: saldoMembresia,
            fechaInicio: fila.membresia.fechaInicio,
            fechaFin: fila.membresia.fechaFin
          });
        }
      }

      let listaMorosos = Array.from(atletasMorososMap.values());

      if (filtro?.busqueda) {
        const termino = filtro.busqueda.toLowerCase();
        listaMorosos = listaMorosos.filter(
          (m) =>
            m.nombre.toLowerCase().includes(termino) ||
            m.email.toLowerCase().includes(termino)
        );
      }

      // Ordenar por mayor deuda primero
      listaMorosos.sort((a, b) => b.totalDeuda - a.totalDeuda);

      return listaMorosos;
    });
  }

  async listarPagosAuditoria(
    boxId: string,
    limite = 100
  ): Promise<PagoConRegistrador[]> {
    return this.db.withBoxTransaction(boxId, async (tx) => {
      const filas = await tx
        .select({
          pago: pagos,
          registradorNombre: usuarios.nombre
        })
        .from(pagos)
        .innerJoin(
          usuarios,
          eq(pagos.registradoPorUsuarioId, usuarios.id)
        )
        .where(eq(pagos.boxId, boxId))
        .orderBy(desc(pagos.createdAt))
        .limit(limite);

      return filas.map((f) => ({
        ...mapearPago(f.pago),
        registradoPorNombre: f.registradorNombre
      }));
    });
  }
}
