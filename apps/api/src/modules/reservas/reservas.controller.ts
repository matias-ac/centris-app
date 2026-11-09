import { Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";
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
    return this.reservasService.listarReservas(
      contexto.boxId,
      contexto,
      filtro
    );
  }

  @Post()
  @Roles("administrador", "recepcionista", "atleta")
  async crearReserva(
    @ContextoBox() contexto: ContextoBoxActivo,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() body: unknown
  ): Promise<Reserva> {
    const input = validarConZod(CrearReservaSchema, body);
    return this.reservasService.crearReserva(
      contexto.boxId,
      contexto,
      usuario.id,
      input
    );
  }
}
