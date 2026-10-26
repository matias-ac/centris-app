import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module.js";
import { SaludModule } from "./modules/salud/salud.module.js";

@Module({
  imports: [DatabaseModule, SaludModule]
})
export class AppModule {}
