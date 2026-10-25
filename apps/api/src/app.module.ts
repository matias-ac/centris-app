import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module.js";
import { SaludController } from "./modules/salud/salud.controller.js";

@Module({
  imports: [DatabaseModule],
  controllers: [SaludController]
})
export class AppModule {}
