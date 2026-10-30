import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query
} from "@nestjs/common";
import {
  CrearMembresiaSchema,
  FiltroMembresiasSchema,
  type Membresia
} from "@centris/shared";
import {
  ContextoBox,
  type ContextoBoxActivo
} from "../../common/decorators/contexto.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { validarConZod } from "../../common/pipes/zod-validation.pipe.js";
import { MembresiasService } from "./membresias.service.js";

@Controller("membresias")
export class MembresiasController {
  constructor(
    @Inject(MembresiasService)
    private readonly membresiasService: MembresiasService
  ) {}

  @Get()
  @Roles("administrador", "recepcionista")
  async listarMembresias(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Query() query: unknown
  ): Promise<Membresia[]> {
    const filtro = validarConZod(FiltroMembresiasSchema, query);
    return this.membresiasService.listarMembresias(contexto.boxId, filtro);
  }

  @Post()
  @Roles("administrador", "recepcionista")
  async crearMembresia(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Body() body: unknown
  ): Promise<Membresia> {
    const input = validarConZod(CrearMembresiaSchema, body);
    return this.membresiasService.crearMembresia(contexto.boxId, input);
  }
}
