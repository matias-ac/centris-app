# 10 — Rediseño UX/UI de `/horarios` (Tipos de Clase y Plantilla Semanal)

**Status:** ready-for-agent
**Branch:** `feat/ui-10-horarios`
**Blocked by:** `01`

## Contexto

Migra `/horarios` a **Dark Bento Cockpit** (`propuesta-horarios.html`) para gestionar `Tipos de Clase` y `Horarios` recurrentes semanales ([ADR 0002](../../../docs/adr/0002-clases-materializadas-desde-horario.md)), reemplazando los diálogos `confirm()` nativos al desactivar/activar `Tipo de Clase` u `Horario` por `InlineConfirm` y asegurando grilla semanal sin desbordes en notebooks ni móvil.

> [!IMPORTANT]
> `apps/web/e2e/steps/07-tipos-clase-y-horarios-recurrentes-e2e.steps.ts` (líneas ~84 y ~146) utiliza `page.on("dialog", ...)`. Debe actualizarse primero en **Red $\rightarrow$ Green** para interactuar con `InlineConfirm`.

## Fuentes de Verdad

- Crítica Impeccable: [`apps/web/.impeccable/critique/2026-11-13T21-10-00Z__src-app-box-horarios-horarios-view-tsx.md`](../../../apps/web/.impeccable/critique/2026-11-13T21-10-00Z__src-app-box-horarios-horarios-view-tsx.md)
- Mockup aprobado: [`.scratch/propuesta-horarios.html`](../../propuesta-horarios.html)
- Design System v2: [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md)

## Archivos Objetivo

- `apps/web/src/app/(box)/horarios/page.tsx`
- `apps/web/src/app/(box)/horarios/horarios-view.tsx`
- `apps/web/e2e/steps/07-tipos-clase-y-horarios-recurrentes-e2e.steps.ts`

## Suites E2E Impactadas

- `apps/web/e2e/features/07-tipos-clase-y-horarios-recurrentes-e2e.feature`

## Acceptance Criteria (TDD / BDD)

- [ ] **Red $\rightarrow$ Green en E2E (`InlineConfirm` sin `confirm()`)**: Reemplazar ambos `page.on("dialog", ...)` en `07-tipos-clase-y-horarios-recurrentes-e2e.steps.ts` por clicks en `InlineConfirm`, verificar falla en Red y lograr Green al implementar `InlineConfirm` en `horarios-view.tsx`.
- [ ] **Bento Grid Semanal y Creación en Drawer/Panel**: Mostrar plantilla semanal agrupada por día de la semana con `tabular-nums` en franjas horarias (`07:00 – 08:00`) y cupos (`20 cupos`), badges semánticos sin colores chillones y panel/drawer limpio para crear o editar `Tipos de Clase` y `Horarios`.
- [ ] **Anti-Overflow Notebook y Mobile**: Grilla adaptable `minmax(min(100%, 300px), 1fr)` sin botones cortados y controles `min-h-11` con inputs `>= 16px`.
- [ ] **Verificación CI / DoD**: Pasar `pnpm lint`, `pnpm typecheck`, `pnpm test` (`Vitest` + todas las suites `playwright-bdd`) y `/code-review`.

## Comments

- *Sin comentarios aún.*
