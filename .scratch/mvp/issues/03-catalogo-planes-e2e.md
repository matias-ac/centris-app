# 03: Catálogo de Planes Comerciales E2E

**Épica:** Épica 2 — Gestión de Catálogo, Membresías y Caja Inmutable (E2E)
**Paralelización:** **Ejecutable en PARALELO** con `04` (Directorio de Atletas) y con `07` (Tipos de Clase y Horarios de la Épica 3).

**What to build:**
Permitir al `Administrador` de un Box crear, listar, editar y desactivar (*Soft Delete* / estado activo) las ofertas comerciales de su catálogo de `Planes` de punta a punta (migración de tabla `PLAN` con `FORCE ROW LEVEL SECURITY` $\rightarrow$ endpoints NestJS validados con Zod $\rightarrow$ interfaz de catálogo en Next.js con `shadcn/ui`), soportando las tres configuraciones de un mismo modelo de Plan: Créditos por Período semanal (`SEMANAL`), pack de Créditos para toda la Vigencia (`VIGENCIA_TOTAL`) y acceso ilimitado (`ILIMITADO`).

**Blocked by:** 02: Identidad Global, Autenticación, Selector de Box y Guard de 4 Roles Componibles E2E

**Status:** ready-for-agent

## Acceptance Criteria (TDD / BDD)

- [ ] **Esquema `PLAN` con RLS y representación monetaria exacta**: La tabla `PLAN` incluye `box_id`, `UNIQUE (box_id, id)`, `precio_base` entero/exacto (`bigint` o `numeric`, nunca punto flotante), `duracion_dias`, `modalidad_creditos`, `creditos_por_periodo`, `activo`, `deleted_at` y política RLS forzada por `app.box_id`.
- [ ] **Validación Zod de modalidades de Créditos**: **Given** el formulario de creación de Plan en `apps/web` y el DTO en `apps/api`, **When** se selecciona modalidad `SEMANAL` o `VIGENCIA_TOTAL`, **Then** Zod exige `creditos_por_periodo > 0`; **When** se selecciona `ILIMITADO`, **Then** `creditos_por_periodo` se guarda como `NULL`.
- [ ] **Autorización estricta por Rol**: **Given** un `Administrador`, **When** crea, edita o da de baja lógica (`deleted_at`) un `Plan`, **Then** los cambios se reflejan en el catálogo del Box; **Given** un `Recepcionista`, **When** consulta el catálogo, **Then** puede listar los Planes activos para venderlos, pero recibe `403 Forbidden` si intenta crear, editar o eliminar un Plan.
- [ ] **Aislamiento entre Boxes**: **Given** Planes creados en `Box A`, **When** un usuario opera en `Box B`, **Then** la tabla `PLAN` bajo RLS no expone ni permite referenciar ningún Plan de `Box A`.
