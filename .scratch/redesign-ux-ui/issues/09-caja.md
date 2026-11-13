# 09 — Rediseño UX/UI de `/caja` (Caja, Pagos y Morosos)

**Status:** ready-for-agent
**Branch:** `feat/ui-09-caja`
**Blocked by:** `01`, `08`

## Contexto

Migra `/caja` a **Dark Bento Cockpit** (`propuesta-caja.html`), combinando resumen financiero del período, listado accionable de `Morosos`, historial inmutable de `Pagos` con anulación ([ADR 0006](../../../docs/adr/0006-acceso-desacoplado-del-pago.md)) y enlace directo hacia la ficha del atleta en `/atletas?afiliacionId=<uuid>` (Ticket `08`). Incluye los fixes móviles validados para KPI badges y filas de auditoría (`.audit-row`) en 2 columnas balanceadas, además de eliminar `"403 Forbidden"` de la UI visible.

> [!IMPORTANT]
> `apps/web/e2e/steps/06-pagos-inmutables-anulaciones-y-morosos-e2e.steps.ts` (línea ~312) afirma `await expect(page.getByText("403 Forbidden")).toBeVisible()`. Debe actualizarse en **Red $\rightarrow$ Green** antes de cambiar el banner visible.

## Fuentes de Verdad

- Crítica Impeccable: [`apps/web/.impeccable/critique/2026-11-13T21-35-00Z__src-app-box-caja-panel-caja-morosos-tsx.md`](../../../apps/web/.impeccable/critique/2026-11-13T21-35-00Z__src-app-box-caja-panel-caja-morosos-tsx.md)
- Mockup aprobado: [`.scratch/propuesta-caja.html`](../../propuesta-caja.html)
- Design System v2: [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md)

## Archivos Objetivo

- `apps/web/src/app/(box)/caja/page.tsx`
- `apps/web/src/app/(box)/caja/panel-caja-morosos.tsx`
- `apps/web/e2e/steps/06-pagos-inmutables-anulaciones-y-morosos-e2e.steps.ts`

## Suites E2E Impactadas

- `apps/web/e2e/features/06-pagos-inmutables-anulaciones-y-morosos-e2e.feature`

## Acceptance Criteria (TDD / BDD)

- [ ] **Red $\rightarrow$ Green en E2E (sin `"403 Forbidden"`)**: Actualizar la aserción de acceso denegado en `06-pagos-inmutables-anulaciones-y-morosos-e2e.steps.ts` por el mensaje de permisos en español accesible (`role="alert"`) y verificar registro de pago, saldo pendiente y anulación contable inmutable ([ADR 0006](../../../docs/adr/0006-acceso-desacoplado-del-pago.md)).
- [ ] **Integración `/atletas?afiliacionId=`**: Enlazar cada moroso o movimiento hacia su ficha abierta en `/atletas?afiliacionId=<uuid>` sin perder contexto operativo.
- [ ] **Estabilidad Mobile y Notebook**: En `< 640px`, permitir `flex-wrap: wrap; max-width: 100%; white-space: normal` en los badges KPI del encabezado y renderizar `.audit-row` en grilla de 2 columnas balanceadas sin desbordes ni colapsos; mantener `tabular-nums` en todo monto (`$`), fecha y comprobante, sin `font-mono` en importes.
- [ ] **Verificación CI / DoD**: Pasar `pnpm lint`, `pnpm typecheck`, `pnpm test` (`Vitest` + todas las suites `playwright-bdd`) y `/code-review`.

## Comments

- *Sin comentarios aún.*
