import type { INestApplication } from "@nestjs/common";
import { DomainExceptionFilter } from "./common/filters/domain-exception.filter.js";

export function configurarApp(app: INestApplication): void {
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new DomainExceptionFilter());

  const envOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
    : ["http://localhost:3000"];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      if (!origin) {
        return callback(null, true);
      }

      const esOrigenPermitido =
        envOrigins.includes("*") ||
        envOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:");

      if (esOrigenPermitido) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true
  });
}
