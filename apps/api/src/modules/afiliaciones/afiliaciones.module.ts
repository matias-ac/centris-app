import { Module } from "@nestjs/common";
import { AfiliacionesController } from "./afiliaciones.controller.js";
import { AfiliacionesService } from "./afiliaciones.service.js";

@Module({
  controllers: [AfiliacionesController],
  providers: [AfiliacionesService],
  exports: [AfiliacionesService]
})
export class AfiliacionesModule {}
