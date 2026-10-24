# 12: Panel del Coach, Marcado de Asistencia, Ventana de 24 hs y Consolidación de Ausencias E2E

**Épica:** Épica 3 — Operativa Deportiva (Horarios, Clases, Reservas y Asistencias E2E)
**Paralelización:** **Ejecutable en PARALELO** con `10` (Cancelaciones) y `11` (Walk-ins en Mostrador).

**What to build:**
Implementar de punta a punta la experiencia operativa del `Coach` (y del staff de `Recepción`/`Administración`) para pasar lista y cerrar la asistencia de las `Clases` (BD $\rightarrow$ NestJS $\rightarrow$ Next.js + `shadcn/ui`): vista de agenda de Clases asignadas al Coach y lista de Atletas con `Reserva` confirmada, marcado y desmarcado de `Asistencia` (`asistencia_marcada_en`, `asistencia_por_usuario_id`) habilitado únicamente hasta vencer la `Ventana de Corrección de Asistencia` (`24 horas` después de `clase.fin`), y consolidación automática como `Ausencia` para toda Reserva confirmada sin presente una vez expiradas las 24 horas.

**Blocked by:** 09: Motor Transaccional de Reservas del Atleta y Control de Concurrencia E2E

**Status:** ready-for-agent

## Acceptance Criteria (TDD / BDD)

- [ ] **Visibilidad acotada del Coach**: **Given** un usuario con rol exclusivo de `Coach`, **When** ingresa al panel en `apps/web`, **Then** visualiza únicamente sus `Clases` asignadas y la lista de Atletas con Reserva confirmada en ellas, sin ver Saldos, Pagos ni configuración del Box, y no puede marcar asistencia en Clases dictadas por otro Coach (mientras que `Recepcionista` y `Administrador` sí pueden hacerlo en cualquier Clase del Box).
- [ ] **Marcado y rectificación dentro de la Ventana de Corrección de Asistencia (24 hs)**: **Given** una `Clase` iniciada o finalizada hace menos de `24 horas`, **When** el `Coach`, `Recepcionista` o `Administrador` marca o desmarca el presente de un Atleta con Reserva confirmada, **Then** se actualiza `asistencia_marcada_en` y `asistencia_por_usuario_id`.
- [ ] **Cierre estricto tras 24 horas y consolidación de Ausencia**: **Given** una `Clase` cuyo `clase.fin` ocurrió hace más de `24 horas`, **When** un `Coach` o `Recepcionista` intenta modificar la `Asistencia`, **Then** la API rechaza la operación por vencimiento de la `Ventana de Corrección de Asistencia`; **And** toda `Reserva` confirmada que haya quedado con `asistencia_marcada_en IS NULL` se expone automáticamente como **Ausencia** consolidada en el historial del Atleta y en los reportes del Box, perdiendo definitivamente el Crédito consumido.
