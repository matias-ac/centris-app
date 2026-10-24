# Centris (`centris-app`) — Functional Training SaaS MVP

**Centris** es una plataforma web multitenant diseñada para que **Boxes** de CrossFit, centros de entrenamiento funcional y gimnasios boutique gestionen su catálogo de **Planes**, **Membresías**, **Pagos** inmutables, **Horarios**, **Clases**, **Reservas** y **Asistencias**.

> **Contexto del Proyecto**: Este repositorio (`centris-app`) aloja el Sistema de Gestión core (monorepo con Backend en **NestJS** y Frontend en **Next.js**), desarrollado como MVP productivo y **Proyecto Integrador** de la carrera de *Técnico Superior en Desarrollo de Software*. El sitio comercial público (`centris-landing`) vive en un repositorio independiente fuera de este alcance.

---

## 1. Características Principales de Arquitectura y Dominio

1. **Identidad Global con Aislamiento Estricto por Box (PostgreSQL RLS)**:
   - Un **Usuario** posee una única cuenta global y se vincula a uno o múltiples **Boxes** mediante una **Afiliación** ([ADR 0001](./docs/adr/0001-identidad-global-con-afiliacion-por-box.md)).
   - El aislamiento multitenant se garantiza en base de datos mediante **Row Level Security forzado** (`ENABLE` y `FORCE ROW LEVEL SECURITY`), claves foráneas compuestas con `box_id` y variables de contexto por transacción (`SET LOCAL app.box_id` / `SET LOCAL app.usuario_id`) sobre un rol de aplicación sin privilegios `BYPASSRLS` ([ADR 0004](./docs/adr/0004-aislamiento-por-box-con-rls-en-postgresql.md)).
2. **4 Roles Atómicos Componibles**:
   - Cada **Afiliación** combina libremente los roles `Administrador`, `Recepcionista`, `Coach` y `Atleta` ([ADR 0007](./docs/adr/0007-cuatro-roles-atomicos-componibles.md)).
3. **Acceso Desacoplado del Pago y Contabilidad Inmutable**:
   - La **Membresía** vigente y con **Créditos** habilita la **Reserva** sin bloquear al **Atleta** por tener deuda pendiente (**Moroso**).
   - Los **Pagos** son eventos contables inmutables (solo corregibles mediante **Anulación** auditable por un `Administrador`) y el **Saldo** se calcula siempre como `Precio − Σ Pagos no anulados` ([ADR 0006](./docs/adr/0006-acceso-desacoplado-del-pago.md)).
4. **Integridad Transaccional de Cupos, Créditos y Zona Horaria**:
   - El alta de una **Reserva** bloquea de forma pesimista (`SELECT ... FOR UPDATE`) en orden canónico primero la **Membresía** y luego la **Clase** ([ADR 0003](./docs/adr/0003-integridad-de-cupos-y-creditos-en-base-de-datos.md)).
   - Todos los cortes de calendario, **Vigencia** y **Período** operan en la zona horaria IANA configurada en el **Box** ([ADR 0002](./docs/adr/0002-clases-materializadas-desde-horario.md), [ADR 0005](./docs/adr/0005-calculos-de-calendario-en-zona-horaria-del-box.md)).

---

## 2. Mapa de Documentación del Repositorio

| Documento | Descripción |
| :--- | :--- |
| [`GLOSSARY.md`](./GLOSSARY.md) | **Lenguaje Ubicuo** obligatorio del dominio (y términos prohibidos `_Avoid_`). |
| [`docs/PRD.md`](./docs/PRD.md) | **Requisitos de Producto**, matriz de los 4 roles, 39 historias de usuario y reglas de negocio. |
| [`docs/DER.md`](./docs/DER.md) | **Diagrama Entidad-Relación**, políticas RLS en PostgreSQL y constraints de concurrencia. |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | **Arquitectura del Monorepo**, diseño de módulos profundos, convención de idioma y catálogo de `errorCode`. |
| [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) | **Sistema de Diseño e Identidad Visual**, paleta, `tabular-nums`, badges semánticos y layouts por Rol. |
| [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) | **Flujo de Git**, ramas, *Conventional Commits*, ciclo de tickets y *Definition of Done (DoD)*. |
| [`docs/guia-skills-y-flujo-trabajo.md`](./docs/guia-skills-y-flujo-trabajo.md) | **Guía de uso de Skills (Matt Pocock)**, estrategia de PRs y armado del tablero Kanban en Jira/GitHub. |
| [`docs/adr/`](./docs/adr/) | **7 Architecture Decision Records** (`0001` al `0007`). |
| [`.scratch/mvp/spec.md`](./.scratch/mvp/spec.md) | **Plan Maestro E2E** y mapa de paralelización de los **12 Tickets (*Vertical Slices*)** en `.scratch/mvp/issues/`. |

---

## 3. Stack Tecnológico

- **Monorepo**: `pnpm` workspaces + `Turborepo` (Node.js 22 LTS).
- **Backend (`apps/api`)**: **NestJS** (REST) + **Drizzle ORM** (`drizzle-orm` + `drizzle-kit` + `pg`).
- **Frontend (`apps/web`)**: **Next.js (App Router)** + **Tailwind CSS** + **`shadcn/ui`** + **Auth.js (NextAuth JWT)**.
- **Esquemas Compartidos (`packages/shared`)**: **Zod**.
- **Base de Datos**: **PostgreSQL 16** en Docker desde el día 1 (compatible con Neon / Render en producción).
- **Testing & CI/CD**: **`Vitest`** (`.spec.ts`) + **`Playwright` con `playwright-bdd`** (`.feature` + `.steps.ts` en `# language: es`) ejecutados en **GitHub Actions** (`.github/workflows/ci.yml`).

---

## 4. Variables de Entorno (`.env.example`)

El sistema distingue explícitamente entre el rol propietario de la base de datos (usado solo para migraciones y seeds) y el rol operativo de la aplicación (sujeto a `FORCE ROW LEVEL SECURITY` sin `BYPASSRLS`):

```dotenv
# Rol propietario (SOLO para drizzle-kit migrate y pnpm db:seed)
MIGRATION_DATABASE_URL="postgresql://centris_owner:centris_owner_pass@localhost:5432/centris_db"

# Rol operativo de aplicación (NOSUPERUSER, NOBYPASSRLS — usado por apps/api en runtime y tests)
DATABASE_URL="postgresql://centris_app_user:centris_app_pass@localhost:5432/centris_db"

# Backend (apps/api)
PORT=3001
CORS_ORIGIN="http://localhost:3000"

# Autenticación portable JWT (compartido entre Auth.js en apps/web y JwtGuard en apps/api)
AUTH_SECRET="reemplazar-por-secreto-de-al-menos-32-caracteres-en-local"

# Frontend (apps/web)
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

---

## 5. Comandos Principales de Desarrollo y Verificación

```bash
# 1. Instalar dependencias del monorepo
pnpm install

# 2. Levantar PostgreSQL 16 en Docker (crea roles centris_owner y centris_app_user)
pnpm db:up

# 3. Ejecutar migraciones SQL con Drizzle (usando MIGRATION_DATABASE_URL)
pnpm db:migrate

# 4. Cargar el Dataset de Seed oficial para desarrollo local
pnpm db:seed

# 5. Iniciar apps/api y apps/web en modo desarrollo
pnpm dev

# 6. Verificación completa de calidad (DoD de cada Ticket y GitHub Actions CI)
pnpm lint
pnpm typecheck
pnpm test
```

---

## 6. Dataset de Seed Oficial (`pnpm db:seed`)

Dado que el MVP no incluye un panel de Super-Administrador global ([`docs/PRD.md §4.7`](./docs/PRD.md)), el comando `pnpm db:seed` aprovisiona de forma idempotente el siguiente conjunto de datos para desarrollo, pruebas manuales y demostraciones:

### 6.1. Boxes de Prueba
1. **`Box Centris Norte`** (`slug: centris-norte`, `timezone: America/Argentina/Buenos_Aires`, `moneda: ARS`, `anticipacion_reserva_dias: 7`, `ventana_cancelacion_minutos: 120`).
2. **`Box Centris Sur`** (`slug: centris-sur`, `timezone: America/Argentina/Buenos_Aires`, `moneda: ARS`, `anticipacion_reserva_dias: 5`, `ventana_cancelacion_minutos: 60`).

### 6.2. Usuarios y Afiliaciones de Prueba (Contraseña de desarrollo: `Centris123!`)

| Email (`Usuario`) | Nombre | Afiliación en `Box Centris Norte` | Afiliación en `Box Centris Sur` | Caso que permite probar |
| :--- | :--- | :--- | :--- | :--- |
| `admin@centris.dev` | Martín Gómez | `['administrador']` | — | Configuración total del Box, Planes, Horarios y Anulación de Pagos. |
| `recepcion@centris.dev` | Lucía Fernández | `['recepcionista']` | — | Operación de mostrador, alta de Atletas, Membresías, Pagos y Walk-ins. |
| `coach.multi@centris.dev` | Diego Sosa | `['coach', 'recepcionista']` | `['atleta']` | **Selector de Box** al iniciar sesión y **composición de roles** en un mismo Box. |
| `coach@centris.dev` | Valentina Ruiz | `['coach']` | — | Vista limpia de piso de entrenamiento y marcado de Asistencia (sin ver caja). |
| `atleta.aldia@centris.dev` | Sofía Castro | `['atleta']` *(Membresía al día, `Saldo = $0`)* | — | Autogestión móvil de Reservas y Cancelaciones. |
| `atleta.moroso@centris.dev` | Nicolás Pérez | `['atleta']` *(Membresía vigente impaga, `Saldo > $0`)* | — | Verificación de estado **Moroso** en recepción y reserva permitida sin bloqueo ([ADR 0006](./docs/adr/0006-acceso-desacoplado-del-pago.md)). |
| `atleta.nuevo@centris.dev` | Camila Díaz | `['atleta']` *(`password_hash = NULL`)* | — | Flujo de **activación de contraseña en el primer ingreso** para atletas creados en mostrador. |

### 6.3. Catálogo Base de Planes en `Box Centris Norte`
1. **Plan 8 Clases Mensuales**: `modalidad_creditos = 'VIGENCIA_TOTAL'`, `duracion_dias = 30`, `creditos_por_periodo = 8`, `precio_base = 35000`.
2. **Plan 3x Semana**: `modalidad_creditos = 'SEMANAL'`, `duracion_dias = 30`, `creditos_por_periodo = 3`, `precio_base = 42000`.
3. **Pase Libre Mensual**: `modalidad_creditos = 'ILIMITADO'`, `duracion_dias = 30`, `creditos_por_periodo = NULL`, `precio_base = 55000`.
