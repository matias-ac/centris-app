import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module.js";
import { MembresiasController } from "./membresias.controller.js";
import { MembresiasService } from "./membresias.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [MembresiasController],
  providers: [MembresiasService],
  exports: [MembresiasService]
})
export class MembresiasModule {}
