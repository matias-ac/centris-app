# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Centris (`centris-app`) atiende de forma integral a cuatro roles atómicos y componibles dentro de centros de entrenamiento funcional, boxes de CrossFit y gimnasios boutique en Argentina:

- **Administrador (Dueño del centro)**: gestiona configuración del Box, catálogo de Planes, Tipos de Clase, Horarios recurrentes, Afiliaciones y roles del equipo, ajustes de Precio (descuentos/becas), Baja Anticipada de Membresías, cancelación de Clases y auditoría de Pagos y Anulaciones.
- **Recepcionista (Mostrador)**: da de alta Atletas, asigna y renueva Membresías desde Planes activos, ajusta `creditos_extra`, registra Pagos, consulta el listado de Morosos, anota Reservas espontáneas (*walk-ins*), ajusta Cupos puntuales y registra/corrige Asistencias.
- **Coach (Piso de entrenamiento)**: consulta sus Clases asignadas y la nómina de inscriptos para marcar o rectificar Asistencia dentro de las 24 horas posteriores al fin de la Clase. Sin rol de Recepcionista o Administrador, no ve precios, pagos ni saldos.
- **Atleta (Alumno)**: autogestiona desde el celular o navegador su grilla de Clases disponibles, Reservas, cancelaciones (en término o tardías) y consulta la Vigencia, Créditos disponibles, Pagos y Saldo de su Membresía.

Una misma persona puede combinar roles dentro de un Box (por ejemplo, `['coach', 'recepcionista']` o `['administrador', 'atleta']`) y participar en múltiples Boxes con una única cuenta global.

## Product Purpose

Reemplazar planillas de cálculo, cuadernos y grupos de mensajería por un sistema web multitenant ordenado, auditable y a prueba de errores operativos para la gestión diaria de clases, reservas, membresías y caja de un centro de entrenamiento.

El éxito del producto significa:
- Cero sobrecupos o doble consumo de créditos bajo reservas concurrentes.
- Cero fricción comercial para el alumno habitual que abona en mostrador días después de iniciar el mes.
- Trazabilidad contable completa sin ediciones silenciosas ni borrado de cobros.
- Separación clara de permisos para cada función del equipo, adaptable tanto a boxes unipersonales como a centros con personal dedicado.

## Positioning

- **Identidad global con aislamiento estricto por Box**: cuenta única por `Usuario` en toda la plataforma y acceso por `Afiliación`, con aislamiento multitenant garantizado en base de datos mediante Row Level Security forzado (`box_id`).
- **Acceso deportivo desacoplado del pago**: la Membresía vigente con Créditos habilita reservar y entrenar aunque tenga `Saldo > 0` (estado Moroso); el cobro es estrictamente informativo/contable para mostrador y administración.
- **Contabilidad inmutable y auditable**: los Pagos no se editan ni eliminan; solo se corrigen mediante Anulación registrada por un Administrador con motivo y autoría.
- **Integridad transaccional y calendario local del Box**: bloqueos pesimistas en base de datos (`Membresía -> Clase`), sin listas de espera automáticas (*first-come, first-served*), y todos los cortes de Vigencia, Período semanal (lunes a domingo), Anticipación de Reserva y Ventana de Cancelación evaluados en la zona horaria IANA del Box.

## Operating Context

- **Entorno de aplicación**: aplicación web en Next.js App Router (`apps/web`, puerto `3000`) conectada a la API REST de NestJS (`apps/api`, puerto `3001`) y PostgreSQL 16 con RLS activo; autenticación portable vía Auth.js (JWT).
- **Contextos físicos de uso**:
  - Escritorio/tablet en recepción y administración (tablas densas, filtros de morosos/auditoría, modales de operación).
  - Piso de entrenamiento para Coach (interacción rápida con una mano o tablet al tomar lista).
  - Teléfono móvil para Atletas en tránsito o antes/después de entrenar (consulta rápida de cupos, reserva y cancelación).
- **Flujo de primer ingreso**: los Atletas dados de alta en mostrador con email nuevo inician sin contraseña (`password_hash = NULL`) y la activan en `/activar-cuenta`.
- **Rutas operativas actuales**: `/login`, `/activar-cuenta`, `/seleccionar-box`, `/inicio`, `/horarios`, `/clases`, `/reservas`, `/planes`, `/atletas`, `/caja`, `/afiliaciones` y `/configuracion`.

## Capabilities and Constraints

- **Capacidades confirmadas en el MVP**:
  - Autenticación global, activación de cuenta en primer ingreso, selector de Box activo y composición de los 4 roles.
  - Configuración del Box (nombre, zona horaria IANA, moneda única ISO 4217, `anticipacion_reserva_dias`, `ventana_cancelacion_minutos`).
  - Catálogo de Planes (`SEMANAL`, `VIGENCIA_TOTAL`, `ILIMITADO`) con copia inmutable de condiciones al crear Membresías.
  - Directorio de Atletas, asignación/renovación de Membresías sin solapamiento de vigencias, ajuste de `creditos_extra`, ajuste de `precio` y Baja Anticipada con cancelación en cascada de reservas futuras.
  - Caja contable de Pagos parciales/totales inmutables, Anulaciones auditables y reporte de Morosos.
  - Tipos de Clase, Horarios recurrentes, materialización idempotente de Clases en la zona horaria del Box, edición puntual de Cupos/Coach/horario y cancelación de Clase con restitución automática de Créditos.
  - Motor de Reservas concurrente, detección de superposición horaria, Cancelación en término vs. Cancelación Tardía, alta en mostrador (*walk-in*) y marcado/corrección de Asistencia dentro de la ventana de 24 horas post-clase con consolidación de Ausencias.
- **Lenguaje ubicuo obligatorio (`GLOSSARY.md`)**: `Box`, `Usuario`, `Afiliación`, `Rol`, `Atleta`, `Coach`, `Recepcionista`, `Administrador`, `Plan`, `Membresía`, `Crédito`, `Período`, `Vigencia`, `Baja Anticipada`, `Renovación`, `Precio`, `Pago`, `Anulación`, `Saldo`, `Moroso`, `Tipo de Clase`, `Horario`, `Clase`, `Cupo`, `Anticipación de Reserva`, `Reserva`, `Ventana de Cancelación`, `Cancelación Tardía`, `Asistencia`, `Ventana de Corrección de Asistencia`, `Ausencia`.
- **Fuera del alcance del MVP (no prometer ni simular en UI)**:
  - Pasarelas de pago online (Mercado Pago, Stripe) o cobros automáticos recurrentes.
  - Listas de espera automáticas ni notificaciones push/email por liberación de cupos.
  - Panel de Super-Administrador SaaS en la interfaz (el alta de Boxes es por seed/script).
  - Multi-moneda por Box, prorrateo de créditos en semanas parciales o *rollover* de créditos.
  - Seguimiento de entrenamientos (WODs, pizarra de resultados o récords personales).

## Brand Commitments

- **Nombre del producto**: **Centris** (`centris-app`; el sitio comercial público `centris-landing` vive en un repositorio separado).
- **Voz y tono**: español rioplatense/argentino formal pero simple y directo en la interfaz de usuario, evitando tecnicismos de ingeniería frente a dueños, recepción, coaches y atletas.
- **Referencia de diseño existente**: el repositorio cuenta con una especificación previa en `docs/DESIGN_SYSTEM.md` y una implementación visual inicial en `apps/web`.

## Evidence on Hand

- **Estado del proyecto**: MVP académico y productivo en etapa demostrativa; **no existen aún clientes reales en producción, testimonios, métricas de uso ni casos de éxito publicados**. No se debe fabricar ni simular prueba social.
- **Dataset oficial de demostración (`apps/api/src/database/seed.ts`)**:
  - 2 Boxes: `Box Centris Norte` y `Box Centris Sur` (ambos en `America/Argentina/Buenos_Aires`, `ARS`).
  - 7 usuarios de prueba con distintos roles y casos (administrador, recepcionista, coach multi-box y multi-rol, coach puro, atleta al día, atleta moroso y atleta pendiente de activación).

## Product Principles

1. **Claridad por rol antes que acumulación de pantallas**: cada persona ve y opera exclusivamente las acciones habilitadas por la unión de sus roles en el Box activo.
2. **El dinero se audita; el entrenamiento no se traba por mostrador**: la deuda es visible para gestión, nunca un bloqueo técnico para el atleta con membresía vigente.
3. **Inmutabilidad y trazabilidad ante errores**: los cobros y cancelaciones dejan registro histórico explícito en lugar de desaparecer en silencio.
4. **Cero sorpresas de horario o cupo**: todas las fechas, cortes semanales y límites operan en la hora local real del gimnasio y bajo garantías transaccionales.
5. **Lenguaje cotidiano del gimnasio**: la interfaz habla en términos claros de clases, cupos, planes, saldos y asistencia, sin exponer códigos o jerga técnica innecesaria.

## Accessibility & Inclusion

- Entradas de formulario en móvil con tamaño mínimo de `16px` (`1rem`) para evitar auto-zoom en iOS Safari.
- Áreas táctiles amplias (`>= 44px × 44px`) en acciones de piso de entrenamiento y autogestión móvil (marcado de asistencia, reservas).
- El color nunca debe ser el único portador del significado de un estado o error (siempre acompañar con etiqueta textual clara, ícono y atributos ARIA como `aria-invalid` cuando corresponda).
- Contraste accesible (WCAG 2.1 AA o superior) en textos, estados semánticos, formularios y botones principales.
