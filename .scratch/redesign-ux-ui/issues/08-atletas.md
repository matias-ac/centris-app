# 08 — Rediseño UX/UI de `/atletas` y Ficha de Membresías

**Status:** done
**Branch:** `feat/ui-08-atletas`
**Blocked by:** `01`

## Contexto

Migra el directorio `/atletas` y la ficha lateral de membresías (`ficha-membresias-atleta.tsx`) a **Dark Bento Cockpit** (`propuesta-atletas.html`), sustituyendo confirmaciones nativas `confirm()`, textos técnicos `"403 Forbidden"` y diseños densos sin columnas estables. Además habilita soporte para abrir directamente la ficha de un atleta vía query param `?afiliacionId=<uuid>` (consumido por `/caja` en el Ticket `09`).

> [!IMPORTANT]
> `apps/web/e2e/steps/04-directorio-y-alta-atletas-e2e.steps.ts` tiene `page.on("dialog", ...)` (línea ~314) y aserción `"403 Forbidden"` (línea ~372). Ambos deben actualizarse primero en **Red $\rightarrow$ Green** dentro de este ticket.

## Fuentes de Verdad

- Crítica Impeccable: [`apps/web/.impeccable/critique/2026-11-13T21-16-00Z__src-app-box-atletas-directorio-atletas-box-tsx.md`](../../../apps/web/.impeccable/critique/2026-11-13T21-16-00Z__src-app-box-atletas-directorio-atletas-box-tsx.md)
- Mockup aprobado: [`.scratch/propuesta-atletas.html`](../../propuesta-atletas.html)
- Design System v2: [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md)

## Archivos Objetivo

- `apps/web/src/app/(box)/atletas/page.tsx`
- `apps/web/src/app/(box)/atletas/directorio-atletas-box.tsx`
- `apps/web/src/app/(box)/atletas/ficha-membresias-atleta.tsx`
- `apps/web/e2e/steps/04-directorio-y-alta-atletas-e2e.steps.ts`
- `apps/web/e2e/steps/05-membresias-vigencia-y-baja-anticipada-e2e.steps.ts` *(verificar si necesita ajustes de selector)*

## Suites E2E Impactadas

- `apps/web/e2e/features/04-directorio-y-alta-atletas-e2e.feature`
- `apps/web/e2e/features/05-membresias-vigencia-y-baja-anticipada-e2e.feature`

## Acceptance Criteria (TDD / BDD)

- [x] **Red $\rightarrow$ Green en E2E (`InlineConfirm` y sin `"403 Forbidden"`)**: Actualizar `04-directorio-y-alta-atletas-e2e.steps.ts` para usar `InlineConfirm` (eliminando `page.on("dialog", ...)`) y verificar el mensaje de negocio accesible cuando un rol sin permiso intenta operar (eliminando `"403 Forbidden"` literal).
- [x] **Soporte Deep-Link `?afiliacionId=`**: Al navegar a `/atletas?afiliacionId=<uuid>`, abrir automáticamente el `SideDrawer` con la ficha de membresías, saldo y pagos del atleta seleccionado (requerido por Ticket `09`).
- [x] **Estética Dark Bento Cockpit + Estabilidad**: Listado con filtros en `FilterChips` (`Todos`, `Al día`, `Morosos`, `Sin membresía`), tracks de grilla fijos en desktop, `tabular-nums` en saldos/créditos/fechas, badges semánticos (`mint` / `coral` / `amber` / `zinc`), e inputs `>= 16px` en alta de atleta, asignación de membresía y baja anticipada dentro de `SideDrawer`.
- [x] **Verificación CI / DoD**: Pasar `pnpm lint`, `pnpm typecheck`, `pnpm test` (`Vitest` + todas las suites `playwright-bdd`) y `/code-review`.

## Comments

- Implementación completada en `feat/ui-08-atletas` siguiendo `Dark Bento Cockpit`, con auditoría en Playwright (`1440px`, `1280px`, `375px`), revisión `/code-review` (`Standards` + `Spec`) aplicada y verificación completa de `pnpm lint`, `pnpm typecheck` y `pnpm test` (unitarios + 47 escenarios `playwright-bdd`).
