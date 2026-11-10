import { describe, expect, it } from "vitest";
import {
  calcularInstantesClase,
  CancelarClaseSchema,
  ClaseSchema,
  diaSemanaIso,
  EditarClaseSchema,
  FiltroClasesSchema,
  obtenerFechaLocal,
  sumarDiasAFecha
} from "../src/index.js";

const BUENOS_AIRES = "America/Argentina/Buenos_Aires";
const NUEVA_YORK = "America/New_York";

const UUID_CLASE = "77777777-7777-4777-8777-777777777777";
const UUID_BOX = "55555555-5555-4555-8555-555555555555";
const UUID_HORARIO = "66666666-6666-4666-8666-666666666666";
const UUID_TIPO_CLASE = "33333333-3333-4333-8333-333333333333";
const UUID_COACH = "44444444-4444-4444-8444-444444444444";

describe("Seam 1 — Esquemas Zod de Clases y edición puntual (@centris/shared)", () => {
  describe("ClaseSchema", () => {
    const claseValida = {
      id: UUID_CLASE,
      boxId: UUID_BOX,
      horarioId: UUID_HORARIO,
      tipoClaseId: UUID_TIPO_CLASE,
      coachAfiliacionId: UUID_COACH,
      inicio: "2026-11-09T10:00:00.000Z",
      fin: "2026-11-09T11:00:00.000Z",
      cupos: 12,
      canceladaEn: null,
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
      deletedAt: null
    };

    it("valida una Clase materializada desde un Horario", () => {
      expect(ClaseSchema.safeParse(claseValida).success).toBe(true);
    });

    it("admite una Clase sin Horario de origen (horarioId nulo)", () => {
      expect(
        ClaseSchema.safeParse({ ...claseValida, horarioId: null }).success
      ).toBe(true);
    });

    it("rechaza una Clase con cupos menores a 1", () => {
      expect(ClaseSchema.safeParse({ ...claseValida, cupos: 0 }).success).toBe(
        false
      );
    });
  });

  describe("EditarClaseSchema", () => {
    it("acepta cambiar solo el Coach por un suplente", () => {
      const parseado = EditarClaseSchema.safeParse({
        coachAfiliacionId: UUID_COACH
      });
      expect(parseado.success).toBe(true);
    });

    it("acepta cambiar solo los Cupos y coacciona strings numéricos", () => {
      const parseado = EditarClaseSchema.safeParse({ cupos: "15" });
      expect(parseado.success).toBe(true);
      if (parseado.success) {
        expect(parseado.data.cupos).toBe(15);
      }
    });

    it("acepta mover la Clase con un nuevo inicio ISO con offset y una duración", () => {
      const parseado = EditarClaseSchema.safeParse({
        inicio: "2026-11-13T19:30:00-03:00",
        duracionMinutos: 75
      });
      expect(parseado.success).toBe(true);
    });

    it("rechaza una edición vacía", () => {
      expect(EditarClaseSchema.safeParse({}).success).toBe(false);
    });

    it("rechaza cupos menores a 1 y duración menor a 1 minuto", () => {
      expect(EditarClaseSchema.safeParse({ cupos: 0 }).success).toBe(false);
      expect(EditarClaseSchema.safeParse({ duracionMinutos: 0 }).success).toBe(
        false
      );
    });

    it("rechaza un inicio que no es un instante ISO válido", () => {
      expect(
        EditarClaseSchema.safeParse({ inicio: "mañana a las 7" }).success
      ).toBe(false);
    });
  });

  describe("FiltroClasesSchema", () => {
    it("acepta un rango de fechas calendario locales", () => {
      expect(
        FiltroClasesSchema.safeParse({ desde: "2026-11-09", hasta: "2026-11-15" })
          .success
      ).toBe(true);
    });

    it("rechaza un rango invertido", () => {
      expect(
        FiltroClasesSchema.safeParse({ desde: "2026-11-15", hasta: "2026-11-09" })
          .success
      ).toBe(false);
    });

    it("permite filtrar por coachAfiliacionId opcional (Ticket 12)", () => {
      expect(
        FiltroClasesSchema.safeParse({
          coachAfiliacionId: "22222222-2222-4222-8222-222222222222"
        }).success
      ).toBe(true);
      expect(
        FiltroClasesSchema.safeParse({
          coachAfiliacionId: "no-es-uuid"
        }).success
      ).toBe(false);
    });
  });

  describe("CancelarClaseSchema y campos de cancelación en ClaseSchema (Ticket 10)", () => {
    it("acepta cancelar una Clase con motivo opcional o sin motivo", () => {
      const conMotivo = CancelarClaseSchema.safeParse({
        motivoCancelacion: "Corte de suministro eléctrico en el Box"
      });
      expect(conMotivo.success).toBe(true);

      const sinMotivo = CancelarClaseSchema.safeParse({});
      expect(sinMotivo.success).toBe(true);
    });

    it("rechaza un motivo de cancelación compuesto solo por espacios en blanco", () => {
      expect(
        CancelarClaseSchema.safeParse({ motivoCancelacion: "   " }).success
      ).toBe(false);
    });
  });
});

describe("Seam 1 — Cálculo de instantes de una Clase en la zona horaria del Box (@centris/shared)", () => {

  describe("calcularInstantesClase", () => {
    it("convierte lunes 07:00 hora local de Buenos Aires (UTC-3) a 10:00 UTC y fin a 11:00 UTC", () => {
      const { inicio, fin } = calcularInstantesClase({
        fechaLocal: "2026-11-09",
        horaInicio: "07:00",
        duracionMinutos: 60,
        timezone: BUENOS_AIRES
      });

      expect(inicio.toISOString()).toBe("2026-11-09T10:00:00.000Z");
      expect(fin.toISOString()).toBe("2026-11-09T11:00:00.000Z");
    });

    it("cruza el día UTC cuando la Clase local del domingo 22:30 cae el lunes 01:30 UTC", () => {
      const { inicio, fin } = calcularInstantesClase({
        fechaLocal: "2026-11-08",
        horaInicio: "22:30",
        duracionMinutos: 90,
        timezone: BUENOS_AIRES
      });

      expect(inicio.toISOString()).toBe("2026-11-09T01:30:00.000Z");
      expect(fin.toISOString()).toBe("2026-11-09T03:00:00.000Z");
    });

    it("respeta el cambio de offset por horario de verano: misma hora local, distinto instante UTC", () => {
      const antesDelCambio = calcularInstantesClase({
        fechaLocal: "2026-03-07",
        horaInicio: "07:00",
        duracionMinutos: 60,
        timezone: NUEVA_YORK
      });
      const despuesDelCambio = calcularInstantesClase({
        fechaLocal: "2026-03-09",
        horaInicio: "07:00",
        duracionMinutos: 60,
        timezone: NUEVA_YORK
      });

      expect(antesDelCambio.inicio.toISOString()).toBe(
        "2026-03-07T12:00:00.000Z"
      );
      expect(despuesDelCambio.inicio.toISOString()).toBe(
        "2026-03-09T11:00:00.000Z"
      );
    });

    it("rechaza una zona horaria que no es IANA", () => {
      expect(() =>
        calcularInstantesClase({
          fechaLocal: "2026-11-09",
          horaInicio: "07:00",
          duracionMinutos: 60,
          timezone: "Marte/Olympus"
        })
      ).toThrow();
    });
  });

  describe("Utilidades de calendario local para materialización", () => {
    it("diaSemanaIso devuelve 1 para lunes y 7 para domingo", () => {
      expect(diaSemanaIso("2026-11-09")).toBe(1); // Lunes
      expect(diaSemanaIso("2026-11-15")).toBe(7); // Domingo
      expect(diaSemanaIso("2026-11-13")).toBe(5); // Viernes
    });

    it("obtenerFechaLocal convierte un instante UTC a fecha calendario en la zona horaria del Box", () => {
      // 2026-11-09 01:30 UTC es todavía domingo 2026-11-08 22:30 en Buenos Aires (UTC-3)
      const instante = new Date("2026-11-09T01:30:00.000Z");
      expect(obtenerFechaLocal(instante, BUENOS_AIRES)).toBe("2026-11-08");
    });

    it("sumarDiasAFecha suma días respetando el calendario ISO", () => {
      expect(sumarDiasAFecha("2026-11-09", 7)).toBe("2026-11-16");
      expect(sumarDiasAFecha("2026-11-28", 3)).toBe("2026-12-01");
    });
  });
});
