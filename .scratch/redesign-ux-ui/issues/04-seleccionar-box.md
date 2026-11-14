# 04 — Rediseño UX/UI de `/seleccionar-box`

**Status:** done
**Branch:** `feat/ui-04-seleccionar-box`
**Blocked by:** `01`

## Contexto

Migra `/seleccionar-box` a **Dark Bento Cockpit** (`propuesta-seleccionar-box.html`), resolviendo explícitamente el problema de *layout shift* en desktop donde nombres de Box de más de 1 línea o la línea de ubicación/moneda de 1 vs 2 líneas provocaban que las cards cambiaran de tamaño o desalinearan el nombre del Box al alternar el Box activo.

## Fuentes de Verdad

- Crítica Impeccable: [`apps/web/.impeccable/critique/2026-11-13T22-05-00Z__src-app-auth-seleccionar-box-selector-box-card-tsx.md`](../../../apps/web/.impeccable/critique/2026-11-13T22-05-00Z__src-app-auth-seleccionar-box-selector-box-card-tsx.md)
- Mockup aprobado: [`.scratch/propuesta-seleccionar-box.html`](../../propuesta-seleccionar-box.html)
- Design System v2: [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md)

## Archivos Objetivo

- `apps/web/src/app/(auth)/seleccionar-box/page.tsx`
- `apps/web/src/app/(auth)/seleccionar-box/selector-box-card.tsx`

## Suites E2E Impactadas

- `apps/web/e2e/features/02-auth-selector-box-y-roles-e2e.feature` / `apps/web/e2e/steps/02-auth-selector-box-y-roles-e2e.steps.ts`

## Acceptance Criteria (TDD / BDD)

- [x] **Tests en Red $\rightarrow$ Green**: Verificar selección de Box activo, visualización de roles componibles en español ([ADR 0007](../../../docs/adr/0007-cuatro-roles-atomicos-componibles.md)), manejo de estado vacío/error sin jerga técnica y preservación de selectores E2E.
- [x] **Estabilidad anti-salto en Desktop y Mobile**: Separar el eyebrow superior (`moneda` + badge `Activo ahora`) en su propia fila independiente de ancho completo respecto al bloque de nombre del Box + ciudad/zona horaria, reservando altura uniforme en desktop para que cambiar de Box activo o variar la longitud del nombre nunca modifique la altura ni desalinee las cards vecinas.
- [x] **Geometría y Contraste v2**: Cards `#111214` (`rounded-3xl`, borde `#232428`), card activa con realce sutil, roles en `Badge` semánticos y botón de ingreso `#C1F429` (`#000000`) o secundario `min-h-11` (`rounded-full`).
- [x] **Verificación CI / DoD**: Pasar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `/code-review`.

## Comments

- *Sin comentarios aún.*
