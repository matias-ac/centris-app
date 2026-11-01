import { describe, expect, it } from "vitest";
import {
  ActualizarHorarioSchema,
  ActualizarTipoClaseSchema,
  CrearHorarioSchema,
  CrearTipoClaseSchema,
  DIAS_SEMANA,
  HorarioSchema,
  NOMBRES_DIAS_SEMANA,
  TipoClaseSchema
} from "../src/index.js";

const UUID_TIPO_CLASE = "33333333-3333-4333-8333-333333333333";
const UUID_COACH_AFILIACION = "44444444-4444-4444-8444-444444444444";
const UUID_BOX = "55555555-5555-4555-8555-555555555555";
const UUID_HORARIO = "66666666-6666-4666-8666-666666666666";

describe("Seam 1 — Esquemas Zod y Contratos de Dominio de Tipos de Clase y Horarios (@centris/shared)", () => {
  describe("Constantes de Dominio para Días de la Semana", () => {
    it("define los días del 1 (Lunes) al 7 (Domingo) según ISO", () => {
      expect(DIAS_SEMANA).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(NOMBRES_DIAS_SEMANA[1]).toBe("Lunes");
      expect(NOMBRES_DIAS_SEMANA[7]).toBe("Domingo");
    });
  });

  describe("TipoClase schemas", () => {
    it("valida un Tipo de Clase completo", () => {
      const tipo = {
        id: UUID_TIPO_CLASE,
        boxId: UUID_BOX,
        nombre: "WOD",
        descripcion: "Workout of the Day",
        activo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null
      };
      const parseado = TipoClaseSchema.safeParse(tipo);
      expect(parseado.success).toBe(true);
    });

    it("CrearTipoClaseSchema exige nombre no vacío y recortado", () => {
      const valido = CrearTipoClaseSchema.safeParse({
        nombre: "  Halterofilia  ",
        descripcion: "Técnica de levantamiento olímpico"
      });
      expect(valido.success).toBe(true);
      if (valido.success) {
        expect(valido.data.nombre).toBe("Halterofilia");
      }

      const invalido = CrearTipoClaseSchema.safeParse({
        nombre: "   "
      });
      expect(invalido.success).toBe(false);
    });

    it("ActualizarTipoClaseSchema permite actualización parcial", () => {
      const parcial = ActualizarTipoClaseSchema.safeParse({
        activo: false
      });
      expect(parcial.success).toBe(true);
    });
  });

  describe("Horario schemas", () => {
    it("valida un Horario completo", () => {
      const horario = {
        id: UUID_HORARIO,
        boxId: UUID_BOX,
        tipoClaseId: UUID_TIPO_CLASE,
        coachAfiliacionId: UUID_COACH_AFILIACION,
        diaSemana: 1,
        horaInicio: "07:00",
        duracionMinutos: 60,
        cuposDefault: 15,
        activo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null
      };
      const parseado = HorarioSchema.safeParse(horario);
      expect(parseado.success).toBe(true);
    });

    it("CrearHorarioSchema valida los rangos de día_semana (1 a 7)", () => {
      for (let dia = 1; dia <= 7; dia++) {
        const resultado = CrearHorarioSchema.safeParse({
          tipoClaseId: UUID_TIPO_CLASE,
          coachAfiliacionId: UUID_COACH_AFILIACION,
          diaSemana: dia,
          horaInicio: "08:30",
          duracionMinutos: 60,
          cuposDefault: 20
        });
        expect(resultado.success, `dia ${dia}`).toBe(true);
      }

      for (const diaInvalido of [0, 8, -1, 1.5]) {
        const resultado = CrearHorarioSchema.safeParse({
          tipoClaseId: UUID_TIPO_CLASE,
          coachAfiliacionId: UUID_COACH_AFILIACION,
          diaSemana: diaInvalido,
          horaInicio: "08:30",
          duracionMinutos: 60,
          cuposDefault: 20
        });
        expect(resultado.success, `dia invalido ${diaInvalido}`).toBe(false);
      }
    });

    it("valida el formato de hora_inicio local como HH:mm (24hs)", () => {
      for (const horaValida of ["00:00", "07:30", "12:00", "20:45", "23:59"]) {
        const resultado = CrearHorarioSchema.safeParse({
          tipoClaseId: UUID_TIPO_CLASE,
          coachAfiliacionId: UUID_COACH_AFILIACION,
          diaSemana: 2,
          horaInicio: horaValida,
          duracionMinutos: 45,
          cuposDefault: 12
        });
        expect(resultado.success, `hora valida ${horaValida}`).toBe(true);
      }

      for (const horaInvalida of ["24:00", "07:60", "7:00", "08:5", "invalid", ""]) {
        const resultado = CrearHorarioSchema.safeParse({
          tipoClaseId: UUID_TIPO_CLASE,
          coachAfiliacionId: UUID_COACH_AFILIACION,
          diaSemana: 2,
          horaInicio: horaInvalida,
          duracionMinutos: 45,
          cuposDefault: 12
        });
        expect(resultado.success, `hora invalida ${horaInvalida}`).toBe(false);
      }
    });

    it("exige duracionMinutos > 0 y cuposDefault > 0", () => {
      const duracionCero = CrearHorarioSchema.safeParse({
        tipoClaseId: UUID_TIPO_CLASE,
        coachAfiliacionId: UUID_COACH_AFILIACION,
        diaSemana: 3,
        horaInicio: "09:00",
        duracionMinutos: 0,
        cuposDefault: 10
      });
      expect(duracionCero.success).toBe(false);

      const cuposNegativos = CrearHorarioSchema.safeParse({
        tipoClaseId: UUID_TIPO_CLASE,
        coachAfiliacionId: UUID_COACH_AFILIACION,
        diaSemana: 3,
        horaInicio: "09:00",
        duracionMinutos: 60,
        cuposDefault: -5
      });
      expect(cuposNegativos.success).toBe(false);
    });

    it("ActualizarHorarioSchema permite modificar parcialmente campos", () => {
      const parcial = ActualizarHorarioSchema.safeParse({
        cuposDefault: 18,
        horaInicio: "18:00"
      });
      expect(parcial.success).toBe(true);
    });
  });
});
