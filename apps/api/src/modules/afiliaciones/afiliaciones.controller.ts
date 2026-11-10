import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch
} from "@nestjs/common";
import {
  ActualizarRolesAfiliacionSchema,
  type Afiliacion,
  type AfiliacionConBox,
  type AfiliacionConUsuario
} from "@centris/shared";
import {
  ContextoBox,
  UsuarioActual,
  type ContextoBoxActivo,
  type UsuarioAutenticado
} from "../../common/decorators/contexto.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { validarConZod } from "../../common/pipes/zod-validation.pipe.js";
import { AfiliacionesService } from "./afiliaciones.service.js";

@Controller("afiliaciones")
export class AfiliacionesController {
  constructor(
    @Inject(AfiliacionesService)
    private readonly afiliacionesService: AfiliacionesService
  ) {}

  @Get("mias")
  async obtenerMisAfiliaciones(
    @UsuarioActual() usuario: UsuarioAutenticado
  ): Promise<AfiliacionConBox[]> {
    return this.afiliacionesService.listarMisAfiliaciones(usuario.id);
  }

  @Get()
  @Roles("administrador")
  async listarAfiliacionesBox(
    @ContextoBox() contexto: ContextoBoxActivo
  ): Promise<AfiliacionConUsuario[]> {
    return this.afiliacionesService.listarAfiliacionesDelBox(contexto.boxId);
  }

  @Patch(":id")
  @Roles("administrador")
  async actualizarRoles(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string,
    @Body() body: unknown
  ): Promise<Afiliacion> {
    const input = validarConZod(ActualizarRolesAfiliacionSchema, body);
    return this.afiliacionesService.actualizarRolesAfiliacion(
      contexto.boxId,
      id,
      input
    );
  }

  @Delete(":id")
  @Roles("administrador")
  async eliminarAfiliacion(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string
  ): Promise<{ eliminada: boolean; id: string }> {
    return this.afiliacionesService.eliminarAfiliacionSoftDelete(
      contexto.boxId,
      id
    );
  }
}

