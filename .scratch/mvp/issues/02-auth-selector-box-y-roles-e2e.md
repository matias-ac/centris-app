# 02: Identidad Global, Autenticación, Selector de Box y Guard de 4 Roles Componibles E2E

**Épica:** Épica 1 — Setup Core Monorepo, Postgres Docker & Auth E2E
**Paralelización:** Secuencial (Cierra la Fase 1 y habilita en paralelo `03`, `04` y `07`).

**What to build:**
Implementar de punta a punta (BD $\rightarrow$ NestJS $\rightarrow$ Next.js + `shadcn/ui`) el flujo de autenticación portable de `Usuario` libre de *vendor lock-in* utilizando **Auth.js (NextAuth)** con sesión basada en **JWT** en `apps/web` y validación criptográfica del token en la API REST de `apps/api` (NestJS), el selector de `Box` activo basado en las `Afiliaciones` del usuario, la autorización mediante los **4 roles atómicos componibles** (`administrador`, `recepcionista`, `coach`, `atleta`), la gestión de roles del personal del Box y la pantalla de configuración general del Box (`timezone` IANA, `moneda`, `anticipacion_reserva_dias`, `ventana_cancelacion_minutos`).

**Blocked by:** 01: Cimientos del Monorepo, PostgreSQL en Docker e Infraestructura RLS

**Status:** in-progress

## Acceptance Criteria (TDD / BDD)

- [ ] **Autenticación portable con Auth.js (NextAuth) + JWT y activación de primer ingreso**: **Given** un `Usuario` registrado en la tabla global `usuarios`, **When** inicia sesión en `apps/web` mediante **Auth.js**, **Then** se emite una sesión basada en JWT sin acoplamiento a proveedores propietarios y `apps/api` (NestJS) valida el token `Bearer <jwt>` en cada petición autenticada; y **Given** un `Usuario` creado en mostrador con `password_hash IS NULL` y al menos una `Afiliación` activa, **When** accede por primera vez al flujo de activación de cuenta e ingresa su email y nueva contraseña, **Then** define su contraseña global por única vez y queda rechazado cualquier intento posterior de usar dicho flujo una vez que `password_hash IS NOT NULL`.
- [ ] **Identidad global y selector de Box bajo RLS (`app.usuario_id`)**: **Given** un `Usuario` autenticado que posee `Afiliaciones` activas en dos Boxes distintos (`Box Norte` como `['atleta']` y `Box Sur` como `['coach', 'recepcionista']`), **When** inicia sesión en `apps/web`, **Then** `apps/api` consulta sus `Afiliaciones` en una transacción que fija `SET LOCAL app.usuario_id = '<uuid>'` (respetando RLS sin `BYPASSRLS`) y el usuario puede elegir en qué Box operar y cambiar de Box activo desde el encabezado sin volver a autenticarse.
- [ ] **Composición de los 4 roles atómicos**: **Given** un Usuario cuya `Afiliación` en el Box activo tiene `roles = ['coach', 'recepcionista']`, **When** consume la API de NestJS y navega en Next.js, **Then** el *RoleGuard* y el layout le habilitan la unión de las vistas y acciones de `Coach` y `Recepcionista`, pero le devuelven `403 Forbidden` ante acciones exclusivas de `Administrador`.
- [ ] **Configuración de Box con Zod**: **Given** un `Administrador` autenticado, **When** actualiza la configuración de su Box (`timezone` IANA válida, `moneda` ISO, `anticipacion_reserva_dias`, `ventana_cancelacion_minutos`) desde el formulario en `apps/web`, **Then** los datos se validan con Zod en cliente y servidor y se persisten en `BOX`; si un `Recepcionista`, `Coach` o `Atleta` intenta modificarlos, recibe `403 Forbidden`.
- [ ] **Gestión de Afiliaciones de Staff**: **Given** un `Administrador`, **When** asigna o modifica el array de roles de una `Afiliación` de su Box o le aplica *Soft Delete* (`deleted_at`), **Then** los permisos del usuario afectado se actualizan de inmediato en ese Box sin afectar sus Afiliaciones en otros Boxes.
