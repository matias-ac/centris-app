# 09 — Rediseño UX/UI de `/caja` (Caja, Pagos y Morosos)

**Status:** done
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

- [x] **Red $\rightarrow$ Green en E2E (sin `"403 Forbidden"`)**: Actualizar la aserción de acceso denegado en `06-pagos-inmutables-anulaciones-y-morosos-e2e.steps.ts` por el mensaje de permisos en español accesible y verificar registro de pago, saldo pendiente y anulación contable inmutable ([ADR 0006](../../../docs/adr/0006-acceso-desacoplado-del-pago.md)).
- [x] **Integración `/atletas?afiliacionId=`**: Enlazar cada moroso hacia su ficha abierta en `/atletas?afiliacionId=<uuid>` sin perder contexto operativo (en Auditoría, `PagoConRegistrador` solo expone `membresiaId`, acorde al mockup `propuesta-caja.html`).
- [x] **Estabilidad Mobile y Notebook**: En `< 640px`, permitir `flex-wrap: wrap; max-width: 100%; white-space: normal` en los badges KPI del encabezado y renderizar `.audit-row` en grilla de 2 columnas balanceadas sin desbordes ni colapsos; mantener `tabular-nums` en todo monto (`$`), fecha y comprobante, sin `font-mono` en importes.
- [x] **Verificación CI / DoD**: Pasar `pnpm lint`, `pnpm typecheck`, `pnpm test` (`Vitest` + todas las suites `playwright-bdd`) y `/code-review`.

## Comments

- Implementado rediseño Dark Bento Cockpit en `apps/web/src/app/(box)/caja/page.tsx`, `panel-caja-morosos.tsx` y `caja-estado.ts`, con `SideDrawer` para anulación auditable de pagos, `FilterChips` por estado y medio de pago humanos, `AccesoRestringidoCard` sin `"403 Forbidden"`, deep-link a `/atletas?afiliacionId=<uuid>`, unit tests en `caja.spec.tsx` y escenarios BDD completos en `06-pagos-inmutables-anulaciones-y-morosos-e2e`.
- Aplicadas mejoras de `/code-review` (glosario de `GLOSSARY.md`, `role="tabpanel"`/`aria-controls`, validación inline al hacer clic en `Confirmar anulación` y deduplicación de helpers). Verificado en `1440px`, `1280px` y `375px` (`scrollWidth === clientWidth`), `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:unit` y `pnpm test:e2e`.
