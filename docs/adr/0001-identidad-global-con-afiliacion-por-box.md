# Identidad global de Usuario con Afiliación por Box

Una misma persona puede entrenar en varios boxes y, a la vez, ser coach en otro (o en el mismo). Decidimos que el **Usuario** es una identidad única y global de la plataforma (credenciales, nombre, email), y que el acceso a cada **Box** se da mediante una **Afiliación** que lleva uno o más roles (Atleta, Coach, Recepcionista, Administrador). Todo el resto de los datos (planes, reservas, asistencias, configuración) pertenece a un Box y queda aislado por él. Al iniciar sesión, el Usuario elige en qué Box opera.

## Considered Options

- **Cuenta aislada por Box** (cada fila con `tenant_id`, también los usuarios): el aislamiento es más simple, pero la misma persona tiene cuentas duplicadas, con credenciales separadas. Unificar esas cuentas después implica una migración cara de identidades, y por eso la descartamos.

## Consequences

- Un Box solo ve de un Usuario los datos de identidad (nombre, email) y su propia Afiliación. Nunca ve afiliaciones, reservas ni pagos en otros boxes.
- La autorización siempre se evalúa con el par (Usuario, Box activo), nunca solo con el Usuario.
- Las credenciales y la recuperación de contraseña son globales: un Box no puede resetear ni administrar las credenciales de un Usuario.
