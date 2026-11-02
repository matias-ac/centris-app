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
  AnularPagoSchema,
  CrearPagoSchema,
  FiltroMorososSchema,
  type Moroso,
  type Pago,
  type PagoConRegistrador
} from "@centris/shared";
import {
  ContextoBox,
  UsuarioActual,
  type ContextoBoxActivo,
  type UsuarioAutenticado
} from "../../common/decorators/contexto.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { validarConZod } from "../../common/pipes/zod-validation.pipe.js";
import { PagosService } from "./pagos.service.js";

@Controller("pagos")
export class PagosController {
  constructor(
    @Inject(PagosService)
    private readonly pagosService: PagosService
  ) {}

  @Post()
  @Roles("administrador", "recepcionista")
  async registrarPago(
    @ContextoBox() contexto: ContextoBoxActivo,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() body: unknown
  ): Promise<Pago> {
    const input = validarConZod(CrearPagoSchema, body);
    return this.pagosService.registrarPago(contexto.boxId, usuario.id, input);
  }

  @Get("morosos")
  @Roles("administrador", "recepcionista")
  async listarMorosos(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Query() query: unknown
  ): Promise<Moroso[]> {
    const filtro = validarConZod(FiltroMorososSchema, query);
    return this.pagosService.listarMorosos(contexto.boxId, filtro);
  }

  @Get("auditoria")
  @Roles("administrador")
  async listarAuditoria(
    @ContextoBox() contexto: ContextoBoxActivo
  ): Promise<PagoConRegistrador[]> {
    return this.pagosService.listarPagosAuditoria(contexto.boxId);
  }

  @Get("membresia/:membresiaId")
  @Roles("administrador", "recepcionista")
  async obtenerEstadoMembresia(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("membresiaId") membresiaId: string
  ): Promise<{
    membresiaId: string;
    precio: number;
    pagos: PagoConRegistrador[];
    totalPagado: number;
    saldo: number;
    esMoroso: boolean;
  }> {
    return this.pagosService.obtenerEstadoMembresia(
      contexto.boxId,
      membresiaId
    );
  }

  @Post(":id/anular")
  @HttpCode(HttpStatus.OK)
  @Roles("administrador")
  async anularPago(
    @ContextoBox() contexto: ContextoBoxActivo,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id") id: string,
    @Body() body: unknown
  ): Promise<Pago> {
    const input = validarConZod(AnularPagoSchema, body);
    return this.pagosService.anularPago(
      contexto.boxId,
      id,
      usuario.id,
      input
    );
  }
}
