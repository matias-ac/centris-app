import { Body, Controller, Get, Inject, Put } from "@nestjs/common";
import {
  ActualizarConfiguracionBoxSchema,
  type Box
} from "@centris/shared";
import {
  ContextoBox,
  type ContextoBoxActivo
} from "../../common/decorators/contexto.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { validarConZod } from "../../common/pipes/zod-validation.pipe.js";
import { BoxesService } from "./boxes.service.js";

@Controller("boxes")
export class BoxesController {
  constructor(
    @Inject(BoxesService) private readonly boxesService: BoxesService
  ) {}

  @Get("configuracion")
  @Roles("administrador", "recepcionista", "coach", "atleta")
  async obtenerConfiguracion(
    @ContextoBox() contexto: ContextoBoxActivo
  ): Promise<Box> {
    return this.boxesService.obtenerConfiguracionBox(contexto.boxId);
  }

  @Put("configuracion")
  @Roles("administrador")
  async actualizarConfiguracion(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Body() body: unknown
  ): Promise<Box> {
    const input = validarConZod(ActualizarConfiguracionBoxSchema, body);
    return this.boxesService.actualizarConfiguracionBox(contexto.boxId, input);
  }
}
