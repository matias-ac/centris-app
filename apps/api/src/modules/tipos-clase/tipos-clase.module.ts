import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module.js";
import { TiposClaseController } from "./tipos-clase.controller.js";
import { TiposClaseService } from "./tipos-clase.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [TiposClaseController],
  providers: [TiposClaseService],
  exports: [TiposClaseService]
})
export class TiposClaseModule {}
