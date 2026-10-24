# 08: Materialización de Clases en Zona Horaria del Box y Edición Manual de Clases E2E

**Épica:** Épica 3 — Operativa Deportiva (Horarios, Clases, Reservas y Asistencias E2E)
**Paralelización:** **Ejecutable en PARALELO** con `05` y `06` (Membresías y Pagos de la Épica 2).

**What to build:**
Implementar de punta a punta la generación y gestión de `Clases` concretas a partir de los `Horarios` recurrentes ([ADR 0002](../../../docs/adr/0002-clases-materializadas-desde-horario.md), [ADR 0005](../../../docs/adr/0005-calculos-de-calendario-en-zona-horaria-del-box.md)): migración de tabla `CLASE` con RLS y `timestamptz`, proceso de materialización multi-Box que itera Box por Box fijando `SET LOCAL app.box_id` hasta cubrir el horizonte de generación ($\ge$ `anticipacion_reserva_dias`), regeneración selectiva ante cambios en el `Horario` y pantalla en Next.js + `shadcn/ui` para visualizar el calendario de Clases y editar ocurrencias puntuales (cambiar `Coach` suplente, horario o `Cupos`).

**Blocked by:** 07: Tipos de Clase y Grilla de Horarios Recurrentes E2E

**Status:** ready-for-agent

## Acceptance Criteria (TDD / BDD)

- [ ] **Materialización exacta en zona horaria IANA del Box**: **Given** un Box con `timezone = 'America/Argentina/Buenos_Aires'` (`UTC-3`) y un `Horario` para el lunes a las `07:00` de `60` minutos, **When** corre el proceso de materialización de Clases, **Then** se inserta de forma idempotente la fila en `CLASE` con `inicio = 'YYYY-MM-DD 10:00:00+00'` (`07:00-03`) y `fin = 'YYYY-MM-DD 11:00:00+00'`, ejecutando dentro de una transacción con `SET LOCAL app.box_id`.
- [ ] **Independencia entre `Clase` materializada y `Horario`**: **Given** una `Clase` ya generada para el viernes a las `19:00`, **When** un `Administrador` cambia el `Coach` por un suplente o un `Recepcionista`/`Administrador` incrementa los `Cupos` de esa Clase puntual desde `apps/web`, **Then** el `Horario` recurrente no se altera; **When** se modifica el `Horario` recurrente, **Then** solo se actualizan o regeneran las Clases futuras que no tengan Reservas activas.
- [ ] **Invariante de reducción de Cupos**: **Given** una `Clase` que ya cuenta con $N$ Reservas confirmadas, **When** se intenta editar `clase.cupos` a un valor menor que $N$, **Then** la validación transaccional rechaza el cambio.
