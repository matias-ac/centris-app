# 11 — Rediseño UX/UI de `/clases` (Calendario, Materialización y Asistencia)

**Status:** ready-for-agent
**Branch:** `feat/ui-11-clases`
**Blocked by:** `01`

## Contexto

Migra `/clases` a **Dark Bento Cockpit** (`propuesta-clases.html`), unificando la materialización semanal desde horarios ([ADR 0002](../../../docs/adr/0002-clases-materializadas-desde-horario.md)), creación de clases puntuales, edición/cancelación de clase, anotación de walk-ins en mostrador y marcado de asistencia del `Coach` dentro de la ventana de 24 hs (sin exponer datos financieros a `Coach` sin rol de caja).

## Fuentes de Verdad

- Crítica Impeccable: [`apps/web/.impeccable/critique/2026-11-13T20-59-00Z__src-app-box-clases-clases-view-tsx.md`](../../../apps/web/.impeccable/critique/2026-11-13T20-59-00Z__src-app-box-clases-clases-view-tsx.md)
- Mockup aprobado: [`.scratch/propuesta-clases.html`](../../propuesta-clases.html)
- Design System v2: [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md)

## Archivos Objetivo

- `apps/web/src/app/(box)/clases/page.tsx`
- `apps/web/src/app/(box)/clases/clases-view.tsx`
- `apps/web/e2e/steps/08-materializacion-y-edicion-clases-e2e.steps.ts` *(si se requieren ajustes de selector)*
- `apps/web/e2e/steps/11-walk-ins-mostrador-recepcion-e2e.steps.ts` *(verificar compatibilidad)*
- `apps/web/e2e/steps/12-asistencia-coach-y-consolidacion-ausencias-e2e.steps.ts` *(verificar compatibilidad)*

## Suites E2E Impactadas

- `apps/web/e2e/features/08-materializacion-y-edicion-clases-e2e.feature`
- `apps/web/e2e/features/11-walk-ins-mostrador-recepcion-e2e.feature`
- `apps/web/e2e/features/12-asistencia-coach-y-consolidacion-ausencias-e2e.feature`

## Acceptance Criteria (TDD / BDD)

- [ ] **Tests en Red $\rightarrow$ Green**: Cubrir materialización semanal, creación de clase puntual, cancelación/edición con `InlineConfirm`, walk-in de mostrador y toma de asistencia del `Coach` en piso (`min-h-11`, sin exponer montos/saldos a usuarios exclusivamente `Coach`).
- [ ] **Agenda Bento y `SideDrawer` de Inscriptos**: Selector semanal claro en zona horaria del Box ([ADR 0005](../../../docs/adr/0005-calculos-de-calendario-en-zona-horaria-del-box.md)), tarjetas de clase con barra de ocupación (`#C1F429` sobre rayado diagonal), `tabular-nums` en horario y cupo (`18/20`), badges semánticos (`mint` / `amber` / `coral` / `zinc`) y `SideDrawer` limpio para gestionar la nómina de inscriptos y asistencia en 1 toque.
- [ ] **Estabilidad Notebook y Mobile**: Grilla adaptable `minmax(min(100%, 300px), 1fr)` sin botones cortados y controles táctiles `>= 44px` en piso de entrenamiento.
- [ ] **Verificación CI / DoD**: Pasar `pnpm lint`, `pnpm typecheck`, `pnpm test` (`Vitest` + todas las suites `playwright-bdd`) y `/code-review`.

## Comments

- *Sin comentarios aún.*
