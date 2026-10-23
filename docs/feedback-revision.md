# Registro de Revisión Inicial y Pendientes de Documentación (`centris-app`)

Este documento preserva los primeros 2 prompts de análisis del repositorio y sus respectivas respuestas completas, seguido de una **Lista de Tareas (TODO List)** accionable para resolver punto por punto antes de iniciar la ejecución del [Ticket 01](../.scratch/mvp/issues/01-monorepo-postgres-rls-foundation.md).

---

## Prompt 1: Primera lectura del repositorio

### Prompt
> Hace una primera lectura de este repositorio y decime de qué se trata

### Respuesta

Este repositorio contiene la especificación funcional, de dominio y arquitectónica de **Centris** (`centris-app`), un **SaaS multitenant** para que **Boxes** de CrossFit, centros de entrenamiento funcional y gimnasios boutique gestionen sus **Planes**, **Membresías**, **Pagos**, **Horarios**, **Clases**, **Reservas** y **Asistencias**.

> [!NOTE]
> **Estado actual del repositorio**: Está en etapa de **diseño y planificación lista para implementación** (*pre-código*). Cuenta con el modelo de dominio, decisiones de arquitectura (ADRs), modelo de datos y el backlog completo de tickets E2E, pero aún no se ha inicializado el código del monorepo (Ticket `01`).

#### 1. Dominio y Reglas de Negocio Principales
Definidos en [`GLOSSARY.md`](../GLOSSARY.md) y detallados en [`docs/PRD.md`](./PRD.md):

* **Identidad Global y Aislamiento por Box** ([ADR 0001](./adr/0001-identidad-global-con-afiliacion-por-box.md), [ADR 0004](./adr/0004-aislamiento-por-box-con-rls-en-postgresql.md)):
  * Un **Usuario** tiene una única cuenta global en la plataforma y se vincula a uno o varios **Boxes** mediante una **Afiliación**.
  * El aislamiento entre Boxes se garantiza en PostgreSQL con **Row Level Security forzado** (`FORCE ROW LEVEL SECURITY`), claves foráneas compuestas con `box_id` y contexto por transacción (`SET LOCAL app.box_id`).
* **4 Roles Atómicos Componibles** ([ADR 0007](./adr/0007-cuatro-roles-atomicos-componibles.md)):
  * Una **Afiliación** puede combinar cualquiera de los 4 roles independientes: `Administrador`, `Recepcionista`, `Coach` y `Atleta` (ej. un entrenador que también atiende el mostrador tiene `['coach', 'recepcionista']`).
* **Acceso Desacoplado del Pago y Contabilidad Inmutable** ([ADR 0006](./adr/0006-acceso-desacoplado-del-pago.md)):
  * Lo que habilita a reservar una **Clase** es tener una **Membresía** con **Vigencia** que cubra la fecha de la clase y **Créditos** disponibles en ese **Período**, sin importar si el Atleta aún debe dinero (**Moroso**).
  * Los **Pagos** son registros manuales e inmutables (no se editan ni se borran; los errores se corrigen mediante una **Anulación** auditable). El **Saldo** se calcula siempre como $\text{Precio} - \sum \text{Pagos no anulados}$.
* **Clases Materializadas y Zonas Horarias** ([ADR 0002](./adr/0002-clases-materializadas-desde-horario.md), [ADR 0005](./adr/0005-calculos-de-calendario-en-zona-horaria-del-box.md)):
  * Los **Horarios** son moldes semanales a partir de los cuales se materializan **Clases** concretas en `timestamptz`. Todos los cortes de semana (lunes a domingo), **Vigencia** y **Ventana de Cancelación** se calculan en la zona horaria IANA configurada en el **Box**.
* **Concurrencia de Cupos, Créditos y Asistencia** ([ADR 0003](./adr/0003-integridad-de-cupos-y-creditos-en-base-de-datos.md)):
  * Las **Reservas** bloquean de forma pesimista (`SELECT ... FOR UPDATE`) primero la **Membresía** y luego la **Clase** para impedir sobrecupos, sobregiro de **Créditos** o superposición horaria.
  * No hay lista de espera (*first-come, first-served*). El staff tiene una **Ventana de Corrección de Asistencia** de 24 hs tras finalizar la clase; luego, las reservas sin **Asistencia** se consolidan como **Ausencia**.

#### 2. Stack Tecnológico Planificado
Especificado en [`docs/PRD.md`](./PRD.md) y [`docs/DER.md`](./DER.md):

* **Estructura Monorepo (`centris-app`)**:
  * `apps/api`: Backend REST en **NestJS** (TypeScript) con TypeORM o Drizzle ORM (descartado Prisma por el requerimiento de `SET LOCAL` en transacciones con RLS).
  * `apps/web`: Frontend en **Next.js (App Router)** + **shadcn/ui** + Tailwind CSS, autenticado con **Auth.js (JWT)** para evitar *vendor lock-in*.
  * `packages/shared`: Esquemas y validaciones compartidas con **Zod**.
* **Base de Datos**: **PostgreSQL** en Docker desde el día 1 (prohibido usar SQLite o mocks en memoria para tests de integración).

#### 3. Mapa del Repositorio y Plan de Ejecución
* **Documentación de Dominio y Arquitectura**:
  * [`GLOSSARY.md`](../GLOSSARY.md): Lenguaje ubicuo obligatorio del proyecto.
  * [`docs/PRD.md`](./PRD.md): Documento de requisitos de producto, historias de usuario y reglas de negocio.
  * [`docs/DER.md`](./DER.md): Diagrama Entidad-Relación, políticas RLS y constraints GiST/únicos.
  * `docs/adr/`: 7 registros de decisión de arquitectura ([0001](./adr/0001-identidad-global-con-afiliacion-por-box.md) al [0007](./adr/0007-cuatro-roles-atomicos-componibles.md)).
* **Plan Maestro y Tickets (`.scratch/mvp/`)**:
  * [`spec.md`](../.scratch/mvp/spec.md): Plan maestro E2E dividido en **12 tickets (*Vertical Slices*)** bajo `.scratch/mvp/issues/` (desde [`01-monorepo-postgres-rls-foundation.md`](../.scratch/mvp/issues/01-monorepo-postgres-rls-foundation.md) hasta [`12-asistencia-coach-y-consolidacion-ausencias-e2e.md`](../.scratch/mvp/issues/12-asistencia-coach-y-consolidacion-ausencias-e2e.md)), todos actualmente en estado `ready-for-agent`.

---

## Prompt 2: Feedback de documentación actual y elementos faltantes

### Prompt
> Antes de comenzar a ejecutar el ticket 01, quiero asegurarme que no me falta documentar nada. Primero, con lo que leíste de este repositorio y la información que tenés, dame un feedback al respecto sobre si lo documentado hasta el  momento está bien o si faltan cosas críticas. Además, recomendame qué otras cosas faltan documentar para que, ya sea que yo meta código, lo haga otra persona o lo haga un agente, todos tengamos la misma fuente de información. Algunas cosas que se me ocurren que podrían faltar son: la convención de nombres para las branches y/o tickets, la estructura del repositorio, la identidad visual.

### Respuesta

#### 1. Diagnóstico de lo documentado hasta ahora

La base documental actual es **de muy alto nivel**. El [`GLOSSARY.md`](../GLOSSARY.md), el [`PRD.md`](./PRD.md), el [`DER.md`](./DER.md), los 7 ADRs en [`docs/adr/`](./adr/) y el plan de 12 *Vertical Slices* en [`spec.md`](../.scratch/mvp/spec.md) tienen una coherencia poco común: las reglas de dominio, los casos borde de calendario y las invariantes transaccionales están clarísimos.

Sin embargo, haciendo una revisión quirúrgica antes de largar el [Ticket 01](../.scratch/mvp/issues/01-monorepo-postgres-rls-foundation.md), hay **5 puntos críticos (técnicos y de diseño)** que hoy están abiertos o tienen un hueco y que un desarrollador o agente tendría que "adivinar":

##### A. Decisiones técnicas y huecos críticos a cerrar antes del Ticket 01

1. **Elección definitiva del ORM (`Drizzle ORM` vs. `TypeORM`)**:
   * Tanto en [`PRD.md`](./PRD.md), [ADR 0004](./adr/0004-aislamiento-por-box-con-rls-en-postgresql.md) como en el [Ticket 01](../.scratch/mvp/issues/01-monorepo-postgres-rls-foundation.md) figura *"TypeORM o Drizzle ORM (a definir)"*.
   * **Por qué es crítico**: El Ticket 01 construye las migraciones, la conexión y el wrapper de `SET LOCAL app.box_id`. Debe quedar elegido uno solo (ej. mediante un breve ADR o fijándolo en el PRD y Ticket 01) junto con la herramienta de migraciones.
2. **Paradoja de RLS en `AFILIACION` al iniciar sesión (antes de elegir Box)**:
   * En [`DER.md`](./DER.md), la tabla `AFILIACION` tiene `FORCE ROW LEVEL SECURITY` con la política `box_id = current_setting('app.box_id', true)::uuid`.
   * Pero en [`PRD.md`](./PRD.md) y en el [Ticket 02](../.scratch/mvp/issues/02-auth-selector-box-y-roles-e2e.md), cuando un **Usuario** inicia sesión todavía no tiene `box_id` activo y necesita consultar sus **Afiliaciones** en todos los Boxes para mostrar el **Selector de Box**. Con la política actual, esa consulta devolverá `0 filas`.
   * **Qué definir**: Especificar cómo se resuelve el `SELECT` de afiliaciones propias al autenticar (ej. permitiendo en la política RLS de `SELECT` de `AFILIACION` la condición `OR usuario_id = current_setting('app.usuario_id', true)::uuid`, o mediante una función `SECURITY DEFINER` dedicada exclusivamente a listar las afiliaciones del usuario autenticado).
3. **Idioma del código vs. lenguaje ubicuo del Glosario**:
   * El [`GLOSSARY.md`](../GLOSSARY.md) y las tablas de [`DER.md`](./DER.md) están en **español** (`membresias`, `afiliaciones`, `horarios`, `creditos_por_periodo`).
   * **Por qué es crítico**: Si no se fija una regla explícita, distintas personas o agentes van a mezclar inglés y español (`MembershipService` llamando a la tabla `membresias`, o rutas `/api/memberships` vs `/api/membresias`). Conviene documentar que **nombres de tablas, columnas, rutas de API, esquemas Zod y clases/módulos de dominio usan exactamente los términos en español del `GLOSSARY.md`**.
4. **Credenciales iniciales cuando Recepción da de alta un Atleta en mostrador ([Ticket 04](../.scratch/mvp/issues/04-directorio-y-alta-atletas-e2e.md))**:
   * Cuando un `Recepcionista` crea un `Atleta` nuevo ingresando solo `nombre` y `email`, se crea la fila en `USUARIO`. Como el MVP no contempla servidor de emails transaccionales, falta definir cómo establece su contraseña ese usuario para entrar luego desde su celular (ej. contraseña temporal generada/configurable por recepción, `password_hash` nullable con flujo de activación, etc.).
5. **Alcance de `creditos_extra` en Membresías semanales ([`DER.md`](./DER.md))**:
   * En `MEMBRESIA` existe el campo `creditos_extra`. En una Membresía de modalidad `SEMANAL` (donde los créditos se renuevan cada lunes), ¿`creditos_extra` suma al cupo de **cada semana**, solo a la **semana en curso**, o funciona como una bolsa adicional para **toda la Vigencia**?

---

#### 2. Qué falta documentar para alinear a personas y agentes

Para que vos, otro desarrollador o cualquier agente escriban código indistinguible entre sí, te recomiendo documentar estos **5 bloques**:

##### 1. Estructura del Monorepo y Convenciones de Arquitectura (`docs/ARCHITECTURE.md`)
* **Herramientas base y versiones**: Fijar gestor de paquetes (`pnpm` con `pnpm-workspace.yaml`), orquestador (`Turborepo` o scripts de workspace) y versión de Node.js (ej. Node 22 LTS).
* **Árbol de carpetas canónico**:
  * Cómo se estructuran los módulos en `apps/api/src/modules/<dominio>/` (Controller, Service/UseCase, Repository, DTOs).
  * Cómo se estructuran las rutas en `apps/web/src/app/` (ej. rutas públicas `/login`, selector de box `/select-box`, rutas operativas bajo el contexto del Box activo) y cómo se invoca a `apps/api` (fetch wrapper tipado, Server Actions o TanStack Query).
  * Qué vive exactamente en `packages/shared` (esquemas Zod, enums de roles/estados, códigos de error de dominio, utilidades de fecha/timezone).
* **Contrato estándar de la API REST**:
  * Formato uniforme de respuestas de error (por ejemplo: `{ statusCode, errorCode: 'CUPO_AGOTADO', message }` para que el frontend y los tests E2E validen por `errorCode` y no por strings libres).
* **Reglas para evitar conflictos al paralelizar tickets**:
  * Como el [`spec.md`](../.scratch/mvp/spec.md) habilita correr tickets en paralelo (ej. `03 || 04 || 07`), definir cómo nombrar migraciones SQL (con timestamp o prefijo del número de ticket `0003_planes.sql`, `0004_atletas.sql`) y cómo organizar exports en `packages/shared` (un archivo por dominio en lugar de editar todos la misma línea).

##### 2. Flujo de Git, Ramas, Commits y Ciclo de Tickets (`docs/CONTRIBUTING.md`)
* **Convención de ramas (branches)**: Por ejemplo `feat/<NN>-<slug>` coincidiendo con el archivo en `.scratch/mvp/issues/` (ej. `feat/01-monorepo-postgres-rls-foundation`).
* **Convención de commits**: *Conventional Commits* (`feat(planes): ...`, `fix(reservas): ...`, `test(rls): ...`).
* **Ciclo de estados de los tickets**:
  * Nota: En [`docs/agents/issue-tracker.md`](./agents/issue-tracker.md) se hace referencia a `triage-labels.md`, pero ese archivo quedó dentro de [`.agents/skills/setup-matt-pocock-skills/triage-labels.md`](../.agents/skills/setup-matt-pocock-skills/triage-labels.md) y no en `docs/agents/`. Conviene copiarlo o documentar explícitamente los estados (`ready-for-agent` $\rightarrow$ `in-progress` $\rightarrow$ `done`) y la **Definición de Hecho (DoD)** (ej. `pnpm lint && pnpm typecheck && pnpm test:e2e` en verde).

##### 3. Identidad Visual y Sistema de Diseño (`docs/DESIGN_SYSTEM.md`)
Si no documentás lineamientos visuales, cada ticket hecho por una persona o agente distinto va a generar pantallas con estilos, espaciados y componentes desconectados:
* **Estética de marca ("Centris")**:
  * Tema por defecto (¿Modo claro para administración diurna en recepción, modo oscuro deportivo para el Atleta, o unificado?).
  * Paleta en Tailwind / `shadcn/ui`: color primario de acento (ej. un naranja/lima energético o azul cobalto limpio), colores de superficie (`slate`/`zinc`) y **badges semánticos de dominio**:
    * `Moroso` / `Ausencia` / `Cancelación Tardía` $\rightarrow$ Destructivo / Ámbar.
    * `Confirmada` / `Asistencia` / `Membresía Vigente` $\rightarrow$ Esmeralda / Verde.
* **Tipografía y formato numérico**:
  * Uso obligatorio de `tabular-nums` (`font-mono` o números tabulares) para **Precios**, **Saldos**, horarios (`07:00 - 08:00`) y contadores de **Cupos** (`18/20`).
  * Formato de moneda y fechas (ej. `es-AR` como locale de formateo visual, mostrando `$ 30.000` para `ARS`).
* **Arquetipos de pantalla por Rol**:
  * **Desktop/Tablet (`Administrador` y `Recepcionista`)**: Sidebar lateral persistente con el Selector de Box arriba, tablas con filtros rápidos y *Drawers/Dialogs* para acciones de mostrador sin perder el contexto.
  * **Piso de entrenamiento (`Coach`)**: Vista despejada con tarjetas de clase y lista de inscriptos con botones grandes (*touch-friendly*) para marcar **Asistencia** con un solo toque.
  * **Mobile-first (`Atleta`)**: Navegación inferior simple (*Mis Clases*, *Reservar*, *Mi Membresía*), selector horizontal de días de la semana y tarjetas de clase con estado claro de Cupos y Créditos.

##### 4. Entorno Local, Variables `.env` y Datos Semilla (`README.md`)
* Hoy el [`README.md`](../README.md) solo tiene el título `# functional-training-saas`.
* Conviene documentar:
  * Las variables de `.env.example` (diferenciando `DATABASE_URL` con `app_user` sin `BYPASSRLS` vs. `MIGRATION_DATABASE_URL` con el rol propietario).
  * **Dataset de Seed oficial (`pnpm db:seed`)**: Dado que el MVP no tiene panel de Super-Admin ([`PRD 4.7`](./PRD.md)), definir qué Boxes y Usuarios de prueba debe crear el seed (ej. `Box Centris Norte` y `Box Centris Sur`, con usuarios conocidos para probar cada uno de los 4 roles y la combinación de roles).

##### 5. Actualizar `AGENTS.md` como punto de entrada único
* Hoy [`AGENTS.md`](../AGENTS.md) solo tiene 9 líneas apuntando al issue tracker y al glosario. Agregarle enlaces directos al PRD, DER, convenciones de arquitectura, sistema de diseño y comandos de test hará que cualquier agente lea esas reglas automáticamente en cada sesión.

---

## TODO List de Revisión (Paso a Paso Pre-Ticket 01)

A continuación se listan los puntos ordenados por prioridad para ir resolviendo **uno por uno** en los siguientes prompts o sesiones:

### Bloque A — Decisiones Críticas Técnicas y de Dominio
- [ ] **TODO 01 — Definir el ORM y estrategia de migraciones**: Elegir definitivamente entre `Drizzle ORM` o `TypeORM` y actualizar [`docs/PRD.md`](./PRD.md), [`docs/adr/0004-aislamiento-por-box-con-rls-en-postgresql.md`](./adr/0004-aislamiento-por-box-con-rls-en-postgresql.md), [`.scratch/mvp/spec.md`](../.scratch/mvp/spec.md) y el [Ticket 01](../.scratch/mvp/issues/01-monorepo-postgres-rls-foundation.md).
- [ ] **TODO 02 — Resolver la consulta inicial de `AFILIACION` bajo RLS (pre-selección de Box)**: Definir el mecanismo exacto en PostgreSQL para que un `Usuario` recién autenticado pueda listar sus `Afiliaciones` antes de fijar `app.box_id` (ej. política RLS con `app.usuario_id` en `SELECT` o función `SECURITY DEFINER` acotada) y reflejarlo en [`docs/DER.md`](./DER.md), [`docs/PRD.md`](./PRD.md) y los Tickets `01`/`02`.
- [ ] **TODO 03 — Fijar convención de idioma en código, BD y API**: Definir la regla de nomenclatura entre español (lenguaje ubicuo de [`GLOSSARY.md`](../GLOSSARY.md)) e inglés técnico para tablas, columnas, endpoints REST, DTOs, esquemas Zod y clases/archivos.
- [ ] **TODO 04 — Definir el flujo de contraseña inicial para Atletas dados de alta en mostrador**: Especificar cómo obtiene o configura su contraseña un `Usuario` creado por un `Recepcionista` o `Administrador` desde el directorio de Atletas ([Ticket 04](../.scratch/mvp/issues/04-directorio-y-alta-atletas-e2e.md)) sin depender de envío de emails en el MVP.
- [ ] **TODO 05 — Precisar la regla de negocio de `creditos_extra` en Membresías**: Aclarar en [`GLOSSARY.md`](../GLOSSARY.md), [`docs/PRD.md`](./PRD.md), [`docs/DER.md`](./DER.md) y los Tickets `05`/`09` cómo se imputan y consumen los `creditos_extra` cuando la modalidad de la Membresía es `SEMANAL` vs. `VIGENCIA_TOTAL`.

### Bloque B — Documentación de Arquitectura, Repo y Flujo de Trabajo
- [ ] **TODO 06 — Documentar estructura del Monorepo y arquitectura interna (`docs/ARCHITECTURE.md`)**: Especificar gestor de paquetes (`pnpm`), orquestador (`Turborepo`), versión de Node.js, estructura de carpetas de `apps/api`, `apps/web` y `packages/shared`, contrato estándar de errores HTTP/dominio y reglas para evitar conflictos en tickets paralelos.
- [ ] **TODO 07 — Documentar convenciones de Git, ramas, commits y ciclo de tickets (`docs/CONTRIBUTING.md` y `docs/agents/triage-labels.md`)**: Definir nomenclatura de branches, *Conventional Commits*, estados de tickets en `.scratch/mvp/issues/` y *Definition of Done* (DoD).
- [ ] **TODO 08 — Documentar Identidad Visual y Design System (`docs/DESIGN_SYSTEM.md`)**: Definir paleta de colores de **Centris**, tema (light/dark), tipografía (`tabular-nums`), badges semánticos de dominio y layouts por Rol (`Administrador`/`Recepcionista`, `Coach`, `Atleta`).
- [ ] **TODO 09 — Completar `README.md` (Variables de entorno, Docker y Dataset de Seed oficial)**: Especificar variables `.env.example`, comandos de arranque/test y qué Boxes/Usuarios de prueba debe crear el seed de desarrollo (`pnpm db:seed`).
- [ ] **TODO 10 — Actualizar `AGENTS.md` como índice maestro del repositorio**: Conectar todos los documentos anteriores en [`AGENTS.md`](../AGENTS.md) para que cualquier agente o desarrollador tenga el contexto completo desde el primer instante.
