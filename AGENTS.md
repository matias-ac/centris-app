# AGENTS.md — Guía Maestra del Repositorio (`centris-app`)

Este archivo es el punto de entrada obligatorio para cualquier agente de IA o desarrollador que trabaje en **Centris (`centris-app`)**.

## 1. Mapa de Documentación y Fuentes de Verdad

Antes de diseñar, escribir código o revisar un Pull Request, consultá los siguientes documentos según la tarea:

- **Lenguaje Ubicuo de Dominio**: [`GLOSSARY.md`](./GLOSSARY.md) *(Obligatorio en nombres de tablas, columnas, rutas REST, clases, esquemas Zod y escenarios `.feature`)*.
- **Decisiones de Arquitectura (ADRs)**:
  - [ADR 0001: Identidad global de Usuario con Afiliación por Box](./docs/adr/0001-identidad-global-con-afiliacion-por-box.md)
  - [ADR 0002: Clases materializadas a partir del Horario](./docs/adr/0002-clases-materializadas-desde-horario.md)
  - [ADR 0003: Integridad de Cupos y Créditos en la base de datos](./docs/adr/0003-integridad-de-cupos-y-creditos-en-base-de-datos.md)
  - [ADR 0004: Aislamiento entre Boxes con RLS en PostgreSQL](./docs/adr/0004-aislamiento-por-box-con-rls-en-postgresql.md)
  - [ADR 0005: Cálculos de calendario en la zona horaria del Box](./docs/adr/0005-calculos-de-calendario-en-zona-horaria-del-box.md)
  - [ADR 0006: Acceso a reservas desacoplado del Pago y contabilidad inmutable](./docs/adr/0006-acceso-desacoplado-del-pago.md)
  - [ADR 0007: Cuatro roles atómicos y componibles por Afiliación](./docs/adr/0007-cuatro-roles-atomicos-componibles.md)
- **Requisitos de Producto e Historias de Usuario**: [`docs/PRD.md`](./docs/PRD.md)
- **Modelo de Datos Relacional y Políticas RLS**: [`docs/DER.md`](./docs/DER.md)
- **Arquitectura del Monorepo, Módulos Profundos y Códigos de Error**: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **Sistema de Diseño, `tabular-nums`, Badges y Layouts por Rol**: [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md)
- **Flujo de Git, Ramas, Commits y Definition of Done (DoD)**: [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md)
- **Plan Maestro y Backlog de 12 Tickets E2E**: [`.scratch/mvp/spec.md`](./.scratch/mvp/spec.md) e issues en [`.scratch/mvp/issues/`](./.scratch/mvp/issues/)
- **Variables de Entorno, Comandos y Dataset de Seed**: [`README.md`](./README.md)

## 2. Reglas Técnicas Innegociables

1. **PostgreSQL Real en Docker + RLS Forzado**: Prohibido usar SQLite o bases en memoria. Toda tabla operativa de un Box lleva `box_id`, claves foráneas compuestas `(box_id, <entidad>_id)` y `ENABLE` + `FORCE ROW LEVEL SECURITY`. La aplicación se conecta con un rol sin `BYPASSRLS` y abre transacciones mediante Drizzle ORM fijando `SET LOCAL app.box_id = '<uuid>'` (o `SET LOCAL app.usuario_id = '<uuid>'` en la lectura pre-Box de `afiliaciones`).
2. **Español de Dominio Ubicuo**: Nombres de tablas, columnas de negocio, endpoints REST (`/api/planes`, `/api/membresias`, `/api/reservas`), esquemas Zod, servicios de dominio y archivos `.feature` usan los términos en español de [`GLOSSARY.md`](./GLOSSARY.md).
3. **Módulos Profundos y TDD/BDD**: Diseñar módulos profundos según `/codebase-design` evitando capas *pass-through* superficiales. Desarrollar cada criterio de aceptación en ciclo **Red $\rightarrow$ Green** (`/tdd`) utilizando **`Playwright` + `playwright-bdd`** (`.feature` + `.steps.ts` en `# language: es`) y **`Vitest`** (`.spec.ts`).
4. **Comandos de Verificación (DoD)**: Antes de dar por terminado un ticket, deben pasar sin errores `pnpm lint`, `pnpm typecheck` y `pnpm test`.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles plus execution states (`ready-for-agent`, `in-progress`, `done`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.
