import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import { z } from "zod";
import {
  CancelarClaseSchema,
  EditarClaseSchema,
  FiltroClasesSchema,
  type Clase
} from "@centris/shared";
import {
  ContextoBox,
  UsuarioActual,
  type ContextoBoxActivo,
  type UsuarioAutenticado
} from "../../common/decorators/contexto.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { validarConZod } from "../../common/pipes/zod-validation.pipe.js";
import { ClasesService } from "./clases.service.js";
import { MaterializacionClasesService } from "./materializacion-clases.service.js";

const MaterializarClasesBodySchema = z
  .object({
    fechaReferencia: z.string().datetime().optional()
  })
  .optional()
  .default({});

@Controller("clases")
export class ClasesController {
  constructor(
    @Inject(ClasesService) private readonly clasesService: ClasesService,
    @Inject(MaterializacionClasesService)
    private readonly materializacionService: MaterializacionClasesService
  ) {}

  @Get()
  @Roles("administrador", "recepcionista", "coach", "atleta")
  async listarClases(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Query() query: unknown
  ): Promise<Clase[]> {
    const filtro = validarConZod(FiltroClasesSchema, query);
    return this.clasesService.listarClases(contexto.boxId, filtro);
  }

  @Get(":id")
  @Roles("administrador", "recepcionista", "coach", "atleta")
  async obtenerClase(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string
  ): Promise<Clase> {
    return this.clasesService.obtenerClasePorId(contexto.boxId, id);
  }

  @Patch(":id")
  @Roles("administrador", "recepcionista")
  async editarClase(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Param("id") id: string,
    @Body() body: unknown
  ): Promise<Clase> {
    const input = validarConZod(EditarClaseSchema, body);
    return this.clasesService.editarClase(
      contexto.boxId,
      id,
      contexto.roles,
      input
    );
  }

  @Post("materializar")
  @Roles("administrador")
  async materializarClases(
    @ContextoBox() contexto: ContextoBoxActivo,
    @Body() body: unknown
  ): Promise<{ clasesCreadas: number }> {
    const input = validarConZod(MaterializarClasesBodySchema, body);
    const fechaReferencia = input.fechaReferencia
      ? new Date(input.fechaReferencia)
      : undefined;
    return this.materializacionService.materializarClasesParaBox(
      contexto.boxId,
      { fechaReferencia }
    );
  }

  @Post(":id/cancelar")
  @HttpCode(HttpStatus.OK)
  @Roles("administrador")
  async cancelarClase(
    @ContextoBox() contexto: ContextoBoxActivo,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id") id: string,
    @Body() body: unknown
  ): Promise<Clase> {
    const input = validarConZod(CancelarClaseSchema, body ?? {});
    return this.clasesService.cancelarClase(
      contexto.boxId,
      id,
      usuario.id,
      input
    );
  }
}
