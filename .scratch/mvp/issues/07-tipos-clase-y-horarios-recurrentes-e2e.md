# 07: Tipos de Clase y Grilla de Horarios Recurrentes E2E

**Épica:** Épica 3 — Operativa Deportiva (Horarios, Clases, Reservas y Asistencias E2E)
**Paralelización:** **Ejecutable en PARALELO** con toda la Épica 2 (`03`, `04`, `05`, `06`), ya que solo depende del Ticket `02`.

**What to build:**
Permitir al `Administrador` configurar la oferta deportiva recurrente del Box de punta a punta (migración de tablas `TIPO_CLASE` y `HORARIO` con `FORCE ROW LEVEL SECURITY`, FKs compuestas y *Soft Delete* $\rightarrow$ endpoints NestJS + Zod $\rightarrow$ interfaz de catálogo de Tipos de Clase y armador de grilla semanal de `Horarios` en Next.js con `shadcn/ui`).

**Blocked by:** 02: Identidad Global, Autenticación, Selector de Box y Guard de 4 Roles Componibles E2E

**Status:** ready-for-agent

## Acceptance Criteria (TDD / BDD)

- [ ] **CRUD de `Tipo de Clase` con RLS y Soft Delete**: **Given** un `Administrador`, **When** crea, edita o desactiva (`deleted_at`) un `Tipo de Clase` (ej. *WOD*, *Halterofilia*, *Open Box*), **Then** queda disponible para configurar `Horarios` en su Box, mientras que un `Recepcionista`, `Coach` o `Atleta` recibe `403 Forbidden` ante intentos de mutación.
- [ ] **Definición de `Horario` en hora local del Box**: **Given** un `Tipo de Clase` activo y un usuario con rol `Coach` en el Box, **When** el `Administrador` crea un `Horario` definiendo `dia_semana` (1 a 7), `hora_inicio` local (ej. `07:00`), `duracion_minutos` (ej. `60`), `cupos_default > 0` y `coach_afiliacion_id`, **Then** el registro se valida con Zod y se persiste con integridad referencial compuesta `(box_id, ...)`.
- [ ] **Validación de Coach perteneciente al Box**: **Given** un intento de asignar como `coach_afiliacion_id` de un `Horario` a una Afiliación de otro Box o que no posee el rol `'coach'`, **Then** la validación y la FK compuesta en PostgreSQL rechazan la operación.
- [ ] **Visualización de la plantilla semanal**: En `apps/web`, el `Administrador` visualiza la grilla semanal de `Horarios` ordenada por día y hora local y puede activar, editar o dar de baja lógica cualquier bloque recurrente.
