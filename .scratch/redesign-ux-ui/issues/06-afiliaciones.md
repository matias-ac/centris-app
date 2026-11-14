# 06 — Rediseño UX/UI de `/afiliaciones`

**Status:** done
**Branch:** `feat/ui-06-afiliaciones`
**Blocked by:** `01`

## Contexto

Migra `/afiliaciones` a **Dark Bento Cockpit** (`propuesta-afiliaciones.html`), incluyendo gestión de roles atómicos componibles ([ADR 0007](../../../docs/adr/0007-cuatro-roles-atomicos-componibles.md)) y alta/invitación de miembros del staff. Resuelve el bug visual donde al modificar un rol aparecía el badge `"Sin guardar"` y desplazaba o deformaba el botón `Guardar roles` tanto en desktop como en mobile.

## Fuentes de Verdad

- Crítica Impeccable: [`apps/web/.impeccable/critique/2026-11-13T21-42-00Z__src-app-box-afiliaciones-tabla-afiliaciones-box-tsx.md`](../../../apps/web/.impeccable/critique/2026-11-13T21-42-00Z__src-app-box-afiliaciones-tabla-afiliaciones-box-tsx.md)
- Mockup aprobado: [`.scratch/propuesta-afiliaciones.html`](../../propuesta-afiliaciones.html)
- Design System v2: [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md)

## Archivos Objetivo

- `apps/web/src/app/(box)/afiliaciones/page.tsx`
- `apps/web/src/app/(box)/afiliaciones/tabla-afiliaciones-box.tsx`

## Suites E2E Impactadas

- `apps/web/e2e/features/02-auth-selector-box-y-roles-e2e.feature` / `apps/web/e2e/steps/02-auth-selector-box-y-roles-e2e.steps.ts`

## Acceptance Criteria (TDD / BDD)

- [x] **Tests en Red $\rightarrow$ Green**: Verificada la conmutación de los 4 roles (`Administrador`, `Recepcionista`, `Coach`, `Atleta`), estado `"Cambios sin guardar"` y descartar borrador, persistencia al guardar, confirmación inline con `Escape`/cancelar y preservación de selectores en `02-auth-selector-box-y-roles-e2e.steps.ts` *(sin formulario de alta/invitación por alcance actual de backend y mockup; ver Comments)*.
- [x] **Estabilidad de Filas (`0` desplazamiento de `Guardar roles`)**: En desktop (`>=1200px`), grilla de tracks fijos con columna dedicada de acciones (`264px`) y franja contextual inferior (`.dirty-strip`) + confirmación inline fuera de `.member-main`, verificando `<= 1px` de desplazamiento en `1280px` y `1440px`; en mobile (`375px`), ancho completo consistente y acciones `min-h-11`.
- [x] **Bento y Controles Táctiles**: Chips de filtro por rol accesibles (`aria-pressed`, `min-h-11`), pills de roles componibles (`role="switch"`, `min-h-11`), confirmación inline reutilizable sin `confirm()` y mensajes de error humanos sin exposición de códigos HTTP crudos ni `403 Forbidden`.
- [x] **Verificación CI / DoD**: `pnpm lint`, `pnpm typecheck`, `pnpm test` completos y `/code-review` contra `main` aprobados.

## Comments

- **Alcance de alta/invitación**: La redacción inicial del ticket mencionaba "alta/invitación de miembros del staff", pero `apps/api/src/modules/afiliaciones/afiliaciones.controller.ts` solo expone `GET /afiliaciones/mias`, `GET /afiliaciones`, `PATCH /afiliaciones/:id` y `DELETE /afiliaciones/:id` (la creación de usuarios ocurre en `POST /atletas` y la composición de roles se gestiona en `/afiliaciones`), y `.scratch/propuesta-afiliaciones.html` tampoco contempla un formulario de invitación. En consecuencia, `/afiliaciones` implementa fielmente el mockup aprobado sin inventario de endpoints inexistentes.
- **Code review aplicado**: Tras `/code-review` contra `main`, se ajustó el breakpoint desktop de fila a `min-[1200px]` para evitar desborde en `1100px–1189px`, se elevaron los borradores por fila a `TablaAfiliacionesBox` para no perder cambios ante filtros o `router.refresh()`, se reemplazó `isPending` compartido por `operacionPendiente` (`"guardar" | "baja" | null`), se alineó la terminología con `GLOSSARY.md` (`Equipo operativo`, `Afiliaciones`), se agregó `<h1>` en vista restringida y se extrajeron `AccesoRestringidoCard` y `useInlineConfirm`/`InlineConfirmPanel` para eliminar duplicación con `/configuracion`.
