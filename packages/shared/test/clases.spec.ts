import { describe, expect, it } from "vitest";
import { calcularInstantesClase } from "../src/index.js";

const BUENOS_AIRES = "America/Argentina/Buenos_Aires";
const NUEVA_YORK = "America/New_York";

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
});
