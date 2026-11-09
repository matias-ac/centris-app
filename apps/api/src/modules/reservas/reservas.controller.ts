import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query
} from "@nestjs/common";
import {
  CrearReservaSchema,
  FiltroReservasSchema,
  type Reserva
} from "@centris/shared";
import {
  ContextoBox,
  UsuarioActual,
  type ContextoBoxActivo,
  type UsuarioAutenticado
} from "../../common/decorators/contexto.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { validarConZod } from "../../common/pipes/zod-validation.pipe.js";
import { ReservasService } from "./reservas.service.js";

@Controller("reservas")
export class ReservasController {
  constructor(
    @Inject(ReservasService)
    private readonly reservasService: ReservasService
  ) {}

  @Get()
  @Roles("administrador", "recepcionista", "coach", "atleta")
  async listarReservas(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Query() query: unknown
  ): Promise<Reserva[]> {
    const filtro = validarConZod(FiltroReservasSchema, query);
    return this.reservasService.listarReservas(contexto, filtro);
  }

  @Post()
  @Roles("administrador", "recepcionista", "atleta")
  async crearReserva(
    @ContextoBox() contexto: ContextoBoxActivo,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() body: unknown
  ): Promise<Reserva> {
    const input = validarConZod(CrearReservaSchema, body);
    return this.reservasService.crearReserva(contexto, usuario.id, input);
  }

  @Post(":id/cancelar")
  @HttpCode(HttpStatus.OK)
  @Roles("atleta")
  async cancelarReserva(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string
  ): Promise<Reserva> {
    return this.reservasService.cancelarReserva(contexto, id);
  }
}
