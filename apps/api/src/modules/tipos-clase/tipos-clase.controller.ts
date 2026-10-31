import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post
} from "@nestjs/common";
import {
  ActualizarTipoClaseSchema,
  CrearTipoClaseSchema,
  type TipoClase
} from "@centris/shared";
import {
  ContextoBox,
  type ContextoBoxActivo
} from "../../common/decorators/contexto.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { validarConZod } from "../../common/pipes/zod-validation.pipe.js";
import { TiposClaseService } from "./tipos-clase.service.js";

@Controller("tipos-clase")
export class TiposClaseController {
  constructor(
    @Inject(TiposClaseService)
    private readonly tiposClaseService: TiposClaseService
  ) {}

  @Get()
  @Roles("administrador", "recepcionista", "coach", "atleta")
  async listarTiposClase(
    @ContextoBox() contexto: ContextoBoxActivo
  ): Promise<TipoClase[]> {
    return this.tiposClaseService.listarTiposClase(
      contexto.boxId,
      contexto.roles
    );
  }

  @Get(":id")
  @Roles("administrador", "recepcionista", "coach", "atleta")
  async obtenerTipoClase(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string
  ): Promise<TipoClase> {
    return this.tiposClaseService.obtenerTipoClasePorId(contexto.boxId, id);
  }

  @Post()
  @Roles("administrador")
  async crearTipoClase(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Body() body: unknown
  ): Promise<TipoClase> {
    const input = validarConZod(CrearTipoClaseSchema, body);
    return this.tiposClaseService.crearTipoClase(contexto.boxId, input);
  }

  @Patch(":id")
  @Roles("administrador")
  async actualizarTipoClase(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string,
    @Body() body: unknown
  ): Promise<TipoClase> {
    const input = validarConZod(ActualizarTipoClaseSchema, body);
    return this.tiposClaseService.actualizarTipoClase(
      contexto.boxId,
      id,
      input
    );
  }

  @Delete(":id")
  @Roles("administrador")
  async eliminarTipoClase(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string
  ): Promise<{ success: boolean; id: string }> {
    return this.tiposClaseService.eliminarTipoClase(contexto.boxId, id);
  }
}
