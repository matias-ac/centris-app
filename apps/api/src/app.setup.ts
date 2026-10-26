import type { INestApplication } from "@nestjs/common";
import { DomainExceptionFilter } from "./common/filters/domain-exception.filter.js";

export function configurarApp(app: INestApplication): void {
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new DomainExceptionFilter());
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true
  });
}
