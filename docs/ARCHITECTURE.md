# Arquitectura del Monorepo y Convenciones Técnicas (`centris-app`)

Este documento establece las convenciones estructurales, de diseño de módulos, contratos HTTP, migraciones y pruebas del monorepo **Centris (`centris-app`)**, alineadas con [`GLOSSARY.md`](../GLOSSARY.md), [`docs/PRD.md`](./PRD.md), [`docs/DER.md`](./DER.md) y los registros de decisión arquitectónica ([ADR 0001](./adr/0001-identidad-global-con-afiliacion-por-box.md) al [ADR 0007](./adr/0007-cuatro-roles-atomicos-componibles.md)).

---

## 1. Herramientas Base y Runtime

- **Runtime**: **Node.js 22 LTS** (fijado en `.nvmrc` y `engines` del `package.json` raíz).
- **Gestor de paquetes**: **`pnpm`** (`pnpm-workspace.yaml`).
- **Orquestador de Monorepo**: **`Turborepo`** (`turbo.json`) para cachear y paralelizar `lint`, `typecheck`, `build` y `test`.
- **Base de Datos**: **PostgreSQL 16** en Docker (`docker-compose.yml`), obligatorio tanto en desarrollo local como en el pipeline de GitHub Actions (`.github/workflows/ci.yml`). Queda prohibido el uso de SQLite o bases en memoria.
- **ORM y Migraciones**: **Drizzle ORM** (`drizzle-orm` + `drizzle-kit` + driver `pg`).
- **Suite de Pruebas**:
  - **`Vitest`** (`.spec.ts`): pruebas unitarias de lógica pura (`packages/shared`, cálculos de zona horaria) y pruebas de estrés de concurrencia (`Promise.all`) contra PostgreSQL real.
  - **`Playwright` + `playwright-bdd`** (`.feature` + `.steps.ts` en `# language: es`): pruebas de aceptación BDD e integración E2E (tanto a nivel API REST + PostgreSQL como a nivel navegador en Next.js).

---

## 2. Estructura Canónica de Carpetas

```text
centris-app/
├── .github/
│   └── workflows/
│       └── ci.yml                  # Lint, Typecheck, Migraciones y Tests con Postgres real
├── .scratch/
│   └── mvp/
│       ├── spec.md                 # Plan maestro de Vertical Slices
│       └── issues/                 # Los 12 tickets E2E (01 a 12)
├── apps/
│   ├── api/                        # Backend REST en NestJS + Drizzle ORM
│   │   ├── drizzle/                # Migraciones SQL generadas/versionadas (0001_*.sql, ...)
│   │   ├── src/
│   │   │   ├── database/           # Conexión Drizzle, schema y wrapper transaccional RLS
│   │   │   ├── common/             # Guards (Auth, Roles), filtros de errores HTTP, pipes Zod
│   │   │   └── modules/            # Módulos profundos por concepto de dominio
│   │   │       ├── auth/
│   │   │       ├── boxes/
│   │   │       ├── afiliaciones/
│   │   │       ├── planes/
│   │   │       ├── atletas/
│   │   │       ├── membresias/
│   │   │       ├── pagos/
│   │   │       ├── tipos-clase/
│   │   │       ├── horarios/
│   │   │       ├── clases/
│   │   │       └── reservas/
│   │   └── test/                   # Tests de integración/concurrencia (.spec.ts) y BDD (.feature/.steps.ts)
│   └── web/                        # Frontend en Next.js (App Router) + shadcn/ui + Auth.js (JWT)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (public)/       # /login, /activar-cuenta
│       │   │   ├── (auth)/         # /seleccionar-box
│       │   │   └── (box)/          # Rutas operativas bajo el Box activo (según los 4 Roles)
│       │   ├── components/         # Componentes shadcn/ui y componentes de dominio
│       │   └── lib/                # Cliente HTTP tipado hacia apps/api, Auth.js config, formateadores
│       └── e2e/                    # Escenarios E2E de navegador con Playwright / playwright-bdd
├── packages/
│   └── shared/                     # Esquemas Zod, tipos, constantes y códigos de error por dominio
│       └── src/
│           ├── errors/             # Códigos de error canónicos de dominio
│           ├── roles/              # Definición de los 4 roles atómicos componibles
│           ├── schemas/            # Un archivo Zod por dominio (planes.schema.ts, reservas.schema.ts...)
│           └── index.ts
├── docs/                           # PRD, DER, ADRs, Arquitectura, Contribución y Design System
├── docker-compose.yml              # PostgreSQL 16 con script de inicialización de roles
├── GLOSSARY.md                     # Lenguaje ubicuo obligatorio
└── AGENTS.md                       # Punto de entrada maestro para agentes e ingenieros
```

---

## 3. Diseño de Módulos Profundos (*Deep Modules* — `/codebase-design`)

Siguiendo la disciplina de [`.agents/skills/codebase-design/SKILL.md`](../.agents/skills/codebase-design/SKILL.md), todos los módulos de `apps/api` y `packages/shared` se diseñan como **módulos profundos** (*mucha funcionalidad e invariantes de negocio detrás de una interfaz pequeña en una costura limpia*):

1. **Prohibición de capas *pass-through* superficiales**:
   - No crear cadenas de clases que solo delegan sin agregar valor (`Controller -> UseCase -> ApplicationService -> DomainService -> Repository -> Dao -> Mapper`).
   - Cada módulo en `apps/api/src/modules/<dominio>/` se compone por defecto de:
     - `<dominio>.controller.ts`: Costura (*seam*) HTTP; valida entrada con pipes Zod de `packages/shared`, verifica roles mediante `@Roles(...)` y delega al servicio.
     - `<dominio>.service.ts`: **Módulo profundo** que encapsula las invariantes del dominio y ejecuta las consultas Drizzle dentro del wrapper transaccional con RLS.
     - `<dominio>.module.ts`: Registro del módulo en NestJS.
2. **El Wrapper Transaccional RLS como Módulo Profundo (`DatabaseService`)**:
   - Toda operación sobre datos de un Box se ejecuta a través de una única interfaz pequeña:
     - `db.withBoxTransaction(boxId, async (tx) => { ... })`: abre una transacción en PostgreSQL, ejecuta como primera sentencia `SET LOCAL app.box_id = '<boxId>'` y entrega el cliente transaccional `tx` de Drizzle.
     - `db.withUsuarioTransaction(usuarioId, async (tx) => { ... })`: usado exclusivamente en la consulta pre-Box de `afiliaciones` durante el login/selector de Box, ejecutando `SET LOCAL app.usuario_id = '<usuarioId>'` ([ADR 0004](./adr/0004-aislamiento-por-box-con-rls-en-postgresql.md)).

---

## 4. Convención de Idioma Ubicuo

Para evitar la fricción de traducir conceptos de negocio entre capas:

| Elemento | Idioma | Ejemplo |
| :--- | :--- | :--- |
| **Tablas y columnas de negocio en PostgreSQL** | **Español (`snake_case`)** según [`DER.md`](./DER.md) | `membresias`, `tipos_clase`, `creditos_por_periodo`, `ventana_cancelacion_minutos` |
| **Columnas técnicas de auditoría y PK** | **Inglés (`snake_case`)** según [`DER.md`](./DER.md) | `id`, `created_at`, `updated_at`, `deleted_at` |
| **Rutas de la API REST** | **Español (`kebab-case` plural)** | `/api/planes`, `/api/membresias`, `/api/tipos-clase`, `/api/reservas` |
| **Clases, Servicios y Esquemas Zod** | **Español sin tildes + sufijo técnico en inglés** | `MembresiasService`, `ReservasController`, `CrearMembresiaSchema` |
| **Archivos `.feature` de `playwright-bdd`** | **Español (`# language: es`)** usando [`GLOSSARY.md`](../GLOSSARY.md) | `Característica:`, `Escenario:`, `Dado`, `Cuando`, `Entonces` |

---

## 5. Contrato Estándar de Errores HTTP y de Dominio

Toda respuesta de error en `apps/api` es formateada por un `ExceptionFilter` global con una estructura JSON predecible para que tanto el frontend (`apps/web`) como las pruebas automatizadas validen por **`errorCode`** y nunca por coincidencias frágiles de texto libre:

```json
{
  "statusCode": 409,
  "errorCode": "CUPO_AGOTADO",
  "message": "La Clase seleccionada no dispone de Cupos libres.",
  "details": null
}
```

### Catálogo de Códigos de Error de Dominio (`packages/shared/src/errors/`)

| `errorCode` | HTTP Status | Significado de Dominio |
| :--- | :---: | :--- |
| `CREDENCIALES_INVALIDAS` | `401` | Email o contraseña incorrectos, o cuenta aún no activada (`password_hash IS NULL`). |
| `CUENTA_YA_ACTIVADA` | `409` | Intento de usar el flujo de activación inicial en un `Usuario` que ya tiene contraseña definida. |
| `BOX_NO_SELECCIONADO` | `400` | Petición a un recurso operativo de Box sin contexto `box_id` activo. |
| `ACCESO_DENEGADO_ROL` | `403` | La `Afiliación` activa del Usuario en el Box no posee ninguno de los roles requeridos para la acción. |
| `MEMBRESIA_SUPERPUESTA` | `409` | El Atleta ya posee una `Membresía` cuya `Vigencia` se solapa con el rango `[fecha_inicio, fecha_fin]` solicitado. |
| `MEMBRESIA_NO_VIGENTE` | `422` | El Atleta no posee una `Membresía` cuya `Vigencia` cubra la fecha local de inicio de la `Clase`. |
| `SIN_CREDITOS_DISPONIBLES` | `422` | El Atleta agotó los `Créditos` del `Período` de la Clase y no posee remanente en `creditos_extra`. |
| `CUPO_AGOTADO` | `409` | `reservas_confirmadas >= clase.cupos` al evaluar la transacción con `SELECT ... FOR UPDATE`. |
| `CUPO_MENOR_A_RESERVAS` | `422` | Intento de editar `clase.cupos` a un número inferior a las Reservas confirmadas actuales. |
| `SUPERPOSICION_HORARIA` | `409` | El Atleta ya tiene otra `Reserva` confirmada en una `Clase` cuyo horario `[inicio, fin)` se solapa. |
| `FUERA_DE_ANTICIPACION` | `422` | La `Clase` está más allá del horizonte de `anticipacion_reserva_dias` configurado por el Box. |
| `CLASE_CANCELADA` | `409` | Intento de operar sobre una `Clase` que fue cancelada por el Box. |
| `VENTANA_CORRECCION_VENCIDA` | `422` | Intento de marcar o rectificar `Asistencia` pasadas más de 24 horas desde `clase.fin`. |
| `PAGO_YA_ANULADO` | `409` | Intento de aplicar una `Anulación` sobre un `Pago` que ya se encuentra anulado. |
| `VALIDACION_FALLIDA` | `400` | Error de validación de esquema Zod en `body`, `query` o `params` (`details` incluye los errores por campo). |

---

## 6. Reglas para Evitar Conflictos en Tickets Paralelos

Dado que el plan maestro ([`.scratch/mvp/spec.md`](../.scratch/mvp/spec.md)) habilita la ejecución paralela en fases como `03 || 04 || 07`, `05 || 08` y `10 || 11 || 12`:

1. **Esquema Drizzle y Migraciones**:
   - En `apps/api/src/database/schema/`, definir un archivo por tabla/dominio (`boxes.schema.ts`, `usuarios.schema.ts`, `afiliaciones.schema.ts`, `planes.schema.ts`, `membresias.schema.ts`, `pagos.schema.ts`, `tipos-clase.schema.ts`, `horarios.schema.ts`, `clases.schema.ts`, `reservas.schema.ts`) re-exportados desde `schema/index.ts`.
   - Numerar las migraciones SQL prefijando el orden del ticket (`0001_core_rls.sql`, `0003_planes.sql`, `0004_atletas.sql`, `0005_membresias.sql`, `0006_pagos.sql`, `0007_tipos_y_horarios.sql`, `0008_clases.sql`, `0009_reservas.sql`).
2. **Esquemas Compartidos (`packages/shared`)**:
   - Cada ticket crea o edita únicamente el archivo de su propio dominio bajo `packages/shared/src/schemas/<dominio>.schema.ts`.
3. **Pruebas BDD (`playwright-bdd`)**:
   - Cada ticket mantiene su propio archivo `.feature` y `.steps.ts` nombrado con el número y slug del ticket (ej. `03-catalogo-planes.feature` y `03-catalogo-planes.steps.ts`), compartiendo únicamente los *fixtures* base de autenticación y conexión a base de datos.
