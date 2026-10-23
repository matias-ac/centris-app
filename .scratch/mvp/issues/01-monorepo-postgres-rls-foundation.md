# 01: Cimientos del Monorepo, PostgreSQL en Docker e Infraestructura RLS

**Épica:** Épica 1 — Setup Core Monorepo, Postgres Docker & Auth E2E
**Paralelización:** Secuencial (Ticket fundacional; desbloquea `02` y el resto del proyecto).

**What to build:**
Configurar el monorepo completo de **Centris (`centris-app`)** con `apps/api` (NestJS REST portable a Render/Railway/Fly), `apps/web` (Next.js App Router + `shadcn/ui` optimizado para Vercel/Netlify) y `packages/shared` (esquemas Zod), junto con **PostgreSQL estándar en Docker desde el día 1** (prohibiendo SQLite y garantizando compatibilidad futura con Neon/Render). Implementar el esquema base (`BOX`, `USUARIO`, `AFILIACION`) con `FORCE ROW LEVEL SECURITY` y el wrapper/interceptor transaccional en el ORM seleccionado (TypeORM o Drizzle) que inyecta `SET LOCAL app.box_id = '<uuid>'` en cada transacción usando un rol de aplicación sin `BYPASSRLS`, cerrando la rebanada vertical con un endpoint y pantalla de verificación de salud y aislamiento.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

## Acceptance Criteria (TDD / BDD)

- [ ] **Monorepo operativo**: `apps/api` (NestJS REST), `apps/web` (Next.js App Router + Tailwind + `shadcn/ui`) y `packages/shared` (Zod) compilan y levantan con un único comando en la raíz.
- [ ] **PostgreSQL en Docker obligatorio**: `docker-compose.yml` aprovisiona PostgreSQL (con extensión `btree_gist` y `uuid-ossp`/`pgcrypto`) creando dos roles diferenciados: un rol propietario para ejecutar migraciones y un rol `app_user` (`NOSUPERUSER`, `NOBYPASSRLS`) para la conexión de `apps/api`.
- [ ] **Migración inicial y Soft Deletes**: Se crean las tablas `BOX`, `USUARIO` y `AFILIACION` con `deleted_at` (`timestamptz nullable`), `UNIQUE (box_id, id)` en `AFILIACION` y política RLS forzada (`ENABLE` y `FORCE ROW LEVEL SECURITY`) sobre `AFILIACION`.
- [ ] **Given** dos Boxes registrados (`Box A` y `Box B`) con sus respectivas `Afiliaciones`, **When** se ejecuta una transacción en `apps/api` fijando `SET LOCAL app.box_id = BoxA`, **Then** las consultas al repositorio devuelven exclusivamente las filas de `Box A` (incluso sin filtro `WHERE box_id` explícito) y cualquier intento de insertar una fila con `box_id = BoxB` es rechazado por la política RLS.
- [ ] **Given** una consulta ejecutada fuera de una transacción con `app.box_id` o con `app.box_id` vacío, **Then** PostgreSQL devuelve cero filas (*fail-closed*) y no filtra datos entre conexiones del pool al finalizar la transacción.
