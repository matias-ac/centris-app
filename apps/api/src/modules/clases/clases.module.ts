import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module.js";
import { ClasesController } from "./clases.controller.js";
import { ClasesService } from "./clases.service.js";
import { MaterializacionClasesService } from "./materializacion-clases.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [ClasesController],
  providers: [ClasesService, MaterializacionClasesService],
  exports: [ClasesService, MaterializacionClasesService]
})
export class ClasesModule {}
