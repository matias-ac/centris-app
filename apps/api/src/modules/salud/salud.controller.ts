import { Controller, Get, Headers, Inject, Query } from "@nestjs/common";
import type { EstadoSalud } from "@centris/shared";
import { DatabaseService } from "../../database/database.service.js";

@Controller("salud")
export class SaludController {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  @Get()
  async obtenerSalud(
    @Query("boxId") queryBoxId?: string,
    @Headers("x-box-id") headerBoxId?: string
  ): Promise<EstadoSalud> {
    const boxId = queryBoxId ?? headerBoxId;
    return this.db.obtenerDiagnosticoSalud(boxId);
  }
}
