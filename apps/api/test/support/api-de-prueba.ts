import "reflect-metadata";
import type { AddressInfo } from "node:net";
import { type INestApplication, Module, type Type } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../src/app.module.js";
import { configurarApp } from "../../src/app.setup.js";

export interface ApiDePrueba {
  url: string;
  pedir: (
    ruta: string,
    opciones?: {
      method?: string;
      token?: string;
      boxId?: string;
      body?: unknown;
    }
  ) => Promise<{ status: number; body: any }>;
  cerrar: () => Promise<void>;
}

/**
 * Levanta la API NestJS real (AppModule + guards globales + filtro de errores)
 * sobre un puerto efímero, conectada a PostgreSQL real con el rol sin BYPASSRLS.
 */
export async function levantarApiDePrueba(
  controladoresExtra: Type[] = []
): Promise<ApiDePrueba> {
  @Module({ imports: [AppModule], controllers: controladoresExtra })
  class ModuloDePrueba {}

  const app: INestApplication = await NestFactory.create(ModuloDePrueba, {
    logger: false
  });
  configurarApp(app);
  await app.listen(0, "127.0.0.1");
  const { port } = app.getHttpServer().address() as AddressInfo;
  const url = `http://127.0.0.1:${port}/api`;

  return {
    url,
    async pedir(ruta, opciones = {}) {
      const headers: Record<string, string> = {};
      if (opciones.token) headers.authorization = `Bearer ${opciones.token}`;
      if (opciones.boxId) headers["x-box-id"] = opciones.boxId;
      if (opciones.body !== undefined) {
        headers["content-type"] = "application/json";
      }
      const response = await fetch(`${url}${ruta}`, {
        method: opciones.method ?? "GET",
        headers,
        body:
          opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined
      });
      const texto = await response.text();
      return {
        status: response.status,
        body: texto ? JSON.parse(texto) : null
      };
    },
    cerrar: () => app.close()
  };
}
