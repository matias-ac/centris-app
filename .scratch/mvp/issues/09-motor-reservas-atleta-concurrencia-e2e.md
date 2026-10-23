# 09: Motor Transaccional de Reservas del Atleta y Control de Concurrencia E2E

**Épica:** Épica 3 — Operativa Deportiva (Horarios, Clases, Reservas y Asistencias E2E)
**Paralelización:** Punto de convergencia entre Épica 2 (`05`) y Épica 3 (`08`). **Ejecutable en PARALELO** con `06` (Pagos Inmutables y Morosos).

**What to build:**
Implementar de punta a punta el motor de `Reservas` con integridad garantizada en PostgreSQL ([ADR 0003](../../../docs/adr/0003-integridad-de-cupos-y-creditos-en-base-de-datos.md), [ADR 0005](../../../docs/adr/0005-calculos-de-calendario-en-zona-horaria-del-box.md)) y la experiencia *mobile-first* del `Atleta` en Next.js + `shadcn/ui`. El alta de una `Reserva` bloquea en orden canónico primero la `Membresía` y luego la `Clase` (`SELECT ... FOR UPDATE`), valida `Anticipación de Reserva`, `Vigencia` en la fecha de la Clase, `Cupos` libres, `Créditos` disponibles en el `Período` (lunes `00:00` a domingo `23:59:59` en timezone del Box, sin prorrateo) y ausencia de superposición horaria, sin bloquear jamás por deuda (`Saldo > 0`).

**Blocked by:**
- 05: Asignación de Membresías, Renovaciones, Ajustes y Baja Anticipada E2E
- 08: Materialización de Clases en Zona Horaria del Box y Edición Manual de Clases E2E

**Status:** ready-for-agent

## Acceptance Criteria (TDD / BDD)

- [ ] **Prueba de concurrencia con bloqueo en orden canónico (`Membresía` $\rightarrow$ `Clase`)**: **Given** una `Clase` con `1` solo `Cupo` libre y `10` Atletas distintos con Membresía válida disparando peticiones de Reserva simultáneas (`Promise.all`), **When** compiten en PostgreSQL, **Then** exactamente `1` transacción confirma la Reserva y las `9` restantes reciben error `CupoAgotado`, quedando `reservas_confirmadas == clase.cupos` sin *deadlocks*.
- [ ] **Prueba de concurrencia de Créditos y no superposición del mismo Atleta**: **Given** un Atleta al que le queda `1` solo `Crédito` en el `Período` (o que intenta reservar dos Clases que se solapan en horario) enviando `5` peticiones simultáneas desde distintos dispositivos, **When** el bloqueo `FOR UPDATE` sobre `MEMBRESIA` serializa sus transacciones, **Then** solo `1` Reserva se confirma y las demás son rechazadas sin generar saldo negativo de Créditos ni reservas superpuestas.
- [ ] **Corte de Período semanal en zona horaria del Box**: **Given** un Box en `America/Argentina/Buenos_Aires` y una Clase el domingo a las `22:30` hora local (`lunes 01:30 UTC`), **When** el Atleta reserva esa Clase, **Then** el Crédito se descuenta del Período semanal que termina ese domingo a las `23:59:59` local (y no de la semana siguiente); además, puede reservar una Clase de la semana siguiente usando su Membresía vigente o su Membresía de `Renovación` futura si la fecha de la Clase cae en ella.
- [ ] **Acceso desacoplado del Pago**: **Given** un Atleta `Moroso` (`Saldo > 0` por no tener Pagos registrados), **When** reserva una Clase desde su interfaz móvil en `apps/web` dentro de su `Vigencia` y con `Créditos` disponibles, **Then** la Reserva se confirma sin ninguna restricción ni bloqueo.
