# 11: Gestión de Walk-ins en Mostrador por Recepción y Administración E2E

**Épica:** Épica 3 — Operativa Deportiva (Horarios, Clases, Reservas y Asistencias E2E)
**Paralelización:** **Ejecutable en PARALELO** con `10` (Cancelaciones) y `12` (Asistencia del Coach y Consolidación de Ausencias).

**What to build:**
Implementar de punta a punta la operativa de recepción para Atletas espontáneos (*walk-ins*) en Next.js + `shadcn/ui` y NestJS ([ADR 0003](../../../docs/adr/0003-integridad-de-cupos-y-creditos-en-base-de-datos.md), [ADR 0007](../../../docs/adr/0007-cuatro-roles-atomicos-componibles.md)): permitir únicamente a los roles `Recepcionista` y `Administrador` inscribir en el acto a un Atleta en una Clase creando una `Reserva` ordinaria (registrando `creada_por_usuario_id`), aplicando sin excepciones las validaciones transaccionales de `Cupo` y `Créditos`. Si la Clase está llena o el Atleta no tiene Créditos/Membresía vigente, la interfaz guía al staff para editar explícitamente el Cupo de la Clase o regularizar primero la Membresía del Atleta.

**Blocked by:** 09: Motor Transaccional de Reservas del Atleta y Control de Concurrencia E2E

**Status:** ready-for-agent

## Acceptance Criteria (TDD / BDD)

- [ ] **Permisos estrictos para Walk-ins**: **Given** un usuario con rol exclusivo de `Coach`, **When** intenta agregar a un Atleta espontáneo a una Clase desde la API o la interfaz, **Then** recibe `403 Forbidden`; **Given** un `Recepcionista`, `Administrador` o un usuario con roles combinados `['coach', 'recepcionista']`, **When** inscribe al Atleta en mostrador, **Then** se crea una `Reserva` ordinaria registrando al operador en `creada_por_usuario_id`.
- [ ] **Cupo estricto sin sobrecupo automático**: **Given** una `Clase` con Cupos agotados (`20/20`), **When** el `Recepcionista` intenta anotar un *walk-in*, **Then** el sistema rechaza la Reserva por `CupoAgotado`; **When** el `Recepcionista` edita primero la entidad `Clase` aumentando `cupos` a `21` y vuelve a confirmar el *walk-in*, **Then** la Reserva se registra exitosamente (`21/21`).
- [ ] **Créditos estrictos sin deuda de Créditos**: **Given** un Atleta sin `Membresía` vigente o con `0` Créditos restantes en el `Período`, **When** llega al mostrador como *walk-in*, **Then** el sistema rechaza la Reserva con `SinCreditosDisponibles` y ofrece al `Recepcionista` el acceso directo para asignarle una nueva `Membresía` o sumarle `creditos_extra` antes de inscribirlo.
