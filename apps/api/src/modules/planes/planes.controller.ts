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
  ActualizarPlanSchema,
  CrearPlanSchema,
  type Plan
} from "@centris/shared";
import {
  ContextoBox,
  type ContextoBoxActivo
} from "../../common/decorators/contexto.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { validarConZod } from "../../common/pipes/zod-validation.pipe.js";
import { PlanesService } from "./planes.service.js";

@Controller("planes")
export class PlanesController {
  constructor(
    @Inject(PlanesService) private readonly planesService: PlanesService
  ) {}

  @Get()
  @Roles("administrador", "recepcionista")
  async listarPlanes(
    @ContextoBox() contexto: ContextoBoxActivo
  ): Promise<Plan[]> {
    return this.planesService.listarPlanes(contexto.boxId, contexto.roles);
  }

  @Get(":id")
  @Roles("administrador", "recepcionista")
  async obtenerPlan(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string
  ): Promise<Plan> {
    return this.planesService.obtenerPlanPorId(contexto.boxId, id);
  }

  @Post()
  @Roles("administrador")
  async crearPlan(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Body() body: unknown
  ): Promise<Plan> {
    const input = validarConZod(CrearPlanSchema, body);
    return this.planesService.crearPlan(contexto.boxId, input);
  }

  @Patch(":id")
  @Roles("administrador")
  async actualizarPlan(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string,
    @Body() body: unknown
  ): Promise<Plan> {
    const input = validarConZod(ActualizarPlanSchema, body);
    return this.planesService.actualizarPlan(contexto.boxId, id, input);
  }

  @Delete(":id")
  @Roles("administrador")
  async eliminarPlan(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string
  ): Promise<{ success: boolean; id: string }> {
    return this.planesService.eliminarPlan(contexto.boxId, id);
  }
}
