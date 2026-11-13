# 06 — Rediseño UX/UI de `/afiliaciones`

**Status:** ready-for-agent
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

- [ ] **Tests en Red $\rightarrow$ Green**: Verificar alta/invitación, conmutación de los 4 roles (`Administrador`, `Recepcionista`, `Coach`, `Atleta`), estado `"Sin guardar"` al editar, persistencia al guardar y preservación de selectores usados en `02-auth-selector-box-y-roles-e2e.steps.ts`.
- [ ] **Estabilidad de Filas (`0` desplazamiento de `Guardar roles`)**: En desktop, usar tracks de grilla fijos con columna dedicada de acciones (`264px`) y franja contextual inferior (`.dirty-strip` con borde superior sutil o espacio fijo reservado) para indicar cambios pendientes sin mover ni comprimir el botón `Guardar roles` ni las columnas vecinas; en mobile, mantener ancho completo consistente y acciones `min-h-11`.
- [ ] **Bento y Controles Táctiles**: Chips de rol componibles accesibles (`aria-pressed`, `min-h-11`), invitación en panel/card Bento `#111214` sin exposición de errores HTTP crudos.
- [ ] **Verificación CI / DoD**: Pasar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `/code-review`.

## Comments

- *Sin comentarios aún.*
