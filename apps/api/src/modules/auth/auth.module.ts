import { Global, Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtTokenService } from "./jwt-token.service.js";

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtTokenService],
  exports: [AuthService, JwtTokenService]
})
export class AuthModule {}
