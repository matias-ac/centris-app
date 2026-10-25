# 01: Cimientos del Monorepo, PostgreSQL en Docker e Infraestructura RLS

**Épica:** Épica 1 — Setup Core Monorepo, Postgres Docker & Auth E2E
**Paralelización:** Secuencial (Ticket fundacional; desbloquea `02` y el resto del proyecto).

**What to build:**
Configurar el monorepo completo de **Centris (`centris-app`)** con `apps/api` (NestJS REST portable a Render/Railway/Fly), `apps/web` (Next.js App Router + `shadcn/ui` optimizado para Vercel/Netlify) y `packages/shared` (esquemas Zod), junto con **PostgreSQL estándar en Docker desde el día 1** (prohibiendo SQLite y garantizando compatibilidad futura con Neon/Render). Implementar el esquema base (`BOX`, `USUARIO`, `AFILIACION`) con `FORCE ROW LEVEL SECURITY` y el wrapper/interceptor transaccional en **Drizzle ORM (`drizzle-orm` + `drizzle-kit`)** que inyecta `SET LOCAL app.box_id = '<uuid>'` (o `SET LOCAL app.usuario_id = '<uuid>'` para la lectura pre-Box de `AFILIACION`) en cada transacción usando un rol de aplicación sin `BYPASSRLS`. Configurar la suite de testing oficial (**`Vitest`** para `.spec.ts` + **`Playwright` con `playwright-bdd`** para `.feature` y `.steps.ts` en español) y el pipeline de Integración Continua en **GitHub Actions (`.github/workflows/ci.yml`)**, cerrando la rebanada vertical con un endpoint y pantalla de verificación de salud y aislamiento.

**Blocked by:** None (can start immediately)

**Status:** done

## Acceptance Criteria (TDD / BDD)

- [x] **Monorepo operativo y suite de testing (`Vitest` + `playwright-bdd`)**: `apps/api` (NestJS REST + Drizzle ORM), `apps/web` (Next.js App Router + Tailwind + `shadcn/ui`) y `packages/shared` (Zod) compilan y levantan desde la raíz, con `Vitest` (`.spec.ts`) y `Playwright` + `playwright-bdd` (`.feature` + `.steps.ts` en `# language: es`) configurados.
- [x] **PostgreSQL en Docker obligatorio**: `docker-compose.yml` aprovisiona PostgreSQL (con extensión `btree_gist` y `uuid-ossp`/`pgcrypto`) creando dos roles diferenciados: un rol propietario para ejecutar migraciones de `drizzle-kit` y un rol `app_user` (`NOSUPERUSER`, `NOBYPASSRLS`) para la conexión de `apps/api`.
- [x] **Migración inicial, Soft Deletes y política RLS dual en `AFILIACION`**: Se crean las tablas `boxes`, `usuarios` (`password_hash` nullable) y `afiliaciones` con `deleted_at` (`timestamptz nullable`), `UNIQUE (box_id, id)` en `afiliaciones` y `ENABLE` + `FORCE ROW LEVEL SECURITY` sobre `afiliaciones` (permitiendo `SELECT` por `app.box_id` o `app.usuario_id`, y exigiendo `app.box_id` para `INSERT`, `UPDATE` y `DELETE`).
- [x] **Given** dos Boxes registrados (`Box A` y `Box B`) con sus respectivas `Afiliaciones`, **When** se ejecuta una transacción en `apps/api` fijando `SET LOCAL app.box_id = BoxA`, **Then** las consultas al repositorio devuelven exclusivamente las filas de `Box A` (incluso sin filtro `WHERE box_id` explícito) y cualquier intento de insertar una fila con `box_id = BoxB` es rechazado por la política RLS; y **When** se fija únicamente `SET LOCAL app.usuario_id = UsuarioX`, **Then** `SELECT` sobre `afiliaciones` devuelve exclusivamente las afiliaciones de `UsuarioX`.
- [x] **Given** una consulta ejecutada fuera de una transacción con contexto o con `app.box_id` / `app.usuario_id` vacíos, **Then** PostgreSQL devuelve cero filas (*fail-closed*) y no filtra datos entre conexiones del pool al finalizar la transacción.
- [x] **Pipeline CI en GitHub Actions (`.github/workflows/ci.yml`)**: **Given** un Pull Request o push a `main`, **When** se dispara el workflow de GitHub Actions con un contenedor de servicio PostgreSQL real, **Then** ejecuta migraciones, `pnpm lint`, `pnpm typecheck` y las pruebas automatizadas (`Vitest` + `playwright-bdd`) verificando que todo pase en verde.
