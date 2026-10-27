import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import {
  ActualizarAtletaSchema,
  CrearAtletaSchema,
  FiltroAtletasSchema,
  type Atleta
} from "@centris/shared";
import {
  ContextoBox,
  type ContextoBoxActivo
} from "../../common/decorators/contexto.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { validarConZod } from "../../common/pipes/zod-validation.pipe.js";
import { AtletasService } from "./atletas.service.js";

@Controller("atletas")
export class AtletasController {
  constructor(
    @Inject(AtletasService) private readonly atletasService: AtletasService
  ) {}

  @Get()
  @Roles("administrador", "recepcionista")
  async listarAtletas(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Query() query: unknown
  ): Promise<Atleta[]> {
    const filtro = validarConZod(FiltroAtletasSchema, query);
    return this.atletasService.listarAtletas(contexto.boxId, filtro);
  }

  @Get(":id")
  @Roles("administrador", "recepcionista")
  async obtenerAtleta(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string
  ): Promise<Atleta> {
    return this.atletasService.obtenerAtletaPorId(contexto.boxId, id);
  }

  @Post()
  @Roles("administrador", "recepcionista")
  async crearAtleta(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Body() body: unknown
  ): Promise<Atleta> {
    const input = validarConZod(CrearAtletaSchema, body);
    return this.atletasService.crearAtleta(contexto.boxId, input);
  }

  @Patch(":id")
  @Roles("administrador", "recepcionista")
  async actualizarAtleta(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string,
    @Body() body: unknown
  ): Promise<Atleta> {
    const input = validarConZod(ActualizarAtletaSchema, body);
    return this.atletasService.actualizarAtleta(contexto.boxId, id, input);
  }

  @Delete(":id")
  @Roles("administrador", "recepcionista")
  async eliminarAtleta(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string
  ): Promise<{ eliminada: boolean; id: string }> {
    return this.atletasService.eliminarAtletaSoftDelete(contexto.boxId, id);
  }
}
