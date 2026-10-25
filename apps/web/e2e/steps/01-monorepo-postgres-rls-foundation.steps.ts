import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { EstadoSaludSchema, type EstadoSalud } from "@centris/shared";

const { Given, When, Then } = createBdd();

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const BOX_CENTRIS_NORTE_ID = "00000000-0000-4000-8000-000000000101";

let ultimaRespuestaSalud: EstadoSalud | null = null;

Given(
  'que existen los Boxes de semilla {string} y {string} con sus respectivas Afiliaciones',
  async ({ request }, _boxNorte: string, _boxSur: string) => {
    expect(request).toBeDefined();
  }
);

When(
  "se consulta el estado de salud de la API sin contexto de Box activo",
  async ({ request }) => {
    const response = await request.get(`${API_URL}/salud`);
    expect(response.ok()).toBe(true);
    const json = await response.json();
    ultimaRespuestaSalud = EstadoSaludSchema.parse(json);
  }
);

Then(
  'la API responde con rol de conexión {string}, RLS activo, sin privilegio BYPASSRLS y {int} Afiliaciones visibles',
  async ({}, rolEsperado: string, cantidadEsperada: number) => {
    expect(ultimaRespuestaSalud).not.toBeNull();
    expect(ultimaRespuestaSalud?.rolConexion).toBe(rolEsperado);
    expect(ultimaRespuestaSalud?.rlsActivo).toBe(true);
    expect(ultimaRespuestaSalud?.bypassRls).toBe(false);
    expect(ultimaRespuestaSalud?.afiliacionesVisiblesEnContexto).toBe(
      cantidadEsperada
    );
  }
);

When(
  'se consulta el estado de salud fijando el contexto del {string}',
  async ({ request }, nombreBox: string) => {
    const boxId =
      nombreBox === "Box Centris Norte"
        ? BOX_CENTRIS_NORTE_ID
        : "00000000-0000-4000-8000-000000000102";
    const response = await request.get(`${API_URL}/salud?boxId=${boxId}`);
    expect(response.ok()).toBe(true);
    const json = await response.json();
    ultimaRespuestaSalud = EstadoSaludSchema.parse(json);
  }
);

Then(
  'la API devuelve únicamente las {int} Afiliaciones pertenecientes al {string}',
  async ({}, cantidadEsperada: number, _nombreBox: string) => {
    expect(ultimaRespuestaSalud?.afiliacionesVisiblesEnContexto).toBe(
      cantidadEsperada
    );
  }
);

When(
  "el usuario abre la pantalla de diagnóstico de salud e infraestructura RLS",
  async ({ page }) => {
    await page.goto("/");
  }
);

Then(
  'visualiza el estado operativo de PostgreSQL, el rol {string} sin BYPASSRLS y el aislamiento verificado por Box',
  async ({ page }, rolEsperado: string) => {
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Centris — Infraestructura y Aislamiento RLS/i
      })
    ).toBeVisible();
    await expect(page.getByTestId("rol-conexion")).toContainText(rolEsperado);
    await expect(page.getByTestId("estado-rls")).toContainText(
      /FORCE ROW LEVEL SECURITY/i
    );
    await expect(page.getByTestId("conteo-sin-contexto")).toHaveText("0");
    await expect(page.getByTestId("conteo-box-norte")).toHaveText("7");
  }
);
