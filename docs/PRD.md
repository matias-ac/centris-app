# Documento de Requisitos de Producto y Arquitectura (PRD) — Centris (`centris-app` MVP)

---

## 1. Resumen Ejecutivo del SaaS

> **Identidad Comercial y Alcance de Repositorios ("Centris")**:
> La plataforma **"Functional Training SaaS"** tiene como nombre comercial **Centris**. La arquitectura global del producto se divide en dos repositorios independientes:
> - **`centris-landing`**: Sitio web comercial y de marketing público (fuera del alcance de este documento y de este repositorio).
> - **`centris-app`**: El Sistema de Gestión multitenant core que se especifica y planifica en este documento. Todo el desarrollo actual (monorepo con Backend en **NestJS** y Frontend en **Next.js**) vive íntegramente en **`centris-app`**.

### 1.1. Planteamiento del Problema (*Problem Statement*)
Los centros de entrenamiento funcional, boxes de CrossFit y gimnasios boutique suelen gestionar su operación diaria mediante una combinación frágil de hojas de cálculo, grupos de mensajería o sistemas genéricos que no reflejan la realidad operativa del sector. Los principales puntos de dolor son:

1. **Pérdida de control sobre cupos y reservas**: Las clases de mayor demanda se saturan en segundos; sin control transaccional estricto, se producen sobrecupos involuntarios o abusos de créditos por reservas simultáneas.
2. **Fricción entre la realidad comercial y el acceso al entrenamiento**: En la práctica diaria de un Box, es habitual permitir que un atleta de confianza reserve y entrene aunque salde su pago unos días después ("paga el viernes"). Los sistemas rígidos que bloquean el acceso ante la falta de un pago online obligan a los dueños a crear excepciones manuales fuera del sistema, perdiendo trazabilidad contable.
3. **Desajuste en roles operativos**: Los boxes varían desde estructuras unipersonales (donde el mismo entrenador cobra en recepción y dicta la clase) hasta centros con personal de mostrador dedicado y coaches por hora. Las jerarquías lineales de permisos exponen la caja financiera a quienes solo deben pasar lista, o dan permisos de configuración crítica a empleados de mostrador.
4. **Fricción de identidad en comunidades multi-box**: Un mismo usuario puede entrenar como atleta en un Box y trabajar como coach en otro (o cumplir ambos roles en el mismo centro), pero las plataformas tradicionales obligan a mantener cuentas y credenciales duplicadas por cada gimnasio.

### 1.2. Propuesta de Valor y Solución (*Solution*)
**Functional Training SaaS** es una plataforma web multitenant diseñada específicamente para que los **Boxes** gestionen su catálogo de **Planes**, **Membresías**, **Pagos**, **Horarios**, **Clases**, **Reservas** y **Asistencias** bajo cuatro principios rectores:

- **Identidad global con aislamiento estricto por Box**: Un **Usuario** posee una única cuenta en toda la plataforma y accede a cada **Box** mediante una **Afiliación** con hasta 4 **Roles** atómicos componibles (`Administrador`, `Recepcionista`, `Coach`, `Atleta`), garantizando en base de datos que ningún Box pueda jamás leer ni modificar datos de otro.
- **Acceso desacoplado del pago con caja auditable**: La **Membresía** vigente habilita la **Reserva**; los **Pagos** conforman un libro contable inmutable (corregible solo por **Anulación**) del cual se deriva el **Saldo** y el estado de **Moroso**, sin bloquear la operación deportiva.
- **Integridad transaccional de Cupos y Créditos**: Todas las reglas de capacidad de **Clase**, consumo de **Créditos** por **Período** y no superposición horaria se garantizan de forma atómica en el motor relacional.
- **Exactitud calendaria por zona horaria**: Todas las reglas de corte semanal, **Vigencia**, **Anticipación de Reserva** y **Ventana de Cancelación** operan en la zona horaria configurada por el **Box**.

### 1.3. Vocabulario de Dominio (Referencia Rápida)
Todo el diseño funcional, técnico, nombres de módulos y pruebas se rigen estrictamente por el lenguaje ubicuo definido en [`GLOSSARY.md`](../GLOSSARY.md):

| Concepto | Definición Sintética | Términos a Evitar |
| :--- | :--- | :--- |
| **Box** | Organización cliente y unidad estricta de aislamiento multitenant. | *Tenant, gimnasio, cuenta* |
| **Usuario** | Persona con identidad única y global en la plataforma (credenciales, nombre, email). | *Cuenta, cliente, perfil* |
| **Afiliación** | Vínculo entre un Usuario y un Box que le otorga acceso con uno o más Roles. | *Membresía, miembro, suscripción* |
| **Rol** | Función atómica dentro de una Afiliación: `Atleta`, `Coach`, `Recepcionista` o `Administrador`. | — |
| **Plan** | Plantilla del catálogo del Box que define Créditos por Período (o ilimitado), duración y precio base. | *Abono, pack, paquete, cuota* |
| **Membresía** | Asignación concreta de un Plan a un Atleta para una Vigencia dada, con copia propia de condiciones y Precio. | *Suscripción, abono, afiliación* |
| **Crédito** | Unidad que habilita reservar una Clase dentro de un Período. | *Cupo, clase disponible, ficha* |
| **Período** | Lapso de renovación de Créditos: semana de lunes a domingo (en planes semanales) o toda la Vigencia. | — |
| **Vigencia** | Intervalo de fechas calendario en que una Membresía habilita a reservar Clases. | *Validez, duración* |
| **Precio / Pago / Anulación / Saldo** | Monto adeudado en la Membresía / Evento contable inmutable de cobro / Marca de corrección auditable / Diferencia calculada (`Precio − Σ Pagos activos`). | *Cuota, tarifa, transacción, edición, balance* |
| **Moroso** | Atleta con al menos una Membresía cuyo Saldo es mayor a cero. | *Deudor, impago* |
| **Tipo de Clase / Horario / Clase** | Categoría de entrenamiento (ej. WOD) / Regla recurrente semanal / Ocurrencia materializada en fecha y hora concreta que recibe Reservas. | *Disciplina, turno, grilla, sesión* |
| **Cupo** | Lugar disponible para un Atleta en una Clase. | *Capacidad, lugar, crédito* |
| **Reserva** | Cupo tomado por o para un Atleta en una Clase, consumiendo un Crédito. | *Turno, inscripción, booking, walk-in* |
| **Asistencia / Ausencia** | Registro de presencia hecho por el staff / Reserva confirmada sin Asistencia tras vencer las 24 hs de la Ventana de Corrección de Asistencia. | *Check-in, presente, no-show, falta* |

---

## 2. Stack Tecnológico y Estrategia de Arquitectura

### 2.1. Stack Tecnológico y Criterios Técnicos de Ingeniería (`centris-app`)
- **Arquitectura de Repositorio**: **Monorepo (`centris-app`)** estructurado en:
  - `apps/api`: Backend REST en **NestJS** (Node.js + TypeScript), con arquitectura modular orientada al dominio, interceptores transaccionales para fijar el contexto del Box y *Guards* declarativos para validar la combinación de roles en la Afiliación activa.
  - `apps/web`: Frontend en **Next.js (App Router)** + **shadcn/ui** + Tailwind CSS. Interfaz responsiva con vistas de gestión densa para escritorio/tablet (`Administrador` y `Recepcionista`), vista ágil de control de clase (`Coach`) y experiencia *mobile-first* (`Atleta`).
  - `packages/shared` (opcional): Esquemas **Zod**, tipos compartidos y constantes de dominio.
- **Base de Datos**: **PostgreSQL mediante Docker desde el día 1** (desarrollo local y CI/CD).
  - **Prohibición explícita de SQLite o bases en memoria**: Dado que la seguridad multi-tenant depende de *Row Level Security* (`FORCE ROW LEVEL SECURITY`), variables de sesión (`SET LOCAL app.box_id`), bloqueos `SELECT ... FOR UPDATE`, tipos `timestamptz` y constraints `EXCLUDE USING gist`, queda prohibido usar SQLite o mocks en memoria para pruebas de integración.
  - Ver el modelo relacional detallado en [`docs/DER.md`](./DER.md).
- **ORM / Query Builder**: **Drizzle ORM (`drizzle-orm` + `drizzle-kit` + driver `pg`)**.
  - **Justificación de arquitectura**: Es SQL-first, tiene tipado estático directo en TypeScript sin decoradores experimentales, permite abrir una transacción explícita y ejecutar `await tx.execute(sql`SET LOCAL app.box_id = ${boxId}`)` sobre la misma conexión física antes de despachar las consultas del caso de uso, y genera archivos de migración `.sql` planos donde se declaran las políticas `FORCE ROW LEVEL SECURITY` y constraints `EXCLUDE USING gist`.
  - **Herramientas descartadas**: Se descartan explícitamente **Prisma** y **TypeORM**.
- **Convención de Idioma Ubicuo en Código, Base de Datos, API y Tests**:
  - **Español de Dominio Ubicuo**: Nombres de tablas y columnas de negocio en `snake_case` en español tal como en [`docs/DER.md`](./DER.md) (`membresias`, `afiliaciones`, `creditos_por_periodo`), rutas REST en español (`/api/planes`, `/api/membresias`, `/api/reservas`), identificadores de dominio en código y esquemas Zod en español sin tildes (`MembresiasService`, `CrearReservaSchema`, `CupoAgotadoError`), y escenarios `.feature` en español (`# language: es`).
  - **Inglés Técnico**: Reservado exclusivamente para sufijos del framework/infraestructura (`Controller`, `Service`, `Guard`, `Module`) y columnas técnicas de auditoría (`id`, `created_at`, `updated_at`, `deleted_at`).
- **Autenticación Portable (Mitigación de *Vendor Lock-in*)**:
  - Se utilizará **Auth.js (NextAuth)** en el Frontend (`apps/web`) con **sesión basada en JWT**, enviando el token en las peticiones hacia la API REST de **NestJS** (`apps/api`), donde es validado criptográficamente mediante *Guards* de NestJS.
  - Esta decisión evita el acoplamiento a proveedores de identidad propietarios (como Supabase Auth, Clerk o Auth0), manteniendo las credenciales en nuestra propia tabla global `USUARIO` en PostgreSQL y garantizando un despliegue libre en cualquier infraestructura.
- **Seguridad, Calidad, Testing y CI/CD**:
  - **Validaciones con Zod**: Validación estricta de contratos de entrada/salida tanto en formularios de `apps/web` como en DTOs/pipes de `apps/api`.
  - **Soft Deletes**: Borrado lógico (`deleted_at`) en todas las entidades maestras y operativas críticas (`Usuario`, `Box`, `Afiliación`, `Plan`, `Membresía`, `Tipo de Clase`, `Horario`, `Clase`), excepto en `Pago`, que es estrictamente inmutable y solo admite **Anulación** ([ADR 0006](./adr/0006-acceso-desacoplado-del-pago.md)).
  - **TDD / BDD con `Vitest` + `playwright-bdd`**: Cada funcionalidad (*Vertical Slice*) se desarrolla bajo el ciclo **Red $\rightarrow$ Green** utilizando **Vitest** (`.spec.ts`) para pruebas unitarias/concurrencia y **Playwright + `playwright-bdd`** (`.feature` + `.steps.ts` en español) para los criterios de aceptación E2E y de integración contra PostgreSQL real en Docker.
  - **Integración Continua en GitHub Actions (`.github/workflows/ci.yml`)**: Desde el Ticket `01`, cada Pull Request y push a `main` levanta un servicio de PostgreSQL en CI, aplica las migraciones con los roles diferenciados y ejecuta `pnpm lint`, `pnpm typecheck` y la suite automatizada de pruebas.

### 2.2. Requerimientos No Funcionales (NFRs): Despliegue, Portabilidad y *Zero Vendor Lock-in*
Toda decisión de implementación dentro de los tickets de **Centris (`centris-app`)** debe respetar estrictamente las siguientes directrices de portabilidad y compatibilidad con capas gratuitas (*free tiers*):

1. **Base de Datos (PostgreSQL Estándar)**:
   - **Desarrollo y Testing**: Ejecución local 100% contenida mediante **Docker** (`docker-compose.yml`), sin depender de servicios en la nube para desarrollar ni correr suites de pruebas.
   - **Producción / Staging**: Compatible con cualquier proveedor de PostgreSQL estándar gestionado con capa gratuita (como **Neon** o **Render**). Queda prohibido el uso de extensiones o funciones propietarias no disponibles en instalaciones estándar de PostgreSQL.
2. **Backend (`apps/api` — NestJS)**:
   - Empaquetado como proceso estándar de **Node.js** / contenedor OCI, 100% portable a cualquier plataforma PaaS (**Render**, **Railway**, **Fly.io** o VPS propio).
   - Sin acoplamiento a * triggers* o *serverless functions* propietarias de una nube específica; toda configuración sensible (URL de base de datos, secreto JWT de Auth.js, CORS) se inyecta exclusivamente por variables de entorno estándar (`12-Factor App`).
3. **Frontend (`apps/web` — Next.js App Router)**:
   - Optimizado para despliegue directo en **Vercel** o **Netlify**, consumiendo `apps/api` a través de variables de entorno públicas/privadas estándar y gestionando la sesión mediante **Auth.js (JWT)**.

### 2.3. Estrategia Multi-tenant con Row Level Security en PostgreSQL ([ADR 0004](./adr/0004-aislamiento-por-box-con-rls-en-postgresql.md))
El peor fallo admisible en la plataforma es una fuga de datos entre Boxes. Para impedirlo por diseño sin multiplicar bases de datos ni esquemas por cliente:

1. **Esquema compartido con `box_id` obligatorio**: Toda tabla perteneciente al dominio operativo de un Box (`afiliaciones`, `planes`, `membresias`, `pagos`, `tipos_clase`, `horarios`, `clases`, `reservas`, etc.) incluye la columna `box_id NOT NULL`.
2. **Claves foráneas compuestas**: Toda relación entre tablas de un Box incluye `box_id` en la clave foránea —por ejemplo, `(box_id, clase_id)` o `(box_id, membresia_id)`—, haciendo físicamente imposible a nivel relacional vincular registros de Boxes distintos.
3. **Políticas RLS forzadas (`FORCE ROW LEVEL SECURITY`)**:
   - Todas las tablas con `box_id` tienen RLS habilitado y forzado (`ENABLE` y `FORCE ROW LEVEL SECURITY`).
   - Las políticas de lectura y escritura exigen `box_id = current_setting('app.box_id', true)::uuid`.
   - Si no hay contexto fijado en la transacción actual, las consultas devuelven cero filas o fallan de forma segura (*fail-closed*), incluso si el desarrollador omite el `WHERE box_id = ...` en el código.
4. **Rol de conexión sin privilegios de evasión**: La aplicación NestJS se conecta a PostgreSQL con un rol de base de datos que **no** es propietario (*owner*) de las tablas ni posee los atributos `SUPERUSER` o `BYPASSRLS`.
5. **Contexto por transacción (`SET LOCAL`)**:
   - Cada petición autenticada que opera sobre un Box abre una transacción de base de datos cuya primera instrucción es `SET LOCAL app.box_id = '<uuid>'`.
   - Al utilizar `SET LOCAL`, la variable vive únicamente durante la transacción actual y se limpia automáticamente al hacer `COMMIT` o `ROLLBACK`, evitando contaminación de contexto en el pool de conexiones y garantizando compatibilidad con *PgBouncer* en modo transacción.
6. **Tablas globales, consulta pre-Box de `Afiliación` y procesos en background**:
   - Las tablas `usuarios` y `boxes` son globales y quedan fuera de RLS.
   - En la tabla `afiliaciones`, la política RLS de lectura (`SELECT`) habilita el acceso cuando `box_id = current_setting('app.box_id', true)::uuid OR usuario_id = current_setting('app.usuario_id', true)::uuid` (mientras que toda operación de escritura exige `app.box_id`). De este modo, al iniciar sesión (antes de elegir un Box), la transacción fija `SET LOCAL app.usuario_id = '<uuid>'` para recuperar únicamente las `Afiliaciones` del `Usuario` autenticado y construir el selector de Box sin usar `SECURITY DEFINER` ni `BYPASSRLS`.
   - Los trabajos programados en background (como la materialización periódica de `Clases` a partir de `Horarios`) nunca usan un rol con `BYPASSRLS`: iteran los Boxes activos y abren una transacción con `SET LOCAL app.box_id` por cada Box.
   - El MVP **no** incluye un panel de super-administrador global de la plataforma.

### 2.4. Identidad Global y Modelo de Autorización ([ADR 0001](./adr/0001-identidad-global-con-afiliacion-por-box.md), [ADR 0007](./adr/0007-cuatro-roles-atomicos-componibles.md))
- **Separación `Usuario` vs. `Afiliación` y Alta en Mostrador**: Las credenciales, el nombre y el email viven en la entidad global `Usuario`. Ningún Box puede alterar las credenciales ni resetear la contraseña de un Usuario, ni saber en qué otros Boxes participa. Cuando un `Recepcionista` o `Administrador` da de alta un Atleta por mostrador ingresando un email que no existía en la plataforma, el `Usuario` se crea con `password_hash = NULL` (pendiente de activación); en su primer ingreso desde el navegador/celular, el Usuario define su contraseña global por única vez a través de la pantalla de activación de cuenta.
- **Evaluación de permisos contextual**: Tras autenticarse, el Usuario selecciona el Box activo (o entra directamente si solo tiene una Afiliación). Todo token o sesión operativa transporta el par `(usuario_id, box_id)`.
- **Composición de Roles Atómicos**: La `Afiliación` contiene un conjunto de roles independientes (`['administrador', 'recepcionista', 'coach', 'atleta']`). Los permisos efectivos del Usuario en ese Box son la **unión** de las capacidades de los roles presentes en su Afiliación.

---

## 3. Casos de Uso Principales Mapeados a los 4 Roles Atómicos

### 3.1. Matriz de Responsabilidades por Rol ([ADR 0007](./adr/0007-cuatro-roles-atomicos-componibles.md))

| Capacidad / Módulo | Administrador | Recepcionista | Coach | Atleta |
| :--- | :---: | :---: | :---: | :---: |
| Configurar Box (moneda, zona horaria, ventanas) | **Sí** | No | No | No |
| Gestionar catálogo de Planes y Tipos de Clase | **Sí** | No | No | No |
| Gestionar Horarios recurrentes | **Sí** | No | No | No |
| Gestionar Afiliaciones y Roles del personal | **Sí** | No | No | No |
| Auditar caja y ejecutar Anulación de Pagos | **Sí** | No | No | No |
| Ajustar Precio de Membresía (becas/descuentos) y dar Baja Anticipada | **Sí** | No | No | No |
| Dar de alta perfiles de Atletas en el Box | **Sí** | **Sí** | No | No |
| Asignar y renovar Membresías (desde Planes activos) | **Sí** | **Sí** | No | No |
| Registrar Pagos y consultar Saldo / Morosos | **Sí** | **Sí** | No | No |
| Crear Reservas para Atletas (*walk-ins*) y editar Cupo de una Clase puntual | **Sí** | **Sí** | No | No |
| Ver lista de inscriptos y marcar/corregir Asistencia | **Sí** | **Sí** | **Sí** *(sus Clases)* | No |
| Autogestionar sus propias Reservas y cancelaciones | No *(salvo rol Atleta)* | No *(salvo rol Atleta)* | No *(salvo rol Atleta)* | **Sí** |

> **Nota sobre polivalencia**: En boxes pequeños donde el entrenador también cobra cuotas o anota atletas en recepción, su Afiliación se configura con `['coach', 'recepcionista']`. Si el dueño también entrena en su propio Box, su Afiliación tendrá `['administrador', 'atleta']`.

---

### 3.2. Historias de Usuario (*User Stories*)

#### A. Transversales: Identidad, Autenticación y Selección de Box
1. **Como Usuario**, quiero iniciar sesión con una única cuenta global (email y contraseña), para no tener credenciales duplicadas si entreno o trabajo en más de un Box.
2. **Como Usuario**, quiero recuperar o cambiar mi contraseña de forma global, para mantener el control de mi identidad sin depender de la administración de ningún Box en particular.
3. **Como Usuario con Afiliaciones en múltiples Boxes**, quiero ver un selector de Box al iniciar sesión y poder cambiar de Box activo en cualquier momento, para operar en cada centro con el contexto y roles que me corresponden allí.
4. **Como Usuario con múltiples roles en un mismo Box** (ej. `Coach` y `Recepcionista`), quiero acceder a las funcionalidades combinadas de todos mis roles activos sin tener que cerrar sesión, para resolver mis tareas operativas con fluidez.

#### B. Rol: Administrador (Dueño)
5. **Como Administrador**, quiero configurar los parámetros globales de mi Box (nombre, zona horaria IANA, moneda única, días de Anticipación de Reserva y horas/minutos de Ventana de Cancelación), para que todas las reglas de calendario y cobro reflejen las políticas de mi centro.
6. **Como Administrador**, quiero gestionar las Afiliaciones de mi Box asignando o revocando cualquiera de los 4 roles (`Administrador`, `Recepcionista`, `Coach`, `Atleta`) a un Usuario, para reflejar la estructura real de mi equipo.
7. **Como Administrador**, quiero crear, editar y desactivar Tipos de Clase (ej. *WOD*, *Halterofilia*, *Open Box*, *Endurance*), para clasificar la oferta deportiva del Box.
8. **Como Administrador**, quiero crear, editar y desactivar Planes en el catálogo del Box definiendo su nombre, Precio base, duración de Vigencia y modalidad de Créditos (cantidad de Créditos por Período semanal, cantidad fija para toda la Vigencia o ilimitado), para estandarizar las ofertas comerciales que Recepción puede vender.
9. **Como Administrador**, quiero actualizar el Precio base o las condiciones de un Plan del catálogo sabiendo que las Membresías ya creadas conservarán su copia original intacta, para poder ajustar precios ante la inflación sin alterar contratos vigentes.
10. **Como Administrador**, quiero definir y modificar Horarios recurrentes indicando día de la semana, hora local de inicio, duración, Tipo de Clase, Cupo por defecto y Coach por defecto, para que el sistema materialice automáticamente la grilla de Clases.
11. **Como Administrador**, quiero que al modificar o eliminar un Horario solo se regeneren o actualicen automáticamente las Clases futuras que aún no tienen Reservas, para no destruir inscripciones existentes sin mi intervención explícita.
12. **Como Administrador**, quiero editar una Clase puntual ya materializada (cambiar el Coach asignado a un suplente, modificar el horario o ajustar la cantidad de Cupos sin bajar del número de Reservas confirmadas), para resolver cambios operativos del día a día.
13. **Como Administrador**, quiero cancelar una Clase puntual (por feriado, corte de luz o fuerza mayor) de modo que el sistema cancele en cascada todas sus Reservas activas y devuelva automáticamente los Créditos a los Atletas afectados (incluso dentro de la Ventana de Cancelación), para no perjudicar a los atletas por una causa atribuible al Box.
14. **Como Administrador**, quiero ajustar manualmente el Precio de una Membresía específica (aplicando un descuento comercial o una beca a `$0`) al crearse o durante su curso, para contemplar acuerdos particulares sin ensuciar el catálogo de Planes.
15. **Como Administrador**, quiero ejecutar la Baja Anticipada de una Membresía vigente (acortando su fecha de fin de Vigencia y cancelando automáticamente todas las Reservas de Clases posteriores a la nueva fecha de fin), para resolver bajas definitivas por lesión o mudanza del Atleta.
16. **Como Administrador**, quiero auditar el listado completo de Pagos registrados en el Box filtrando por fechas, medio de pago y usuario que lo asentó, para controlar el cierre de caja diario y mensual.
17. **Como Administrador**, quiero corregir un Pago cargado por error aplicando una Anulación que deje constancia inmutable de quién lo anuló, cuándo y por qué motivo, recalculando al instante el Saldo de la Membresía, para mantener una contabilidad transparente y a prueba de manipulaciones.

#### C. Rol: Recepcionista (Staff Operativo)
18. **Como Recepcionista**, quiero dar de alta a un nuevo Atleta en el Box ingresando su email y nombre (creando su Usuario si no existe en la plataforma o vinculándolo si ya existe mediante una Afiliación con rol `Atleta`), para incorporarlo rápidamente en el mostrador.
19. **Como Recepcionista**, quiero ver en el perfil del Atleta únicamente sus datos de identidad básicos (nombre, email) y la historia perteneciente a nuestro Box, sin poder ver si entrena o debe dinero en otros Boxes.
20. **Como Recepcionista**, quiero asignar una Membresía a un Atleta seleccionando exclusivamente entre los Planes activos del catálogo y definiendo su fecha de inicio de Vigencia, para habilitarlo a reservar Clases de inmediato aunque todavía no haya efectuado el pago.
21. **Como Recepcionista**, quiero programar una Renovación por adelantado creando una Membresía futura cuya Vigencia comience después del vencimiento de la Membresía actual, para que el Atleta pueda reservar turnos de la semana siguiente sin interrupciones.
22. **Como Recepcionista**, quiero ajustar los Créditos de una Membresía vigente (por ejemplo, otorgando un Crédito extra de cortesía), para resolver situaciones puntuales de atención al cliente.
23. **Como Recepcionista**, quiero asentar un Pago manual e inmutable asociado a una Membresía indicando el monto recibido, el medio de pago (efectivo, transferencia, etc.) y la fecha, pudiendo registrar pagos parciales hasta cubrir el Precio, para llevar la caja diaria al día.
24. **Como Recepcionista**, quiero consultar el listado de Atletas Morosos (aquellos con al menos una Membresía con `Saldo > 0`) y ver el Saldo pendiente en el perfil de cada Atleta, para recordarles amablemente su deuda cuando llegan a entrenar.
25. **Como Recepcionista**, quiero registrar en el momento una Reserva para un Atleta que se presenta sin turno previo (*walk-in*), verificando que el sistema aplique las mismas validaciones estrictas de Membresía vigente, Créditos disponibles y Cupo libre que en la autogestión.
26. **Como Recepcionista**, quiero poder incrementar primero el Cupo total de una Clase puntual si la clase está llena y decidimos admitir excepcionalmente a un Atleta en mostrador, para luego crear su Reserva respetando siempre la invariante de capacidad.
27. **Como Recepcionista**, quiero marcar o rectificar la Asistencia de los Atletas en cualquier Clase del Box dentro de la Ventana de Corrección de Asistencia (24 horas desde el fin de la Clase), para asistir a los Coaches en el control de presentes.

#### D. Rol: Coach
28. **Como Coach**, quiero visualizar la agenda de las Clases que tengo asignadas en el Box junto con la lista actualizada de Atletas con Reserva confirmada, para preparar la sesión y saber quiénes van a entrenar.
29. **Como Coach**, quiero marcar la Asistencia de cada Atleta con Reserva confirmada durante el transcurso de mi Clase o hasta 24 horas después de finalizada (Ventana de Corrección de Asistencia), para dejar registro de quiénes se presentaron efectivamente.
30. **Como Coach**, quiero desmarcar una Asistencia marcada por error dentro de la Ventana de Corrección de Asistencia de 24 horas, para corregir equivocaciones al pasar lista en el piso de entrenamiento.
31. **Como Coach (con rol estricto de Coach)**, quiero tener una interfaz limpia enfocada únicamente en mis Clases y sus inscriptos, sin acceso a montos de Pagos, Saldos, configuración del Box ni alta de Reservas espontáneas (*walk-ins*), derivando a Recepción a cualquier Atleta que llegue sin Reserva o sin Créditos.

#### E. Rol: Atleta
32. **Como Atleta**, quiero consultar la grilla de Clases disponibles de mi Box dentro del horizonte permitido por la Anticipación de Reserva, viendo el Tipo de Clase, horario (en hora local del Box), Coach asignado y cantidad de Cupos libres, para planificar mi semana de entrenamiento.
33. **Como Atleta**, quiero reservar un Cupo en una Clase cuya fecha caiga dentro de la Vigencia de mi Membresía y para la cual tenga Créditos disponibles en el Período correspondiente, recibiendo confirmación inmediata de mi lugar.
34. **Como Atleta con Membresía impaga o parcial (`Saldo > 0`)**, quiero poder reservar mis Clases normalmente mientras mi Membresía esté vigente, dado que el estado de pago no bloquea el acceso deportivo.
35. **Como Atleta**, quiero que el sistema me impida reservar dos Clases cuyos horarios se superpongan o reservar dos veces la misma Clase, para no acaparar Cupos ni consumir Créditos por accidente.
36. **Como Atleta**, quiero cancelar mi Reserva antes de que comience la Ventana de Cancelación configurada por el Box, liberando el Cupo de inmediato y recuperando automáticamente mi Crédito para usarlo en otra Clase del mismo Período.
37. **Como Atleta**, quiero poder cancelar mi Reserva incluso cuando ya me encuentro dentro de la Ventana de Cancelación (**Cancelación Tardía**), siendo informado de que liberaré el Cupo para otro compañero pero **no** recuperaré el Crédito consumido.
38. **Como Atleta**, quiero aprovechar cualquier Cupo que se libere en una Clase previamente llena reservándolo manualmente desde la grilla (*first-come, first-served*), sin depender de listas de espera.
39. **Como Atleta**, quiero consultar el estado de mi Membresía actual y futura (Vigencia, Créditos restantes en el Período, historial de Reservas, Asistencias, Ausencias, Precio, Pagos realizados y Saldo pendiente), para tener claridad total sobre mi situación en el Box.

---

## 4. Reglas de Negocio Críticas y Decisiones de Implementación

### 4.1. Modelo Contable de Pagos Inmutables y Acceso Desacoplado ([ADR 0006](./adr/0006-acceso-desacoplado-del-pago.md))
1. **Separación entre Acceso y Dinero**:
   - La única condición comercial para crear una Reserva es poseer una **Membresía** cuya **Vigencia** cubra la fecha de la Clase y contar con **Créditos** disponibles en el **Período** de dicha Clase.
   - El estado contable de la Membresía (`Saldo > 0`) **nunca bloquea Reservas ni Asistencias** en el MVP; es información operativa para el `Administrador` y el `Recepcionista`.
2. **Inmutabilidad del Precio en la Membresía**:
   - Al crearse una Membresía a partir de un Plan, el `Precio` del Plan se copia a la Membresía.
   - El `Administrador` puede ajustar el `Precio` en la Membresía individual (descuentos o becas a `0`). Cambios posteriores en el catálogo de Planes no alteran las Membresías existentes.
3. **Eventos de Pago Inmutables y Pagos Parciales**:
   - Un **Pago** representa dinero efectivamente recibido (con `monto > 0`, `medio_pago`, `fecha_pago`, `registrado_por_usuario_id`). No existe el concepto ni el estado de "Pago pendiente".
   - Una Membresía admite múltiples Pagos (pagos parciales en efectivo/transferencia en distintas fechas).
4. **Prohibición de Edición/Borrado y Mecanismo de Anulación**:
   - Las filas de la tabla de `pagos` **no admiten `UPDATE` de montos/fechas ni `DELETE`**.
   - Si un `Recepcionista` o `Administrador` cometió un error al registrar un Pago, únicamente un `Administrador` puede registrar una **Anulación** sobre ese Pago (guardando `anulado_por_usuario_id`, `anulado_en` y `motivo_anulacion`) y luego cargar el Pago correcto si corresponde.
5. **Saldo Derivado y Condición de Moroso**:
   - El **Saldo** de una Membresía **se calcula, no se almacena** como columna mutable, evitando cualquier desincronización de doble fuente de verdad:
     $$\text{Saldo} = \text{Precio de la Membresía} - \sum \text{Monto de Pagos no anulados}$$
   - Un Atleta es **Moroso** si y solo si posee al menos una Membresía (vigente o vencida) con $\text{Saldo} > 0$.
6. **Representación Monetaria**:
   - Cada Box opera en una **única moneda** configurada a nivel de Box (ej. `ARS`, `USD`, `CLP`).
   - Todos los importes (`Precio`, `Pago.monto`) se almacenan como enteros en la unidad mínima de la moneda (`bigint` / centavos) o `numeric` exacto, prohibiéndose el uso de tipos de punto flotante (`float` / `double` / `Number` con decimales binarios).

### 4.2. Concurrencia e Integridad de Cupos y Créditos en Base de Datos ([ADR 0003](./adr/0003-integridad-de-cupos-y-creditos-en-base-de-datos.md))
Las validaciones en el frontend o en memoria de aplicación sirven únicamente para ofrecer mensajes amigables, nunca como barrera de integridad. Toda operación de **Reservar**, **Cancelar Reserva**, **Cancelar Clase** o **Baja Anticipada** ejecuta dentro de una transacción ACID en PostgreSQL siguiendo estas reglas estrictas:

1. **Orden Canónico de Bloqueo Pesimista (`SELECT ... FOR UPDATE`)**:
   - Para evitar *deadlocks* cuando múltiples peticiones compiten por la misma Clase o cuando un mismo Atleta envía peticiones concurrentes desde dos dispositivos, la transacción debe adquirir los bloqueos de fila **siempre en el mismo orden**:
     1. **Primero**: Bloquear la fila de la `Membresía` activa del Atleta (`SELECT ... FROM membresias WHERE box_id = $1 AND id = $2 FOR UPDATE`). Esto serializa automáticamente todas las operaciones de reserva del mismo Atleta.
     2. **Segundo**: Bloquear la fila de la `Clase` objetivo (`SELECT ... FROM clases WHERE box_id = $1 AND id = $2 FOR UPDATE`). Esto serializa el conteo de Cupos de esa Clase.
2. **Invariante de Cupos**:
   - Con la `Clase` bloqueada, se cuenta la cantidad de `Reservas` en estado confirmado para esa Clase. Si `reservas_confirmadas >= clase.cupos`, la transacción aborta con error de dominio (`CupoAgotado`).
   - Al editar manualmente los `Cupos` de una Clase, una restricción/validación transaccional impide fijar `clase.cupos < reservas_confirmadas`.
3. **Invariante de Créditos por Período y Bolsa de `creditos_extra`**:
   - Con la `Membresía` bloqueada, si la Membresía no es ilimitada, se calcula el total de Créditos consumidos en el **Período** al que pertenece la fecha de la Clase (sumando Reservas confirmadas, Asistencias, Ausencias y Cancelaciones Tardías de ese Período).
   - El campo `creditos_extra` de la `Membresía` actúa como una **bolsa de ajuste para toda la `Vigencia`** (no se multiplica ni se renueva cada lunes):
     - En modalidad `VIGENCIA_TOTAL`: el tope disponible durante la Vigencia es `creditos_por_periodo + creditos_extra`.
     - En modalidad `SEMANAL`: en cada Período semanal el Atleta consume primero sus `creditos_por_periodo` semanales; solo cuando alcanza ese límite semanal, una Reserva adicional puede respaldarse consumiendo del remanente de `creditos_extra` de la Membresía (calculando cuántas reservas en toda la Vigencia superaron el cupo semanal respectivo).
   - Si no quedan Créditos del Período ni remanente en `creditos_extra`, la transacción aborta con error de dominio (`SinCreditosDisponibles`). No existe deuda ni adelanto de Créditos.
4. **Unicidad y No Superposición Horaria**:
   - Un índice único parcial en PostgreSQL sobre `(box_id, clase_id, atleta_id)` para Reservas activas impide la doble inscripción en la misma Clase.
   - Con la `Membresía` bloqueada, se verifica en la misma transacción que el Atleta no posea otra Reserva confirmada en una Clase cuyo intervalo `[inicio, fin)` se solape con `[clase.inicio, clase.fin)`.
5. **Unicidad de Membresía Vigente por Fecha**:
   - Un Atleta puede tener como máximo **una** Membresía vigente para una fecha calendario dada (pudiendo coexistir su Membresía actual con una Membresía futura de **Renovación** cuyos intervalos de `Vigencia` `[fecha_inicio, fecha_fin]` no se solapen, garantizado mediante constraint de exclusión `EXCLUDE USING gist` en PostgreSQL o validación serializada por Afiliación).

### 4.3. Manejo del Calendario, Zonas Horarias y Materialización de Clases ([ADR 0002](./adr/0002-clases-materializadas-desde-horario.md), [ADR 0005](./adr/0005-calculos-de-calendario-en-zona-horaria-del-box.md))
1. **Zona Horaria del Box como Única Referencia**:
   - Cada Box almacena su identificador de zona horaria IANA (ej. `America/Argentina/Buenos_Aires`).
   - Todos los instantes (`clase.inicio`, `clase.fin`, `reserva.creada_en`, `pago.anulado_en`) se guardan en PostgreSQL como `timestamptz`.
   - Todo cálculo de corte de día, semana o comparación contra la `Vigencia` convierte el instante a la zona horaria del Box (`AT TIME ZONE box.timezone`), nunca a UTC puro ni a la zona horaria del navegador del usuario.
2. **Definición Exacta de Período y Vigencia**:
   - Las fechas de `Vigencia` de una Membresía (`fecha_inicio`, `fecha_fin`) son fechas calendario (`date`), inclusivas, interpretadas en la zona horaria del Box. Una Reserva es válida si la fecha local de inicio de la Clase cae dentro de `[fecha_inicio, fecha_fin]`, sin importar en qué día se realiza el clic de reserva.
   - En Membresías de renovación semanal, el **Período** es fijo: **lunes 00:00:00.000 a domingo 23:59:59.999** en la zona horaria del Box. Las semanas parciales al inicio o al final de la Vigencia otorgan la totalidad de los Créditos semanales (no hay prorrateo).
   - En Membresías mensuales o por pack total de clases, el **Período** es la totalidad de la `Vigencia`.
   - Cada Crédito consumido se imputa siempre al **Período en el que cae la fecha y hora de inicio de la Clase**, nunca a la fecha en que se efectuó la Reserva.
3. **Materialización de Clases desde el Horario**:
   - Los `Horarios` definen la regla recurrente en hora local del Box (ej. "Lunes 07:00, 60 min").
   - Un proceso periódico materializa filas en la tabla `clases` convirtiendo la hora local del Box a `timestamptz` hasta cubrir un horizonte de generación al menos igual a la `Anticipación de Reserva` máxima del Box.
   - Una vez creada, cada `Clase` tiene ciclo de vida propio. Si cambia un `Horario`, solo se regeneran las Clases futuras **sin Reservas activas**; las que ya poseen Reservas quedan intactas para que el `Administrador` decida si las mantiene, edita o cancela manualmente.
4. **Cancelación de una Clase por el Box**:
   - Cuando un `Administrador` cancela una `Clase` puntual, dentro de la misma transacción todas sus `Reservas` confirmadas pasan a estado cancelado por el Box y **se restituyen íntegramente los Créditos** a las Membresías de los Atletas afectados, **incluso si la cancelación ocurre dentro de la Ventana de Cancelación**.

### 4.4. Manejo de *Walk-ins*, Ventana de Cancelación y Ciclo de Asistencia ([ADR 0003](./adr/0003-integridad-de-cupos-y-creditos-en-base-de-datos.md), [ADR 0007](./adr/0007-cuatro-roles-atomicos-componibles.md))
1. **Atletas Espontáneos (*Walk-ins*) sin Excepciones**:
   - No existe una entidad ni flujo especial de *walk-in*. Cuando un Atleta llega sin turno, únicamente un `Recepcionista` o `Administrador` (nunca un `Coach` puro) puede crearle una **Reserva ordinaria** desde el panel.
   - Esta operación ejecuta exactamente la misma transacción y validaciones que la reserva por app: exige Membresía vigente, Crédito disponible en el Período y Cupo libre en la Clase.
   - Si el Atleta no tiene Membresía o Créditos, debe regularizar su Membresía en Recepción antes de poder ser anotado. Si la Clase está llena, el sistema rechaza la Reserva (para forzar su ingreso, el staff debe editar primero la entidad `Clase` e incrementar su `Cupo`).
2. **Ventana de Cancelación y Cancelación Tardía**:
   - Si una Reserva es cancelada antes de `clase.inicio - box.ventana_cancelacion`, la Reserva pasa a `Cancelada`, libera el Cupo de inmediato y **devuelve el Crédito** al Período correspondiente.
   - Si se cancela dentro del intervalo `(clase.inicio - box.ventana_cancelacion, clase.inicio]`, se registra como **Cancelación Tardía**: libera el Cupo inmediatamente para que otro Atleta pueda aprovecharlo, pero **el Crédito permanece consumido**.
3. **Asistencia, Ventana de Corrección (24 hs) y Consolidación de Ausencia**:
   - El `Coach` (para sus Clases), el `Recepcionista` o el `Administrador` pueden marcar o desmarcar la **Asistencia** de cualquier Reserva confirmada desde el inicio de la Clase hasta **24 horas después de `clase.fin`** (**Ventana de Corrección de Asistencia**).
   - Transcurridas las 24 horas posteriores a `clase.fin`, el registro de asistencia queda cerrado para modificaciones operativas y toda Reserva confirmada que no posea marca de `Asistencia` queda consolidada automáticamente como **Ausencia** (manteniendo el Crédito consumido).

### 4.5. Ausencia de Lista de Espera (*First-Come, First-Served*) ([ADR 0003](./adr/0003-integridad-de-cupos-y-creditos-en-base-de-datos.md))
- El MVP **no incluye Lista de Espera** en ninguna variante (ni pasiva por notificaciones ni activa por promoción automática).
- Cuando una Clase alcanza el límite de sus `Cupos`, cualquier intento de Reserva es rechazado.
- Si posteriormente un Atleta cancela su Reserva (sea en término o como Cancelación Tardía), el Cupo se libera en el acto en la base de datos y vuelve a mostrarse disponible en la grilla para el primer Atleta que ejecute manualmente una Reserva válida (*first-come, first-served*).

---

### 4.6. Decisiones de Testing, BDD/TDD y Costuras de Verificación (*Testing Seams*)
Siguiendo el principio de probar comportamiento externo observable y no detalles internos de implementación:

1. **Stack Oficial de Testing y Costuras (*Seams*)**:
   - **BDD / Aceptación e Integración E2E (`Playwright` + `playwright-bdd`)**: Archivos `.feature` (escritos en español `# language: es` respetando el [`GLOSSARY.md`](../GLOSSARY.md)) vinculados a sus `.steps.ts`. Cubren los criterios *Given / When / Then* de los 12 tickets tanto a nivel API REST + PostgreSQL en Docker (sin abrir navegador cuando el escenario no requiere UI) como a nivel E2E de interfaz en Next.js.
   - **Pruebas Focalizadas y de Concurrencia (`Vitest`)**: Archivos `.spec.ts` para esquemas Zod en `packages/shared`, funciones puras de calendario/zona horaria y pruebas de estrés de concurrencia (`Promise.all` contra PostgreSQL real).
   - **CI en GitHub Actions (`.github/workflows/ci.yml`)**: Ejecución automática en cada Pull Request y push a `main` contra un contenedor de servicio PostgreSQL real con RLS activo.
2. **Invariantes Críticas a Verificar en Tests**:
   - **Aislamiento RLS**: Dos Boxes creados en el mismo test; verificar que cualquier consulta o mutación ejecutada bajo el contexto `SET LOCAL app.box_id = BoxA` jamás retorna ni modifica Membresías, Clases, Reservas ni Pagos de `BoxB`, y que intentar referenciar un `clase_id` de `BoxB` desde `BoxA` falla por integridad referencial/RLS.
   - **Concurrencia de Cupos y Créditos**: Lanzar $N$ promesas simultáneas (`Promise.all`) reservando el último Cupo disponible de una Clase o el último Crédito de una Membresía, verificando que exactamente una transacción confirma y las $N-1$ restantes son rechazadas limpiamente sin producir sobrecupo ni saldo negativo de Créditos.
   - **Bordes de Zona Horaria**: Probar reservas para una Clase del domingo a las `22:30` hora local del Box (que en UTC ya es lunes `01:30`), verificando que el Crédito se descuenta del Período semanal del domingo y no del lunes siguiente.
   - **Contabilidad Inmutable**: Verificar que el Saldo de una Membresía refleja exactamente `Precio − Σ Pagos no anulados` tras múltiples pagos parciales y anulaciones, y que un Atleta con `Saldo > 0` puede reservar Clases sin restricción.
   - **Composición de Roles**: Verificar que una Afiliación con `['coach']` recibe `403 Forbidden` al intentar crear un *walk-in* o registrar un Pago, mientras que una Afiliación con `['coach', 'recepcionista']` puede ejecutar ambas acciones pero recibe `403 Forbidden` al intentar modificar un `Plan` o anular un `Pago`.

### 4.7. Fuera del Alcance del MVP (*Out of Scope*)
Quedan explícitamente excluidos de este MVP (`centris-app`):
- El sitio web comercial público (**`centris-landing`**), que se desarrolla y despliega en un repositorio separado.
- Integración con pasarelas de pago online (Mercado Pago, Stripe, etc.), cobros recurrentes automáticos y facturación fiscal/electrónica.
- Lista de Espera (*waitlist*) y notificaciones push/email de cupos liberados.
- Panel de Super-Administrador de la plataforma SaaS (el aprovisionamiento inicial de Boxes se realiza por script/seed administrativo).
- Soporte multi-moneda dentro de un mismo Box.
- Prorrateo de Créditos en semanas parciales o acumulación de Créditos no usados hacia el Período siguiente (*rollover*).
- Seguimiento deportivo de entrenamientos (carga de WODs del día, pizarras de resultados, récords personales / *PRs*).
