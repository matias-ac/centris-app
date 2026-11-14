# 03 — Rediseño UX/UI de `/activar-cuenta`

**Status:** in-progress
**Branch:** `feat/ui-03-activar-cuenta`
**Blocked by:** `01`

## Contexto

Migra `/activar-cuenta` al lenguaje visual **Dark Bento Cockpit** siguiendo `propuesta-activar-cuenta.html` y la crítica `impeccable`, manteniendo consistencia total con `/login`, manejo claro del token de invitación, validación de contraseña sin jerga técnica e inputs `>= 16px` con controles táctiles `>= 44px`.

## Fuentes de Verdad

- Crítica Impeccable: [`apps/web/.impeccable/critique/2026-11-13T22-01-00Z__src-app-public-activar-cuenta-page-tsx.md`](../../../apps/web/.impeccable/critique/2026-11-13T22-01-00Z__src-app-public-activar-cuenta-page-tsx.md)
- Mockup aprobado: [`.scratch/propuesta-activar-cuenta.html`](../../propuesta-activar-cuenta.html)
- Design System v2: [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md)

## Archivos Objetivo

- `apps/web/src/app/(public)/activar-cuenta/page.tsx`

## Suites E2E Impactadas

- `apps/web/e2e/features/02-auth-selector-box-y-roles-e2e.feature` y `apps/web/e2e/features/04-directorio-y-alta-atletas-e2e.feature` (flujos de activación de cuenta por invitación).

## Acceptance Criteria (TDD / BDD)

- [ ] **Tests en Red $\rightarrow$ Green**: Validar flujo de activación exitosa, token faltante/inválido con feedback claro (`role="alert"`) y preservación de selectores E2E existentes.
- [ ] **Estética Dark Bento Cockpit**: Card `#111214` (`rounded-3xl`, borde `#232428`), título `Inter` en *Sentence case*, campo token/contraseña en `#09090B` (`rounded-xl`, `>= 16px`, `min-h-11`), CTA `#C1F429` (`#000000` texto) y enlace de regreso a `/login`.
- [ ] **Estabilidad Responsive**: Verificar en `375px` y `1280px` / `1440px` sin desbordamientos.
- [ ] **Verificación CI / DoD**: Pasar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `/code-review`.

## Comments

- *Sin comentarios aún.*
