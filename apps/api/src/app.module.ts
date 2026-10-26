import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard.js";
import { RolesGuard } from "./common/guards/roles.guard.js";
import { DatabaseModule } from "./database/database.module.js";
import { AfiliacionesModule } from "./modules/afiliaciones/afiliaciones.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { BoxesModule } from "./modules/boxes/boxes.module.js";
import { SaludModule } from "./modules/salud/salud.module.js";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    AfiliacionesModule,
    BoxesModule,
    SaludModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    }
  ]
})
export class AppModule {}

