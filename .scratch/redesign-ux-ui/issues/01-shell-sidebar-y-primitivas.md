# 01 — Shell Autenticado, Sidebar Vertical v2 y Primitivas Bento

**Status:** in-progress
**Branch:** `feat/ui-01-shell-sidebar-y-primitivas`
**Blocked by:** —

## Contexto

Es la rama fundacional obligatoria antes de migrar cualquiera de las 12 pantallas. Actualiza tokens Tailwind v4 (`#09090B` / `#111214` / `#18191C` / `#C1F429`), elimina `Oswald` dejando únicamente `Inter` (`300`, `400`, `500`, `600`) en *Sentence case*, rediseña las primitivas en `apps/web/src/components/ui/` como módulos profundos y actualiza el shell `(box)/layout.tsx` al diseño **Dark Bento Cockpit** (`propuesta-shell-inicio.html`), conservando todos los `data-testid` existentes para mantener verde el 100% de las suites E2E actuales.

## Fuentes de Verdad

- Spec maestra: [`.scratch/redesign-ux-ui/spec.md`](../spec.md)
- Design System v2: [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md) y [`apps/web/DESIGN.md`](../../../apps/web/DESIGN.md)
- Mockup aprobado: [`.scratch/propuesta-shell-inicio.html`](../../propuesta-shell-inicio.html)

## Archivos Objetivo

- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/card.tsx`
- `apps/web/src/components/ui/badge.tsx`
- `apps/web/src/components/ui/input.tsx`
- `apps/web/src/components/ui/label.tsx`
- `apps/web/src/components/ui/select.tsx` *(nuevo o estilizado v2)*
- `apps/web/src/components/ui/inline-confirm.tsx` *(nuevo módulo profundo sin `window.confirm`)*
- `apps/web/src/components/ui/side-drawer.tsx` *(nuevo módulo profundo accesible con `Escape` + focus)*
- `apps/web/src/components/ui/filter-chips.tsx` *(nuevo módulo profundo con `aria-pressed` y wrap)*
- `apps/web/src/app/(box)/layout.tsx`
- `apps/web/src/app/(box)/selector-box-header.tsx`

## Suites E2E Impactadas

- Regresión transversal completa (`01` a `12`), en especial `02-auth-selector-box-y-roles-e2e.feature` (navegación por rol, nombre del Box activo y badges de rol).

## Acceptance Criteria (TDD / BDD)

- [ ] **Tokens y Tipografía Única**: En **Red $\rightarrow$ Green**, actualizar `globals.css` y `layout.tsx` cargando únicamente `Inter` (`300`, `400`, `500`, `600`), eliminando `Oswald`, aplicando `#09090B` / `#111214` / `#18191C` / `#232428` / `#C1F429` (`#000000` foreground) y respetando fuente `>= 16px` (`text-base`) en inputs/selects/textareas.
- [ ] **Primitivas UI Profundas (Vitest)**: Escribir specs unitarias (`Vitest`) en Red $\rightarrow$ Green para `Button` (`min-h-11`, `rounded-full`, variantes `primary` negro sobre `#C1F429`, `secondary`, `destructive`, `ghost`, `iconCircle`), `Badge` (`mint`, `amber`, `coral`, `zinc`, `volt`), `Card` (`rounded-3xl`, borde `#232428`), `InlineConfirm` (dispara confirmación y cancelación sin usar `window.confirm` ni `alert`), `SideDrawer` (cierra con `Escape` y backdrop) y `FilterChips`.
- [ ] **Shell `(box)/layout.tsx` Dark Bento Cockpit**: Implementar sidebar vertical izquierdo (`248px` en `>= 1024px`) mostrando **ícono + nombre visible** en *Sentence case* filtrado por roles ([ADR 0007](../../../docs/adr/0007-cuatro-roles-atomicos-componibles.md)), estado activo `#C1F429` + `#000000`, `Configuración` al pie, drawer táctil en `< 1024px` (`min-h-11`) y topbar de cápsulas con `selector-box-header.tsx` + cierre de sesión.
- [ ] **Contrato `data-testid` intacto**: Conservar `box-activo-nombre`, `roles-activos-badges` y todos los `nav-link-*` existentes en desktop y mobile sin regresiones.
- [ ] **Verificación CI / DoD**: Pasar `pnpm lint`, `pnpm typecheck`, `pnpm test` (`Vitest` + las 12 suites `playwright-bdd`) y `/code-review`.

## Comments

- *Sin comentarios aún.*
