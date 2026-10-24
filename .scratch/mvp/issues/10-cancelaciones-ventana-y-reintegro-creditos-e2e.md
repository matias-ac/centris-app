# 10: Cancelación de Reservas, Cancelación Tardía, Liberación sin Waitlist y Cancelación de Clase por el Box E2E

**Épica:** Épica 3 — Operativa Deportiva (Horarios, Clases, Reservas y Asistencias E2E)
**Paralelización:** **Ejecutable en PARALELO** con `11` (Walk-ins en Mostrador) y `12` (Asistencia del Coach y Consolidación de Ausencias).

**What to build:**
Implementar de punta a punta todos los flujos de cancelación de `Reservas` y `Clases` (BD $\rightarrow$ NestJS $\rightarrow$ Next.js + `shadcn/ui`): cancelación en término por el `Atleta` antes de la `Ventana de Cancelación` (liberando el `Cupo` y devolviendo el `Crédito`), `Cancelación Tardía` dentro de la ventana (liberando el `Cupo` sin devolver el `Crédito`), liberación inmediata en grilla bajo modalidad *first-come, first-served* (sin Lista de Espera), cancelación de una `Clase` puntual por el `Administrador` con reintegro total de Créditos a todos los inscriptos (incluso dentro de la ventana), y cancelación automática de Reservas futuras al ejecutar una `Baja Anticipada`.

**Blocked by:** 09: Motor Transaccional de Reservas del Atleta y Control de Concurrencia E2E

**Status:** ready-for-agent

## Acceptance Criteria (TDD / BDD)

- [ ] **Cancelación en término vs. Cancelación Tardía**: **Given** un Box con `ventana_cancelacion_minutos = 120`, **When** el `Atleta` cancela su Reserva `125` minutos antes de `clase.inicio`, **Then** el estado pasa a `CANCELADA`, el Cupo se libera y el Crédito vuelve a estar disponible en el Período; **When** cancela `90` minutos antes de `clase.inicio`, **Then** la UI advierte y registra `CANCELADA_TARDIA`, liberando el Cupo pero manteniendo el Crédito consumido.
- [ ] **Liberación inmediata sin Lista de Espera (*First-Come, First-Served*)**: **Given** una `Clase` con Cupos agotados (`15/15`), **When** un Atleta cancela su Reserva (en término o tardía), **Then** la Clase pasa inmediatamente a `14/15` en la grilla y el primer Atleta que presione "Reservar" obtiene el Cupo sin que exista cola ni promoción de lista de espera.
- [ ] **Cancelación de Clase por el Box con reintegro absoluto de Créditos**: **Given** una `Clase` que comienza en `30` minutos (ya dentro de la `Ventana de Cancelación`) con `10` Reservas confirmadas, **When** el `Administrador` cancela la Clase por un imprevisto del Box, **Then** todas las Reservas activas pasan a `CANCELADA_POR_BOX` en la misma transacción y los `10` Atletas recuperan íntegramente su Crédito.
- [ ] **Efecto cascada de Baja Anticipada sobre Reservas futuras**: **Given** un Atleta con Reservas confirmadas para la próxima semana, **When** el `Administrador` ejecuta una `Baja Anticipada` de su Membresía con fecha de hoy, **Then** todas las Reservas posteriores a la nueva `fecha_fin` se cancelan automáticamente liberando sus Cupos.
