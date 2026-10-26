import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module.js";
import { PlanesController } from "./planes.controller.js";
import { PlanesService } from "./planes.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [PlanesController],
  providers: [PlanesService],
  exports: [PlanesService]
})
export class PlanesModule {}
