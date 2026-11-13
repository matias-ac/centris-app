# 12 — Rediseño UX/UI de `/reservas` (Vista Atleta Mobile-First y Mostrador)

**Status:** ready-for-agent
**Branch:** `feat/ui-12-reservas`
**Blocked by:** `01`

## Contexto

Migra `/reservas` a **Dark Bento Cockpit** (`propuesta-reservas.html`), optimizando la experiencia diaria *mobile-first* del `Atleta` para navegar días habilitados por la anticipación del Box, ver cupos con `tabular-nums`, reservar en un toque con CTA `#C1F429` y cancelar con explicación clara de ventana/reintegro de créditos — respetando estrictamente [ADR 0006](../../../docs/adr/0006-acceso-desacoplado-del-pago.md) (un atleta `Moroso` con membresía vigente y créditos conserva el botón `Reservar` habilitado).

## Fuentes de Verdad

- Crítica Impeccable: [`apps/web/.impeccable/critique/2026-11-13T20-13-28Z__src-app-box-reservas-reservas-atleta-view-tsx.md`](../../../apps/web/.impeccable/critique/2026-11-13T20-13-28Z__src-app-box-reservas-reservas-atleta-view-tsx.md)
- Mockup aprobado: [`.scratch/propuesta-reservas.html`](../../propuesta-reservas.html)
- Design System v2: [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md)

## Archivos Objetivo

- `apps/web/src/app/(box)/reservas/page.tsx`
- `apps/web/src/app/(box)/reservas/reservas-atleta-view.tsx`
- `apps/web/e2e/steps/09-motor-reservas-atleta-concurrencia-e2e.steps.ts` *(verificar compatibilidad)*
- `apps/web/e2e/steps/10-cancelaciones-ventana-y-reintegro-creditos-e2e.steps.ts` *(verificar compatibilidad)*
- `apps/web/e2e/steps/11-walk-ins-mostrador-recepcion-e2e.steps.ts` *(verificar compatibilidad)*

## Suites E2E Impactadas

- `apps/web/e2e/features/09-motor-reservas-atleta-concurrencia-e2e.feature`
- `apps/web/e2e/features/10-cancelaciones-ventana-y-reintegro-creditos-e2e.feature`
- `apps/web/e2e/features/11-walk-ins-mostrador-recepcion-e2e.feature`

## Acceptance Criteria (TDD / BDD)

- [ ] **Tests en Red $\rightarrow$ Green (Reglas de Negocio + ADR 0006)**: Verificar que tarjetas de clase permitan reservar y cancelar (mostrando claramente si la cancelación es en término o tardía sin jerga técnica), y que un atleta con saldo pendiente (`Moroso`) + membresía vigente conserve el botón `Reservar` activo mientras ve la alerta visual no bloqueante.
- [ ] **Experiencia Mobile-First Bento**: Selector horizontal táctil de días (`min-h-11`, zona horaria del Box), resumen superior de `Créditos disponibles` y estado de membresía en cápsulas Bento (`#111214` / `#18191C`), cards de clase con ocupación en barra `#C1F429` + rayado diagonal y botón CTA principal `#C1F429` (`#000000`).
- [ ] **Estabilidad Sin Confirmaciones Nativas**: Cancelaciones y walk-ins sin `confirm()`/`alert()` nativos ni exposición de códigos técnicos crudos.
- [ ] **Verificación CI / DoD**: Pasar `pnpm lint`, `pnpm typecheck`, `pnpm test` (`Vitest` + todas las suites `playwright-bdd`) y `/code-review`.

## Comments

- *Sin comentarios aún.*
