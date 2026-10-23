# Diagrama de Entidad-Relación (DER) — Centris (`centris-app` MVP)

Este documento describe el modelo de datos relacional en **PostgreSQL** para el MVP de **Centris** (`centris-app`), alineado con el [`GLOSSARY.md`](../GLOSSARY.md), el [`PRD.md`](./PRD.md) y los registros de decisión arquitectónica ([ADR 0001](./adr/0001-identidad-global-con-afiliacion-por-box.md) al [ADR 0007](./adr/0007-cuatro-roles-atomicos-componibles.md)).

---

## 1. Diagrama Mermaid (`erDiagram`)

```mermaid
erDiagram
    USUARIO {
        uuid id PK
        string email UK "Identidad global única"
        string nombre
        string password_hash "Credencial portable para Auth.js / JWT"
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "Soft delete"
    }

    BOX {
        uuid id PK
        string nombre
        string slug UK
        string timezone "IANA ej: America/Argentina/Buenos_Aires"
        string moneda "ISO 4217 ej: ARS, USD"
        int anticipacion_reserva_dias "Horizonte de reserva"
        int ventana_cancelacion_minutos "Minutos antes de inicio"
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "Soft delete"
    }

    AFILIACION {
        uuid id PK
        uuid box_id FK "RLS tenant key + UK(box_id, id)"
        uuid usuario_id FK "UK(box_id, usuario_id)"
        string_array roles "['administrador','recepcionista','coach','atleta']"
        boolean activo
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "Soft delete"
    }

    PLAN {
        uuid id PK
        uuid box_id FK "RLS tenant key + UK(box_id, id)"
        string nombre
        bigint precio_base "Entero en unidad mínima / numeric"
        int duracion_dias "Duración de Vigencia por defecto"
        string modalidad_creditos "SEMANAL | VIGENCIA_TOTAL | ILIMITADO"
        int creditos_por_periodo "NULL si es ILIMITADO"
        boolean activo
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "Soft delete"
    }

    MEMBRESIA {
        uuid id PK
        uuid box_id FK "RLS tenant key + UK(box_id, id)"
        uuid afiliacion_id FK "FK compuesta (box_id, afiliacion_id)"
        uuid plan_id FK "FK compuesta (box_id, plan_id)"
        bigint precio "Copiado del Plan y ajustable (beca/descuento)"
        string modalidad_creditos "Copiado del Plan al crearse"
        int creditos_por_periodo "Copiado del Plan al crearse"
        int creditos_extra "Ajustes individuales (+/-)"
        date fecha_inicio "En timezone del Box"
        date fecha_fin "En timezone del Box (acortable por Baja Anticipada)"
        timestamptz baja_anticipada_en "NULL si sigue su curso normal"
        uuid baja_por_usuario_id FK "Administrador que ejecutó la baja"
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "Soft delete"
    }

    PAGO {
        uuid id PK
        uuid box_id FK "RLS tenant key + UK(box_id, id)"
        uuid membresia_id FK "FK compuesta (box_id, membresia_id)"
        bigint monto "Inmutable (> 0)"
        string medio_pago "EFECTIVO | TRANSFERENCIA | OTRO"
        date fecha_pago "Fecha de recepción del dinero"
        uuid registrado_por_usuario_id FK "Recepcionista o Administrador"
        timestamptz anulado_en "NULL si es válido (Anulación auditable)"
        uuid anulado_por_usuario_id FK "Administrador que anuló"
        string motivo_anulacion "Obligatorio al anular"
        timestamptz created_at "Inmutable: sin updated_at ni deleted_at"
    }

    TIPO_CLASE {
        uuid id PK
        uuid box_id FK "RLS tenant key + UK(box_id, id)"
        string nombre "Ej: WOD, Halterofilia, Open Box"
        string descripcion
        boolean activo
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "Soft delete"
    }

    HORARIO {
        uuid id PK
        uuid box_id FK "RLS tenant key + UK(box_id, id)"
        uuid tipo_clase_id FK "FK compuesta (box_id, tipo_clase_id)"
        uuid coach_afiliacion_id FK "FK compuesta (box_id, coach_afiliacion_id)"
        int dia_semana "ISO 1 (Lunes) a 7 (Domingo)"
        time hora_inicio "Hora local del Box"
        int duracion_minutos
        int cupos_default "Capacidad por defecto (> 0)"
        boolean activo
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "Soft delete"
    }

    CLASE {
        uuid id PK
        uuid box_id FK "RLS tenant key + UK(box_id, id)"
        uuid horario_id FK "FK compuesta nullable (box_id, horario_id)"
        uuid tipo_clase_id FK "FK compuesta (box_id, tipo_clase_id)"
        uuid coach_afiliacion_id FK "FK compuesta (box_id, coach_afiliacion_id)"
        timestamptz inicio "Materializado desde Horario en timezone del Box"
        timestamptz fin "inicio + duracion"
        int cupos "Nunca menor a reservas confirmadas"
        timestamptz cancelada_en "NULL si está activa"
        uuid cancelada_por_usuario_id FK "Administrador que canceló la Clase"
        string motivo_cancelacion
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "Soft delete"
    }

    RESERVA {
        uuid id PK
        uuid box_id FK "RLS tenant key + UK(box_id, id)"
        uuid clase_id FK "FK compuesta (box_id, clase_id)"
        uuid afiliacion_id FK "Atleta: FK compuesta (box_id, afiliacion_id)"
        uuid membresia_id FK "Membresía que respalda el Crédito"
        uuid creada_por_usuario_id FK "Atleta (autogestión) o Staff (walk-in)"
        string estado "CONFIRMADA | CANCELADA | CANCELADA_TARDIA | CANCELADA_POR_BOX"
        timestamptz asistencia_marcada_en "NULL si no tiene presente"
        uuid asistencia_por_usuario_id FK "Coach, Recepcionista o Administrador"
        timestamptz cancelada_en "Timestamp de cancelación"
        timestamptz created_at
        timestamptz updated_at
    }

    USUARIO ||--o{ AFILIACION : "participa mediante"
    BOX ||--o{ AFILIACION : "aísla (box_id)"
    BOX ||--o{ PLAN : "define catálogo (box_id)"
    BOX ||--o{ MEMBRESIA : "aísla (box_id)"
    BOX ||--o{ PAGO : "aísla caja (box_id)"
    BOX ||--o{ TIPO_CLASE : "clasifica (box_id)"
    BOX ||--o{ HORARIO : "programa (box_id)"
    BOX ||--o{ CLASE : "materializa (box_id)"
    BOX ||--o{ RESERVA : "registra (box_id)"

    AFILIACION ||--o{ MEMBRESIA : "titular (Atleta)"
    PLAN ||--o{ MEMBRESIA : "plantilla origen"
    MEMBRESIA ||--o{ PAGO : "registra cobros"
    MEMBRESIA ||--o{ RESERVA : "consume Crédito de"

    TIPO_CLASE ||--o{ HORARIO : "molde de"
    TIPO_CLASE ||--o{ CLASE : "categoriza"
    AFILIACION ||--o{ HORARIO : "coach por defecto"
    AFILIACION ||--o{ CLASE : "dicta (Coach)"
    HORARIO |o--o{ CLASE : "genera ocurrencias"

    CLASE ||--o{ RESERVA : "ocupa Cupo en"
    AFILIACION ||--o{ RESERVA : "inscribe a (Atleta)"
```

---

## 2. Reglas Estructurales del Esquema en PostgreSQL

### 2.1. Aislamiento Multi-tenant y Row Level Security ([ADR 0004](./adr/0004-aislamiento-por-box-con-rls-en-postgresql.md))
- **Tablas Globales (sin RLS)**: `USUARIO` y `BOX`.
- **Tablas Operativas del Box (con `FORCE ROW LEVEL SECURITY`)**: `AFILIACION`, `PLAN`, `MEMBRESIA`, `PAGO`, `TIPO_CLASE`, `HORARIO`, `CLASE`, `RESERVA`.
- **Política RLS Canónica**:
  ```sql
  ALTER TABLE <tabla> ENABLE ROW LEVEL SECURITY;
  ALTER TABLE <tabla> FORCE ROW LEVEL SECURITY;

  CREATE POLICY box_isolation_policy ON <tabla>
    USING (box_id = current_setting('app.box_id', true)::uuid)
    WITH CHECK (box_id = current_setting('app.box_id', true)::uuid);
  ```
- **Claves Foráneas Compuestas Intra-Box**:
  Cada tabla operativa expone una restricción única `UNIQUE (box_id, id)` y todas las claves foráneas entre tablas operativas referencian el par `(box_id, <entidad>_id)`. Esto garantiza a nivel de motor que una `RESERVA` del `Box A` jamás pueda apuntar a una `CLASE` o `MEMBRESIA` del `Box B`.

### 2.2. Integridad, Soft Deletes e Inmutabilidad Contable
- **Soft Deletes (`deleted_at`)**: Presente en entidades maestras y configurables (`USUARIO`, `BOX`, `AFILIACION`, `PLAN`, `MEMBRESIA`, `TIPO_CLASE`, `HORARIO`, `CLASE`) para preservar la integridad histórica de reportes, asistencias y auditoría sin romper referencias foráneas.
- **Inmutabilidad de `PAGO` ([ADR 0006](./adr/0006-acceso-desacoplado-del-pago.md))**: La tabla `PAGO` **no** utiliza `deleted_at` ni permite `UPDATE` de importes. Un pago erróneo solo admite poblar los campos de **Anulación** (`anulado_en`, `anulado_por_usuario_id`, `motivo_anulacion`).
- **Campos Calculados (No Persistidos)**:
  - **Saldo de Membresía**: `membresia.precio - COALESCE(SUM(pago.monto) FILTER (WHERE pago.anulado_en IS NULL), 0)`.
  - **Estado de Moroso**: Atleta que posee al menos una `MEMBRESIA` no eliminada con `Saldo > 0`.
  - **Ausencia Consolidada**: Toda `RESERVA` con `estado = 'CONFIRMADA'`, `asistencia_marcada_en IS NULL` y donde la hora actual supere `clase.fin + INTERVAL '24 hours'` (Ventana de Corrección de Asistencia vencida).

### 2.3. Constraints de Concurrencia ([ADR 0003](./adr/0003-integridad-de-cupos-y-creditos-en-base-de-datos.md))
- **Unicidad de Reserva Activa**: Índice único parcial `CREATE UNIQUE INDEX uq_reserva_activa ON reservas (box_id, clase_id, afiliacion_id) WHERE estado = 'CONFIRMADA'`.
- **No Superposición de Membresías Vigentes**: Constraint de exclusión GiST (`btree_gist`) sobre `(box_id, afiliacion_id, daterange(fecha_inicio, fecha_fin, '[]')) WHERE deleted_at IS NULL` para garantizar como máximo una `MEMBRESIA` vigente por Atleta en cualquier fecha calendario.
- **Validación Transaccional con `SELECT ... FOR UPDATE`**: En el alta de `RESERVA`, se bloquea primero la fila en `MEMBRESIA` y segundo la fila en `CLASE` dentro de la misma transacción.
