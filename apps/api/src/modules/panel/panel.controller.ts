import { Controller, Get, Inject } from "@nestjs/common";
import type { ResumenPanel } from "@centris/shared";
import {
  ContextoBox,
  type ContextoBoxActivo
} from "../../common/decorators/contexto.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { PanelService } from "./panel.service.js";

@Controller("panel")
export class PanelController {
  constructor(
    @Inject(PanelService) private readonly panelService: PanelService
  ) {}

  @Get("resumen")
  @Roles("administrador", "recepcionista", "coach", "atleta")
  async obtenerResumen(
    @ContextoBox() contexto: ContextoBoxActivo
  ): Promise<ResumenPanel> {
    return this.panelService.obtenerResumen({
      boxId: contexto.boxId,
      afiliacionId: contexto.afiliacionId,
      roles: contexto.roles
    });
  }
}
