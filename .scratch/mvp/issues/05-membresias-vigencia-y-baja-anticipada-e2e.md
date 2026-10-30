# 05: Asignación de Membresías, Renovaciones, Ajustes y Baja Anticipada E2E

**Épica:** Épica 2 — Gestión de Catálogo, Membresías y Caja Inmutable (E2E)
**Paralelización:** **Ejecutable en PARALELO** con `07` y `08` (Tipos de Clase, Horarios y Materialización de Clases de la Épica 3).

**What to build:**
Implementar de punta a punta el ciclo de vida de la `Membresía` de un `Atleta` (migración de tabla `MEMBRESIA` con RLS, FK compuestas y constraint de no solapamiento $\rightarrow$ NestJS + Zod $\rightarrow$ UI en ficha del Atleta en Next.js con `shadcn/ui`). Incluye la asignación de una `Membresía` copiando el `Precio` y condiciones del `Plan` al momento de crearse, la programación de una `Renovación` futura sin solapamiento de `Vigencia`, el ajuste de `creditos_extra` por Recepción/Administración, y las acciones exclusivas de `Administrador`: ajuste de `Precio` (descuentos o becas a `$0`) y `Baja Anticipada`.

**Blocked by:**
- 03: Catálogo de Planes Comerciales E2E
- 04: Alta y Directorio de Atletas por Recepción y Administración E2E

**Status:** in-progress

## Acceptance Criteria (TDD / BDD)

- [ ] **Copia propia de condiciones y Precio**: **Given** un `Plan` activo en el catálogo, **When** un `Recepcionista` o `Administrador` le asigna una `Membresía` a un `Atleta` definiendo `fecha_inicio` (en zona horaria del Box), **Then** la `Membresía` copia `precio`, `modalidad_creditos`, `creditos_por_periodo` y calcula `fecha_fin`; si el `Administrador` modifica luego el `Plan` en el catálogo, la `Membresía` creada permanece inalterada.
- [ ] **Máximo una Membresía vigente por fecha y Renovación futura**: **Given** un Atleta con una `Membresía` cuya `Vigencia` es del `01/11` al `30/11`, **When** se intenta crear otra Membresía con fechas que se solapen (ej. `15/11` al `15/12`), **Then** PostgreSQL/la transacción rechaza la operación; **When** se crea una `Renovación` con inicio el `01/12`, **Then** se guarda exitosamente como Membresía futura.
- [ ] **Separación de permisos entre Recepcionista y Administrador y bolsa `creditos_extra`**: **Given** una `Membresía`, **When** un `Recepcionista` o `Administrador` ajusta `creditos_extra` (bolsa de ajuste para toda la `Vigencia` de la `Membresía`, que no se multiplica ni se renueva cada lunes en planes semanales), **Then** la operación se permite; **When** el `Recepcionista` intenta modificar el `Precio` (descuento/beca a `$0`) o ejecutar una `Baja Anticipada`, **Then** recibe `403 Forbidden`, estando ambas acciones habilitadas únicamente para el `Administrador`.
- [ ] **Baja Anticipada**: **Given** una `Membresía` vigente, **When** un `Administrador` ejecuta su `Baja Anticipada`, **Then** la fecha de fin de `Vigencia` se acorta al día indicado y se registra `baja_anticipada_en` y `baja_por_usuario_id`.
