import { Module } from "@nestjs/common";
import { PanelController } from "./panel.controller.js";
import { PanelService } from "./panel.service.js";

@Module({
  controllers: [PanelController],
  providers: [PanelService],
  exports: [PanelService]
})
export class PanelModule {}
