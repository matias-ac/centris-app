# Identidad Visual y Sistema de Diseño — Centris (`centris-app`)

Este documento define las reglas visuales, tipográficas, de color, componentes y arquetipos de pantalla para el frontend de **Centris** (`apps/web`), construido con **Next.js (App Router)**, **Tailwind CSS** y **`shadcn/ui`**.

Su objetivo es garantizar que todas las pantallas desarrolladas a lo largo de los 12 *Vertical Slices* mantengan una estética cohesiva, profesional y adaptada al contexto operativo de cada uno de los **4 Roles atómicos** (`Administrador`, `Recepcionista`, `Coach`, `Atleta`).

---

## 1. Dirección Estética y Paleta de Colores ("Centris")

**Centris** combina la precisión administrativa de un sistema contable/operativo con la energía de un centro de entrenamiento funcional:

- **Superficies y Neutros (`Zinc`)**:
  - Escala base de grises fríos y limpios (`zinc-50` a `zinc-950`), evitando fondos grises apagados o saturados.
  - **Modo Claro (`light`) por defecto en vistas de escritorio/mostrador** (`Administrador` y `Recepcionista`), optimizado para lectura rápida de tablas, saldos y horarios en ambientes iluminados.
  - **Soporte nativo de Modo Oscuro (`dark`) / Alto Contraste**, ideal para el uso móvil del `Atleta` y la tablet/celular del `Coach` en el piso de entrenamiento.
- **Color Primario de Marca (`Emerald` — Energía y Confirmación)**:
  - **Primario (`emerald-600` en light / `emerald-500` en dark)**: reservado para las acciones principales de cada pantalla (*Reservar Clase*, *Asignar Membresía*, *Registrar Pago*, *Marcar Asistencia*) y el indicador del Box activo.
  - **Secundario / Superficie destacada (`zinc-900` / `zinc-100`)**: acciones secundarias, navegación activa y encabezados.

---

## 2. Tipografía y Regla Obligatoria de Números Tabulares (`tabular-nums`)

- **Fuente de Interfaz (`--font-sans`)**: `Geist Sans` o `Inter`. Jerarquía clara mediante peso (`font-semibold` en títulos y totales) y contraste de color (`text-zinc-900` para dato primario, `text-zinc-500` para metadatos).
- **Fuente Monoespaciada / Números Tabulares (`--font-mono` + `tabular-nums`)**:
  > [!IMPORTANT]
  > **Regla obligatoria para `/code-review`**: Todo dato numérico o temporal que se compare en listas, tablas o tarjetas **debe** incluir la clase `tabular-nums` (y preferiblemente `font-mono` en importes y horarios) para evitar saltos visuales y alinear columnas al píxel.

  Aplicar `tabular-nums` obligatoriamente en:
  1. **Precios, Pagos y Saldos**: `$ 35.000`, `Saldo: $ 15.000`.
  2. **Horarios y Duraciones**: `07:00 – 08:00`, `60 min`.
  3. **Contadores de Cupos de una Clase**: `18 / 20 Cupos`.
  4. **Contadores de Créditos de una Membresía**: `2 / 3 Créditos (Semana)` o `6 / 8 Créditos (Vigencia)`.
  5. **Fechas de Vigencia**: `01/11/2026 – 30/11/2026`.

- **Formateo Localizado**:
  - Los montos monetarios se formatean siempre con `Intl.NumberFormat('es-AR', { style: 'currency', currency: box.moneda, maximumFractionDigits: 0 })` (o según los decimales de la moneda del Box), nunca concatenando el signo `$` a mano sin separador de miles.

---

## 3. Mapa de Badges Semánticos del Dominio

Para que un `Recepcionista`, `Administrador`, `Coach` o `Atleta` reconozca el estado de una entidad de un vistazo, los *Badges* mantienen siempre el mismo código cromático en todas las pantallas:

| Estado / Concepto del [`GLOSSARY.md`](../GLOSSARY.md) | Variante Visual (Tailwind / `shadcn/ui`) | Uso en el Sistema |
| :--- | :--- | :--- |
| **`Confirmada`** (Reserva) / **`Asistencia`** / **`Vigente`** (Membresía) / **`Al día`** (`Saldo == 0`) | **Esmeralda (`bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20`)** | Indica habilitación activa, lugar asegurado o cuenta saldada. |
| **`Cancelación Tardía`** / **`Membresía Futura`** (`Renovación`) / **`Últimos Cupos`** | **Ámbar (`bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20`)** | Alerta operativa o estado programado que requiere atención sin ser un bloqueo. |
| **`Moroso`** (`Saldo > 0`) / **`Ausencia`** / **`Cancelada por Box`** / **`Pago Anulado`** / **`Baja Anticipada`** | **Rojo / Rosa (`bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20`)** | Deuda pendiente, pérdida de crédito por inasistencia o anulación auditable. |
| **`Cancelada`** (en término) / **`Vencida`** / **`Inactivo`** | **Neutro (`bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20`)** | Registro histórico cerrado sin deuda ni penalización. |

> [!NOTE]
> **Recordatorio de Dominio ([ADR 0006](./adr/0006-acceso-desacoplado-del-pago.md))**: El badge rojo de **`Moroso (`Saldo > 0`)`** es una señal visual informativa para `Recepcionista` y `Administrador` (y visible para el propio `Atleta` en su estado de cuenta), pero **nunca deshabilita el botón de "Reservar"** mientras la Membresía esté en `Vigencia` y tenga `Créditos`.

---

## 4. Arquetipos de Layout según los 4 Roles Componibles ([ADR 0007](./adr/0007-cuatro-roles-atomicos-componibles.md))

El layout principal se adapta dinámicamente a la unión de roles de la `Afiliación` activa del Usuario en el `Box` seleccionado:

### 4.1. Arquetipo de Gestión en Escritorio/Tablet (`Administrador` y `Recepcionista`)
- **Navegación**: Sidebar lateral fija a la izquierda que incluye en su parte superior el **Selector de Box** (mostrando el nombre del Box activo y los roles activos del usuario en él) y las secciones habilitadas según sus permisos:
  - Ambos ven: *Clases y Walk-ins*, *Atletas*, *Membresías*, *Pagos y Morosos*.
  - Solo `Administrador` ve: *Catálogo de Planes*, *Tipos de Clase y Horarios*, *Equipo (Afiliaciones)*, *Configuración del Box* y el botón de *Anular Pago* / *Baja Anticipada* / *Editar Precio*.
- **Interacción de Mostrador**:
  - Tablas densas y limpias con buscador instantáneo por nombre/email y filtros rápidos (ej. filtro *"Solo Morosos"*).
  - Uso de **`Dialog` / `Sheet` (Drawer lateral)** de `shadcn/ui` para acciones frecuentes de mostrador (*Registrar Pago*, *Asignar Membresía*, *Anotar Walk-in*) sin sacar al recepcionista de la pantalla que está mirando.
  - Los pagos con **Anulación** se muestran en el historial con el importe tachado (`line-through text-zinc-400`), el badge `Pago Anulado` y un *tooltip* o detalle con quién lo anuló, cuándo y el motivo.

### 4.2. Arquetipo de Piso de Entrenamiento (`Coach`)
- **Foco y Privacidad Financiera**: Si el usuario tiene únicamente el rol `['coach']`, la interfaz **no muestra ningún importe, Precio, Pago ni estado de Moroso**.
- **Diseño *Touch-Friendly***:
  - Selector rápido de las `Clases` del día asignadas al Coach.
  - Cabecera de la Clase con el `Tipo de Clase`, horario, contador de inscriptos (`14 / 16`) y estado de la **Ventana de Corrección de Asistencia** (indicando cuántas horas restan para el cierre de 24 hs).
  - Lista de Atletas con Reserva confirmada donde cada fila tiene un **botón táctil grande (mínimo `44px x 44px`)** para marcar o desmarcar **Asistencia** con un solo toque y feedback visual inmediato.

### 4.3. Arquetipo Mobile-First de Autogestión (`Atleta`)
- **Viewport Primario**: Diseñado primero para pantallas móviles (`360px – 430px` de ancho), sin tablas horizontales que desborden.
- **Estructura**:
  - Encabezado compacto con el **Selector de Box** (si entrena en más de un Box) y un resumen visible de su **Membresía Vigente** (`Créditos disponibles en el Período` con `tabular-nums`).
  - Selector horizontal de fechas (*Hoy, Mañana, Mié 25...*) acotado por los días de **Anticipación de Reserva** del Box.
  - **Tarjetas de Clase (`ClaseCard`)**: muestran `hora_inicio – hora_fin` (`tabular-nums`), `Tipo de Clase`, nombre del `Coach`, `Cupos libres` y el botón de acción directo (*Reservar*, *Cancelar Reserva* o aviso claro de *Cancelación Tardía* si ya está dentro de la `Ventana de Cancelación`).
  - Navegación inferior fija (*Grilla de Clases*, *Mis Reservas*, *Mi Membresía y Pagos*).
