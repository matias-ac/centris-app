# Centris — Identidad Visual y Design System (`centris-app`, Versión 2 — Dark Bento Cockpit)

Especificación oficial de identidad visual, paleta cromática *Dark Bento Cockpit*, matriz de accesibilidad WCAG 2.1, sistema tipográfico (`Inter` único), shell de navegación con sidebar vertical, reglas de estabilidad responsive y componentes semánticos para el proyecto **Centris** (`apps/web`, construido con **Next.js App Router + Tailwind CSS v4 + `shadcn/ui`**).

> [!NOTE]
> Este documento unifica la especificación de [`apps/web/DESIGN.md`](../apps/web/DESIGN.md) y los prototipos aprobados en `.scratch/propuesta-*.html`. Es la fuente de verdad compartida entre diseño (`impeccable`) y desarrollo/revisión (`/implement`, `/tdd`, `/code-review`).

---

# PARTE 1 — Paleta Cromática y Contraste

La identidad visual de **Centris v2** abandona el contraste duro negro/neón condensado y adopta un esquema **100% *Dark-First* de estética *Dark Bento Cockpit***: superficies oscuras graduadas (*Canvas Obsidian* `#09090B`, *Surface Card* `#111214` y *Surface Elevated* `#18191C`) separadas por bordes finos (`1px solid #232428`), combinadas con un único acento de foco y acción (**Volt Lime `#C1F429`**).

## 1.1 Tokens de Marca y Escala de Superficies Oscuras

| Token Semántico | Nombre | HEX | Luminancia ($L$) | Uso en la Interfaz |
| :--- | :--- | :---: | :---: | :--- |
| `--background` | **Canvas Obsidian** | `#09090B` | `0.003` | `bg-background` — Fondo raíz de la aplicación y pozos de `<input>` / `<select>`. |
| `--card` / `--popover` | **Surface Card** | `#111214` | `0.006` | `bg-card` — Superficie de tarjetas Bento (`rounded-3xl`), sidebar izquierdo y contenedores de listas/tablas. |
| `--secondary` / `--muted` / `--accent` | **Surface Elevated** | `#18191C` | `0.010` | `bg-secondary` — Cápsulas del topbar, filas internas (`rounded-2xl`), botones secundarios y *hover* de filas. |
| `--border` / `--input` | **Border Hairline** | `#232428` | `0.018` | `border-border` — Líneas divisorias `1px`, contornos de tarjetas, pills y botones circulares (`↗`). |
| `--foreground` | **Pure White** | `#FFFFFF` | `1.000` | `text-foreground` — Títulos, cifras protagonistas, nombres y texto operativo principal. |
| `--muted-foreground` | **Cool Gray** | `#A1A1AA` | `0.360` | `text-muted-foreground` — Subtítulos de tarjetas, metadatos, placeholders y descripciones cortas. |
| `--primary` | **Volt Lime** | `#C1F429` | `0.762` | `bg-primary text-primary-foreground` — **Exclusivo para CTA principal**, ítem activo del sidebar y barra/indicador protagonista. |
| `--volt-hover` | **Volt Lime Hover** | `#AEDF1B` | `0.619` | Estado *hover* / *pressed* de botones y pills Volt Lime. |
| `--volt-tint` | **Volt Lime Tint** | `#F4FDE0` | `0.949` | Referencia clara de la escala cuando se requiera contraste extremo sobre superficies oscuras. |
| `--primary-foreground` | **Pure Black** | `#000000` | `0.000` | Texto e íconos obligatorios sobre `#C1F429`. |

---

## 1.2 Matriz de Contraste — Medida y Verificada (WCAG 2.1)

Ratios calculados mediante la fórmula de luminancia relativa de **WCAG 2.1** ($(L_1 + 0.05) / (L_2 + 0.05)$).
*Umbrales de referencia: AA texto normal $\ge 4.5$ · AA texto grande $\ge 3.0$ · AAA texto normal $\ge 7.0$ · Componentes UI y bordes activos $\ge 3.0$.*

| Combinación | Ratio Medido | Texto Normal | Texto Grande | UI / Gráficos |
| :--- | :---: | :---: | :---: | :---: |
| **Pure White (`#FFFFFF`) sobre Canvas Obsidian (`#09090B`)** | **19.90 : 1** | AAA | AAA | ✅ |
| **Pure White (`#FFFFFF`) sobre Surface Card (`#111214`)** | **18.74 : 1** | AAA | AAA | ✅ |
| **Pure Black (`#000000`) sobre Volt Lime (`#C1F429`)** *(CTA / Sidebar activo)* | **16.24 : 1** | AAA | AAA | ✅ |
| **Volt Lime (`#C1F429`) sobre Canvas Obsidian (`#09090B`)** | **15.39 : 1** | AAA | AAA | ✅ |
| **Volt Lime (`#C1F429`) sobre Surface Card (`#111214`)** | **14.49 : 1** | AAA | AAA | ✅ |
| **Cool Gray (`#A1A1AA`) sobre Surface Card (`#111214`)** | **7.31 : 1** | AAA | AAA | ✅ |
| **Cool Gray (`#A1A1AA`) sobre Surface Elevated (`#18191C`)** | **6.86 : 1** | AA | AAA | ✅ |
| **⚠️ Pure White (`#FFFFFF`) sobre Volt Lime (`#C1F429`)** | **1.29 : 1** | ❌ Falla | ❌ Falla | ❌ Falla |
| **⚠️ Pure White (`#FFFFFF`) sobre Mint Active (`#18FFC8`)** | **1.30 : 1** | ❌ Falla | ❌ Falla | ❌ Falla |

### ⚠️ Reglas Cromáticas Innegociables

1. **The Black-on-Volt Rule**: Nunca colocar texto o íconos blancos (`#FFFFFF`) sobre `#C1F429` (`1.29 : 1`) ni sobre `#18FFC8` (`1.30 : 1`). Todo elemento sobre Volt Lime usa **Pure Black (`#000000`)** (`16.24 : 1`).
2. **The Single-Signal Accent Rule**: `#C1F429` señala foco de navegación activo, acción primaria o barra/dato protagonista — nunca se repite en múltiples *badges* informativos de una tabla o listado.

| Permitido con `Volt Lime (#C1F429)` | Prohibido con `Volt Lime (#C1F429)` |
| :--- | :--- |
| Botón CTA principal con texto e íconos `#000000` | Texto o íconos blancos (`#FFFFFF`) encima de `#C1F429` |
| Cápsula del ítem activo en el sidebar izquierdo y foco (`--ring`) | Usarlo como fondo de cards completas o alertas de error |
| Barra o porción protagonista en KPIs y gráficos (`recharts`) | Repetirlo en *Badges* de estado de fila (*Confirmada*, *Vigente*, *Al día*) |

---

## 1.3 Badges y Colores Semánticos de Dominio

Los estados de negocio de [`GLOSSARY.md`](../GLOSSARY.md) utilizan chips `rounded-full` con fondo translúcido al `14%` sobre `#111214` / `#18191C` y etiqueta corta en español (*Sentence case*):

| Estado Semántico | Color Texto | Fondo (`14%`) | Ratio vs `#111214` | Entidades de Dominio Asociadas |
| :--- | :---: | :---: | :---: | :--- |
| **Mint Active** (`mint`) | `#18FFC8` | `rgba(24, 255, 200, 0.14)` | **14.44 : 1** (AAA) | *Reserva Confirmada*, *Asistencia*, *Membresía Vigente*, *Al día ($0)*, *Cupos disponibles* |
| **Amber Warning** (`amber`) | `#FBBF24` | `rgba(251, 191, 36, 0.14)` | **11.23 : 1** (AAA) | *Cancelación Tardía*, *Últimos Cupos*, *Membresía Futura*, *Sin guardar*, *Borrador* |
| **Coral Alert** (`coral`) | `#FF6D6D` | `rgba(255, 109, 109, 0.14)` | **6.84 : 1** (AA/AAA) | *Moroso (`Saldo > 0`)*, *Ausencia*, *Clase Cancelada*, *Pago Anulado*, *Baja Anticipada*, acciones destructivas |
| **Cool Gray / Neutro** (`zinc`) | `#A1A1AA` | `rgba(161, 161, 170, 0.14)` | **7.31 : 1** (AAA) | *Reserva Cancelada (en término)*, *Membresía Vencida*, *Plan/Horario Inactivo* |

> [!NOTE]
> **Reglas de Accesibilidad y Dominio en Estados**:
> 1. **El color nunca es el único portador del significado**: todo estado o error debe acompañarse de etiqueta textual clara en español, ícono de apoyo cuando aplique y `aria-invalid` en controles inválidos.
> 2. **Desacople entre Pago y Reserva ([ADR 0006](./adr/0006-acceso-desacoplado-del-pago.md))**: El badge **`Moroso`** alerta visualmente, pero **jamás deshabilita ni oculta el botón primario `Reservar`** mientras la Membresía esté en `Vigencia` y posea `Créditos`.
> 3. **Prohibida la jerga técnica visible**: no mostrar nombres de enum crudos (`SEMANAL`, `VIGENCIA_TOTAL`, `ILIMITADO`), códigos HTTP (`403 Forbidden`) ni prefijos técnicos (`${errorCode}: ...`) en el copy de la UI. Traducir siempre al lenguaje del usuario en español rioplatense.

---

# PARTE 2 — Sistema Tipográfico

Centris v2 utiliza una **única familia tipográfica**: **`Inter`** cargada mediante `next/font/google` con `display: "swap"` y `subsets: ["latin", "latin-ext"]`. Se elimina `Oswald` y se abandona el uso sistemático de mayúsculas forzadas (*all-caps*) en encabezados y tarjetas.

## 2.1 Familia Única y Pesos

* **Tipografía Única (`--font-sans`)**: **`Inter`** (`Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`).
* **Pesos habilitados**: **`300` (Light)**, **`400` (Regular)**, **`500` (Medium)** y **`600` (SemiBold)**.

## 2.2 Escala Tipográfica (*Sentence case*)

| Rol Tipográfico | Tamaño / `clamp()` | Peso | Line-Height | Tracking (`em`) | Uso Principal |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Display** | `clamp(1.75rem, 1.45rem + 1.4vw, 2.375rem)` | `500` (o `300`/`500` KPI) | `1.10` | `-0.025em` | Cifras KPI protagonistas (ingresos del mes, ocupación semanal, créditos disponibles). |
| **Headline (`<h1>`)** | `clamp(1.375rem, 1.2rem + 0.8vw, 1.75rem)` | `500` | `1.20` | `-0.02em` | Encabezado principal de pantalla en *Sentence case*. |
| **Title (`<h2>` / `<h3>`)** | `1.0625rem` (`17px`) | `500` | `1.30` | `-0.01em` | Títulos de cards Bento (`24px` radius) con subtítulo breve debajo en `#A1A1AA`. |
| **Body** | `0.875rem`–`0.9375rem` (`14px`–`15px`) | `400`–`500` | `1.50` | `0em` | Copy operativo, listas, celdas de tabla y botones CTA (`15px`, `500`/`600`). |
| **Label / Badge** | `0.75rem` (`12px`) | `500` | `1.35` | `+0.02em` | Badges semánticos en *Sentence case*, etiquetas de filtro y subtítulos de métricas. |

## 2.3 Reglas Tipográficas Obligatorias

> [!IMPORTANT]
> **Reglas verificadas en `/code-review`**:

1. **Sentence case en títulos, navegación y badges**: no forzar `uppercase` en títulos ni botones (salvo siglas reales como `WOD`, `PR`, `ARS`, `USD`, `KPI`).
2. **Prohibido `font-mono` en importes de negocio**: los precios, saldos y contadores usan `Inter` + `.tabular-nums` (`font-variant-numeric: tabular-nums`), reservando tipografía monoespaciada únicamente si algún dato técnico lo requiriera (no para montos ni horarios).
3. **Uso obligatorio de `.tabular-nums`**: todo importe (`Intl.NumberFormat('es-AR', { style: 'currency', currency: box.moneda, maximumFractionDigits: 0 })`), horario (`07:00 – 08:00`), cupo (`18/20`), porcentaje y crédito (`6/8`) debe llevar `tabular-nums`.
4. **The 16px Input Floor Rule**: `<input>`, `<select>` y `<textarea>` deben tener tamaño de fuente mínimo **`16px` (`1rem` / `text-base`)** en móvil para evitar *auto-zoom* de Safari iOS al enfocar.

---

# PARTE 3 — Geometría, Elevación y Shell de Navegación

## 3.1 Radios y Superficies Tonales

Centris v2 usa capas tonales planas con bordes `1px solid #232428` (sin sombras pesadas):
`#09090B` (canvas) $\rightarrow$ `#111214` (sidebar y Bento cards) $\rightarrow$ `#18191C` (cápsulas topbar, sub-ítems, pozos internos y botones secundarios).

* **Bento Cards / Contenedores principales**: `24px` (`rounded-3xl`), padding `22px–24px`.
* **Filas internas / Pozos Bento**: `16px` (`rounded-2xl`).
* **Inputs / Selects / Textareas**: `12px` (`rounded-xl`), altura mínima `44px`.
* **Botones primarios/secundarios/destructivos, botones circulares `↗`, chips/badges y pills del sidebar**: `9999px` (`rounded-full`), altura mínima `44px` en todo control táctil interactivo.
* **Patrón de capacidad / progreso**: barras con relleno sólido `#C1F429` sobre pista con **rayado diagonal** sutil oscuro (`repeating-linear-gradient`).

## 3.2 Shell Autenticado (`(box)/layout.tsx`) y Arquetipos por Rol ([ADR 0007](./adr/0007-cuatro-roles-atomicos-componibles.md))

1. **Sidebar vertical izquierdo (desktop `>= 1024px`, ancho `248px` / `15.5rem`)**:
   * Fondo `#111214`, borde derecho `1px solid #232428`, logotipo de Centris arriba.
   * Muestra **ícono + nombre visible de cada sección** (prohibido ocultar etiquetas detrás de un rail solo-íconos en desktop), filtrado por los roles activos de la `Afiliación`: `Panel` (`/inicio`), `Horarios` (`/horarios`), `Calendario de Clases` (`/clases`), `Mis Reservas` (`/reservas`), `Planes` (`/planes`), `Atletas` (`/atletas`), `Caja y Morosos` (`/caja`), `Afiliaciones` (`/afiliaciones`) y `Configuración` (`/configuracion`) al pie.
   * El ítem activo usa cápsula `rounded-full` con fondo `#C1F429` y texto/ícono `#000000`.
   * En móvil (`< 1024px`) colapsa a un drawer táctil accesible desde el topbar con objetivos `>= 44px`.
   * **Contrato E2E obligatorio**: preservar todos los `data-testid` de navegación existentes (`nav-link-*`, `box-activo-nombre`, `roles-activos-badges`).
2. **Topbar contextual de cápsulas**:
   * Cápsulas `#18191C` (`rounded-full`, `border #232428`) para cambio rápido de Box activo (`/seleccionar-box`), fecha/zona horaria operativa y menú de usuario / cierre de sesión.
3. **Arquetipos por Rol**:
   * **`Administrador` / `Recepcionista`**: grillas Bento asimétricas (`minmax(min(100%, 300px–340px), 1fr)`) y listas densas con filtros en chips; paneles laterales (`SideDrawer`) e interacción contextual sin diálogos nativos.
   * **`Coach`**: foco operativo en *Clases del Día*, ventana de 24 hs de asistencia y botones de asistencia `>= 44px`, sin exponer montos ni caja si no tiene rol financiero.
   * **`Atleta`**: diseño *mobile-first* despejado para elegir fecha dentro de la anticipación del Box, ver cupos con `tabular-nums`, reservar en 1 toque y consultar créditos/saldo vigente ([ADR 0006](./adr/0006-acceso-desacoplado-del-pago.md)).

## 3.3 Reglas de Estabilidad Layout y Anti-Overflow (Notebook + Mobile)

Estas reglas previenen regresiones visuales observadas durante la auditoría de las 12 pantallas:

1. **Prohibido `confirm()` / `alert()` nativos del navegador**: reemplazar confirmaciones destructivas por **confirmación inline (`InlineConfirm`)** o botón/strip contextual dentro de la card o drawer.
2. **Grillas Bento sin desborde en notebooks (`1280px–1366px`)**: usar columnas `minmax(min(100%, 300px), 1fr)` (o `320px`/`340px` según ancho mínimo de acciones) y permitir `flex-wrap: wrap` + `min-width: 0` en grupos de botones dentro de cards para que ningún botón sobresalga de la card.
3. **Filas interactivas sin saltos al cambiar estado (`Layout Shift = 0`)**:
   * En `/afiliaciones`, usar grilla de columnas fijas en desktop (ej. columna de acciones dedicada `264px`) y una franja/strip inferior (`border-top`) o reserva fija para el estado `"Sin guardar"` y el botón `Guardar roles`, evitando empujar controles al editar roles.
   * En `/seleccionar-box`, separar el badge superior (`ARS` + `Activo ahora`) en su propia fila (`eyebrow`) por encima de un bloque de encabezado con altura mínima reservada para nombre del Box y ciudad/zona horaria, evitando que las cards crezcan o se desalineen entre sí en desktop.
4. **Alineación responsive de formularios compuestos (`/configuracion`)**: apilar pares de campos `.two-cols` en 1 columna por debajo de `768px` y alinear las etiquetas superiores (`.field-label`) para que los inputs horizontales queden nivelados cuando un label ocupa 2 líneas.
5. **Listados de caja/auditoría en mobile (`/caja`)**: permitir `flex-wrap: wrap; max-width: 100%; white-space: normal` en pills KPI de encabezado y estructurar las filas de auditoría móvil en grilla de 2 columnas balanceada sin colapso horizontal.

---

# PARTE 4 — Configuración Técnica (Tailwind CSS v4 + `shadcn/ui`)

## 4.1 Tokens y Variables en `apps/web/src/app/globals.css` (Tailwind v4)

```css
@import "tailwindcss";
@import "tw-animate-css";

:root,
.dark {
  /* Superficies Dark Bento Cockpit */
  --background: #09090B;
  --foreground: #FFFFFF;

  --card: #111214;
  --card-foreground: #FFFFFF;

  --popover: #111214;
  --popover-foreground: #FFFFFF;

  /* Acento de Acción Principal: Volt Lime (#C1F429) con texto Negro obligatorio */
  --primary: #C1F429;
  --primary-foreground: #000000;

  /* Superficies Elevadas y Atenuadas */
  --secondary: #18191C;
  --secondary-foreground: #FFFFFF;

  --muted: #18191C;
  --muted-foreground: #A1A1AA;

  --accent: #18191C;
  --accent-foreground: #FFFFFF;

  /* Estados Semánticos y Bordes Hairline */
  --destructive: #FF6D6D;
  --destructive-foreground: #000000;

  --border: #232428;
  --input: #232428;
  --ring: #C1F429;

  --radius: 1.5rem; /* 24px base para Bento Cards */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* Tokens explícitos Centris v2 */
  --color-volt-lime: #C1F429;
  --color-volt-hover: #AEDF1B;
  --color-volt-tint: #F4FDE0;
  --color-canvas-obsidian: #09090B;
  --color-surface-card: #111214;
  --color-surface-elevated: #18191C;
  --color-border-hairline: #232428;
  --color-mint-active: #18FFC8;
  --color-amber-warning: #FBBF24;
  --color-coral-alert: #FF6D6D;

  /* Familia Tipográfica Única */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

## 4.2 Configuración de Fuente en `apps/web/src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Centris",
  description: "Plataforma de gestión para boxes y centros de entrenamiento funcional",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} dark`}>
      <body className="bg-background text-foreground font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

---

## Resumen Operativo (v2)

| Parámetro | Definición Oficial en Centris v2 |
| :--- | :--- |
| **Estética y Tema** | *Dark Bento Cockpit*: `Canvas Obsidian #09090B`, `Surface Card #111214`, `Surface Elevated #18191C`, borde `1px solid #232428` |
| **Acento Primario** | **Volt Lime `#C1F429`** (hover `#AEDF1B`) — siempre con texto e íconos `#000000` (`16.24:1` AAA) |
| **Contraste Prohibido** | Prohibido texto `#FFFFFF` sobre `#C1F429` (`1.29:1`) o sobre `#18FFC8` (`1.30:1`) |
| **Badges Semánticos** | `Mint #18FFC8` (`14.44:1`), `Amber #FBBF24` (`11.23:1`), `Coral #FF6D6D` (`6.84:1`), `Zinc #A1A1AA` (`7.31:1`) sobre fondo `14%` |
| **Tipografía** | **Únicamente `Inter`** (`300`, `400`, `500`, `600`) en *Sentence case* · `tabular-nums` en montos, horarios, cupos y créditos · inputs $\ge 16\text{px}$ |
| **Geometría y Touch** | Cards `24px` (`rounded-3xl`), sub-ítems `16px` (`rounded-2xl`), inputs `12px` (`rounded-xl`), botones/chips `rounded-full` con altura $\ge 44\text{px}$ |
| **Navegación** | Sidebar vertical izquierdo `248px` en desktop (`>= 1024px`) con ícono + etiqueta visible; drawer táctil en móvil (`< 1024px`) |
