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
  ActualizarHorarioSchema,
  CrearHorarioSchema,
  type Horario
} from "@centris/shared";
import {
  ContextoBox,
  type ContextoBoxActivo
} from "../../common/decorators/contexto.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { validarConZod } from "../../common/pipes/zod-validation.pipe.js";
import { HorariosService } from "./horarios.service.js";

@Controller("horarios")
export class HorariosController {
  constructor(
    @Inject(HorariosService) private readonly horariosService: HorariosService
  ) {}

  @Get()
  @Roles("administrador", "recepcionista", "coach", "atleta")
  async listarHorarios(
    @ContextoBox() contexto: ContextoBoxActivo
  ): Promise<Horario[]> {
    return this.horariosService.listarHorarios(contexto.boxId);
  }

  @Get(":id")
  @Roles("administrador", "recepcionista", "coach", "atleta")
  async obtenerHorario(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string
  ): Promise<Horario> {
    return this.horariosService.obtenerHorarioPorId(contexto.boxId, id);
  }

  @Post()
  @Roles("administrador")
  async crearHorario(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Body() body: unknown
  ): Promise<Horario> {
    const input = validarConZod(CrearHorarioSchema, body);
    return this.horariosService.crearHorario(contexto.boxId, input);
  }

  @Patch(":id")
  @Roles("administrador")
  async actualizarHorario(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string,
    @Body() body: unknown
  ): Promise<Horario> {
    const input = validarConZod(ActualizarHorarioSchema, body);
    return this.horariosService.actualizarHorario(contexto.boxId, id, input);
  }

  @Delete(":id")
  @Roles("administrador")
  async eliminarHorario(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string
  ): Promise<{ success: boolean; id: string }> {
    return this.horariosService.eliminarHorario(contexto.boxId, id);
  }
}
