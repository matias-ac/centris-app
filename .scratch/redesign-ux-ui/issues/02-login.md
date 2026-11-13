# 02 — Rediseño UX/UI de `/login`

**Status:** ready-for-agent
**Branch:** `feat/ui-02-login`
**Blocked by:** `01`

## Contexto

Migra la pantalla pública `/login` al diseño **Dark Bento Cockpit** descrito en el mockup `propuesta-login.html` y su auditoría `impeccable`, priorizando entrada limpia sin ruido visual, inputs `>= 16px` con altura táctil `>= 44px`, CTA principal `#C1F429` con texto `#000000`, accesibilidad de errores de formulario y enlace directo hacia `/activar-cuenta`.

## Fuentes de Verdad

- Crítica Impeccable: [`apps/web/.impeccable/critique/2026-11-13T21-56-00Z__src-app-public-login-page-tsx.md`](../../../apps/web/.impeccable/critique/2026-11-13T21-56-00Z__src-app-public-login-page-tsx.md)
- Mockup aprobado: [`.scratch/propuesta-login.html`](../../propuesta-login.html)
- Design System v2: [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md)

## Archivos Objetivo

- `apps/web/src/app/(public)/login/page.tsx`

## Suites E2E Impactadas

- `apps/web/e2e/features/02-auth-selector-box-y-roles-e2e.feature` / `apps/web/e2e/steps/02-auth-selector-box-y-roles-e2e.steps.ts`

## Acceptance Criteria (TDD / BDD)

- [ ] **Tests en Red $\rightarrow$ Green**: Cubrir validación cliente/servidor y mensajes de error accesibles (`role="alert"`, `aria-invalid`) sin códigos técnicos crudos en UI, preservando los selectores/labels usados por `02-auth-selector-box-y-roles-e2e.steps.ts`.
- [ ] **Layout Bento Public Auth**: Implementar tarjeta centrada `#111214` (`rounded-3xl`, `1px solid #232428`) sobre `#09090B`, tipografía `Inter` en *Sentence case*, inputs `#09090B` (`16px` mínimo, `min-h-11`, `rounded-xl`), botón CTA `#C1F429` con texto `#000000` (`rounded-full`) y navegación hacia `/activar-cuenta`.
- [ ] **Estabilidad Responsive**: Verificar cero overflow horizontal y legibilidad cómoda en mobile (`375px`) y desktop (`1280px` / `1440px`).
- [ ] **Verificación CI / DoD**: Pasar `pnpm lint`, `pnpm typecheck`, `pnpm test` (`Vitest` + `playwright-bdd`) y `/code-review`.

## Comments

- *Sin comentarios aún.*
