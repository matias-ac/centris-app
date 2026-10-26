import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from "@nestjs/common";
import {
  ActivarCuentaSchema,
  LoginSchema,
  type SesionAuth
} from "@centris/shared";
import { Public } from "../../common/decorators/public.decorator.js";
import { validarConZod } from "../../common/pipes/zod-validation.pipe.js";
import { AuthService } from "./auth.service.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown): Promise<SesionAuth> {
    const input = validarConZod(LoginSchema, body);
    return this.authService.iniciarSesion(input);
  }

  @Public()
  @Post("activar-cuenta")
  @HttpCode(HttpStatus.OK)
  async activarCuenta(@Body() body: unknown): Promise<SesionAuth> {
    const input = validarConZod(ActivarCuentaSchema, body);
    return this.authService.activarCuentaPrimerIngreso(input);
  }
}
