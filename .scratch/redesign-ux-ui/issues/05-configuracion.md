# 05 — Rediseño UX/UI de `/configuracion`

**Status:** in-progress
**Branch:** `feat/ui-05-configuracion`
**Blocked by:** `01`

## Contexto

Migra `/configuracion` a **Dark Bento Cockpit** (`propuesta-configuracion.html`), organizando identidad del Box, zona horaria ([ADR 0005](../../../docs/adr/0005-calculos-de-calendario-en-zona-horaria-del-box.md)) y reglas de reservas/cancelaciones/asistencia en tarjetas Bento limpias. Corrige específicamente el desalineado horizontal en mobile dentro de *Reglas de reservas y cancelaciones* donde *Anticipación mínima* y *Ventana de cancelación* quedaban desnivelados.

## Fuentes de Verdad

- Crítica Impeccable: [`apps/web/.impeccable/critique/2026-11-13T21-50-00Z__src-app-box-configuracion-formulario-configuracion-box-tsx.md`](../../../apps/web/.impeccable/critique/2026-11-13T21-50-00Z__src-app-box-configuracion-formulario-configuracion-box-tsx.md)
- Mockup aprobado: [`.scratch/propuesta-configuracion.html`](../../propuesta-configuracion.html)
- Design System v2: [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md)

## Archivos Objetivo

- `apps/web/src/app/(box)/configuracion/page.tsx`
- `apps/web/src/app/(box)/configuracion/formulario-configuracion-box.tsx`

## Suites E2E Impactadas

- Regresión completa y flujos que consumen parámetros del Box (`02`, `09`, `10`).

## Acceptance Criteria (TDD / BDD)

- [ ] **Tests en Red $\rightarrow$ Green**: Validar renderizado de parámetros del Box, actualización exitosa con confirmación accesible (sin `alert()`) y validaciones numéricas sin mensajes técnicos crudos.
- [ ] **Responsive sin desalineación (`.two-cols` + `.field-label`)**: En viewport `< 768px`, apilar pares de campos `.two-cols` a 1 columna; en `>= 768px`, alinear etiquetas superiores (`.field-label`) para que los inputs horizontales (*Anticipación...* y *Ventana...*) arranquen exactamente a la misma altura aunque un label ocupe 2 líneas.
- [ ] **Tipografía y Números**: Inputs `>= 16px`, valores numéricos con `tabular-nums`, sin guiones largos decorativos excesivos (*em-dash*) y contraste v2 `#111214` / `#18191C` / `#C1F429`.
- [ ] **Verificación CI / DoD**: Pasar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `/code-review`.

## Comments

- *Sin comentarios aún.*
