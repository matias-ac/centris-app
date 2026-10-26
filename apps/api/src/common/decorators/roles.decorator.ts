import { SetMetadata } from "@nestjs/common";
import type { RolAfiliacion } from "@centris/shared";

export const ROLES_KEY = "rolesRequeridos";

export const Roles = (...roles: RolAfiliacion[]) =>
  SetMetadata(ROLES_KEY, roles);
