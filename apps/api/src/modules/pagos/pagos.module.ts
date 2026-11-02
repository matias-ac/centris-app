import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module.js";
import { PagosController } from "./pagos.controller.js";
import { PagosService } from "./pagos.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService]
})
export class PagosModule {}
