import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module.js";
import { HorariosController } from "./horarios.controller.js";
import { HorariosService } from "./horarios.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [HorariosController],
  providers: [HorariosService],
  exports: [HorariosService]
})
export class HorariosModule {}
