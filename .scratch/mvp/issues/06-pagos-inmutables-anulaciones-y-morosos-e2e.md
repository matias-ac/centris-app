# 06: Caja Contable de Pagos Inmutables, Anulaciones Auditables y Reporte de Morosos E2E

**Épica:** Épica 2 — Gestión de Catálogo, Membresías y Caja Inmutable (E2E)
**Paralelización:** **Ejecutable en PARALELO** con `08` y `09` (Operativa de Clases y Motor de Reservas de la Épica 3), gracias al desacople entre acceso y pago ([ADR 0006](../../../docs/adr/0006-acceso-desacoplado-del-pago.md)).

**What to build:**
Implementar de punta a punta el módulo contable del Box (migración de tabla inmutable `PAGO` bajo RLS $\rightarrow$ NestJS + Zod $\rightarrow$ UI de Caja, Pagos y Morosos en Next.js con `shadcn/ui`). Permite a `Recepcionista` y `Administrador` registrar `Pagos` (totales o parciales) sobre una `Membresía`, calcula en tiempo real el `Saldo` derivado (`Precio − Σ Pagos no anulados`), expone el listado e indicador visual de Atletas `Morosos` (`Saldo > 0`) y permite exclusivamente al `Administrador` auditar la caja y corregir errores mediante una `Anulación` auditable.

**Blocked by:** 05: Asignación de Membresías, Renovaciones, Ajustes y Baja Anticipada E2E

**Status:** ready-for-agent

## Acceptance Criteria (TDD / BDD)

- [ ] **Inmutabilidad de `PAGO` y Pagos Parciales**: **Given** una `Membresía` con `Precio = $30.000`, **When** un `Recepcionista` registra un primer `Pago` en efectivo de `$15.000` y luego otro por transferencia de `$10.000`, **Then** ambos eventos quedan grabados de forma inmutable (sin endpoints ni métodos de edición o borrado físico/lógico) y el `Saldo` calculado de la Membresía es exactamente `$5.000`.
- [ ] **Saldo derivado y estado de Moroso**: **Given** un Atleta con al menos una `Membresía` cuyo `Saldo > 0`, **When** el `Recepcionista` o `Administrador` consulta la ficha del Atleta o el reporte de `Morosos` en `apps/web`, **Then** el Atleta aparece identificado como `Moroso` con su deuda exacta calculada dinámicamente sin existir una columna `saldo` persistida que pueda desincronizarse.
- [ ] **Anulación exclusiva de Administrador**: **Given** un `Pago` registrado por error, **When** un `Recepcionista` intenta anularlo, **Then** recibe `403 Forbidden`; **When** un `Administrador` ejecuta la `Anulación` ingresando un motivo obligatorio (validado con Zod), **Then** el Pago queda marcado con `anulado_en`, `anulado_por_usuario_id` y `motivo_anulacion`, deja de restar en el `Saldo` de la Membresía y permanece visible en el historial de auditoría de caja.
- [ ] **Invisibilidad financiera para el Coach**: **Given** un usuario con rol exclusivo de `Coach`, **When** intenta consultar endpoints o pantallas de `Pagos`, `Saldos` o `Morosos`, **Then** recibe `403 Forbidden`.
