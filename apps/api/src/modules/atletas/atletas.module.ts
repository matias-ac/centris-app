import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module.js";
import { AtletasController } from "./atletas.controller.js";
import { AtletasService } from "./atletas.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AtletasController],
  providers: [AtletasService],
  exports: [AtletasService]
})
export class AtletasModule {}
