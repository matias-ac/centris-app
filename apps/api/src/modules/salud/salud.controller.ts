import { Controller, Get, Headers, Inject, Query } from "@nestjs/common";
import type { EstadoSalud } from "@centris/shared";
import { Public } from "../../common/decorators/public.decorator.js";
import { SaludService } from "./salud.service.js";

@Public()
@Controller("salud")
export class SaludController {
  constructor(
    @Inject(SaludService) private readonly saludService: SaludService
  ) {}

  @Get()
  async obtenerSalud(
    @Query("boxId") queryBoxId?: string,
    @Headers("x-box-id") headerBoxId?: string
  ): Promise<EstadoSalud> {
    const boxId = queryBoxId ?? headerBoxId;
    return this.saludService.obtenerDiagnosticoSalud(boxId);
  }
}
