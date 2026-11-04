import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import {
  EditarClaseSchema,
  FiltroClasesSchema,
  type Clase
} from "@centris/shared";
import {
  ContextoBox,
  type ContextoBoxActivo
} from "../../common/decorators/contexto.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { validarConZod } from "../../common/pipes/zod-validation.pipe.js";
import { ClasesService } from "./clases.service.js";
import { MaterializacionClasesService } from "./materializacion-clases.service.js";

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
    @Body() body: { fechaReferencia?: string }
  ): Promise<{ clasesCreadas: number }> {
    const fechaReferencia = body?.fechaReferencia
      ? new Date(body.fechaReferencia)
      : undefined;
    return this.materializacionService.materializarClasesParaBox(
      contexto.boxId,
      { fechaReferencia }
    );
  }
}
