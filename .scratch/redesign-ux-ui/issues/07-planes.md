# 07 — Rediseño UX/UI de `/planes`

**Status:** in-progress
**Branch:** `feat/ui-07-planes`
**Blocked by:** `01`

## Contexto

Migra `/planes` a **Dark Bento Cockpit** (`propuesta-planes.html`) con grilla Bento segura para notebooks (`1280px–1366px`) y móviles, traduciendo los enums crudos (`SEMANAL`, `VIGENCIA_TOTAL`, `ILIMITADO`) a lenguaje humano en español y reemplazando `window.confirm()` nativo al desactivar/activar planes por el componente `InlineConfirm`.

> [!IMPORTANT]
> `apps/web/e2e/steps/03-catalogo-planes-e2e.steps.ts` (línea ~183) hoy utiliza `page.on("dialog", ...)` esperando `confirm()`. Este ticket **debe** actualizar el step E2E primero en **Red $\rightarrow$ Green** para usar `InlineConfirm`.

## Fuentes de Verdad

- Crítica Impeccable: [`apps/web/.impeccable/critique/2026-11-13T21-26-00Z__src-app-box-planes-catalogo-planes-box-tsx.md`](../../../apps/web/.impeccable/critique/2026-11-13T21-26-00Z__src-app-box-planes-catalogo-planes-box-tsx.md)
- Mockup aprobado: [`.scratch/propuesta-planes.html`](../../propuesta-planes.html)
- Design System v2: [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md)

## Archivos Objetivo

- `apps/web/src/app/(box)/planes/page.tsx`
- `apps/web/src/app/(box)/planes/catalogo-planes-box.tsx`
- `apps/web/e2e/steps/03-catalogo-planes-e2e.steps.ts`

## Suites E2E Impactadas

- `apps/web/e2e/features/03-catalogo-planes-e2e.feature` / `apps/web/e2e/steps/03-catalogo-planes-e2e.steps.ts`

## Acceptance Criteria (TDD / BDD)

- [ ] **Red $\rightarrow$ Green en E2E (`InlineConfirm` sin `confirm()`)**: Reemplazar `page.on("dialog", ...)` en `03-catalogo-planes-e2e.steps.ts` por interacción con el flujo `InlineConfirm`, verificar falla en Red y hacerla pasar en Green al implementar `InlineConfirm` en `catalogo-planes-box.tsx`.
- [ ] **Lenguaje Ubicuo sin Enums Crudos**: Formatear precios con `tabular-nums` en la moneda del Box (`Intl.NumberFormat('es-AR', ...)`), traducir modalidad/periodicidad a etiquetas claras en español (prohibido mostrar `SEMANAL`, `VIGENCIA_TOTAL`, `ILIMITADO` o prefijos `${errorCode}:` en texto visible) y mantener los `Badge` semánticos (`mint` Activo / `zinc` Inactivo).
- [ ] **Grilla Anti-Overflow en Notebooks (`1280px`)**: Usar grilla `minmax(min(100%, 300px), 1fr)` + `flex-wrap: wrap` y `min-width: 0` en botones de acción para que ningún botón sobresalga de la card de Plan.
- [ ] **Verificación CI / DoD**: Pasar `pnpm lint`, `pnpm typecheck`, `pnpm test` (`Vitest` + todas las suites `playwright-bdd`) y `/code-review`.

## Comments

- *Sin comentarios aún.*
