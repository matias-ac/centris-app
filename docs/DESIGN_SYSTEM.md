# Centris — Identidad Visual y Design System (`centris-app`)

Especificación oficial de identidad visual, paleta cromática de alto contraste deportivo, matriz de accesibilidad WCAG 2.1, sistema tipográfico y componentes semánticos para el proyecto **Centris** (`apps/web`, construido con **Next.js App Router + Tailwind CSS v4 + `shadcn/ui`**).

---

# PARTE 1 — Paleta Cromática y Contraste

La identidad visual de **Centris** se basa en un esquema **100% *Dark-First* de alto impacto deportivo y contraste elevado**, inspirado en estética atlética técnica: superficies oscuras profundas (*Pure Black* y *Charcoal*) combinadas con un único acento energético de acción (**Volt Athletic `#E2F800`**).

## 1.1 Tokens de Marca y Escala de Superficies Oscuras

Para evitar que las tarjetas, tablas y modales se fundan con el fondo negro puro, el sistema define una escala graduada de superficies en tonos `Zinc` fríos:

| Token Semántico | Nombre | HEX | Luminancia ($L$) | Clase Tailwind / Uso en la Interfaz |
| :--- | :--- | :---: | :---: | :--- |
| `--background` | **Pure Black** | `#000000` | `0.000` | `bg-background` — Fondo general de aplicación, móvil y piso de entrenamiento. |
| `--card` / `--popover` | **Charcoal Zinc** | `#121214` | `0.006` | `bg-card` — Superficie de tarjetas de Clase, tablas, *Dialogs* y *Drawers*. |
| `--secondary` / `--muted` | **Elevated Zinc** | `#1C1C1F` | `0.012` | `bg-secondary` / `hover:bg-muted` — Botones secundarios, cabeceras de tabla y *hover* de filas. |
| `--border` / `--input` | **Muted Zinc** | `#27272A` | `0.020` | `border-border` — Separadores de filas, bordes de tarjetas y campos de formulario en reposo. |
| `--foreground` | **Pure White** | `#FFFFFF` | `1.000` | `text-foreground` — Títulos primarios, importes, métricas y nombres principales. |
| `--muted-foreground` | **Cool Gray** | `#A1A1AA` | `0.359` | `text-muted-foreground` — Etiquetas secundarias, subtítulos, fechas y metadatos. |
| `--primary` | **Volt Athletic** | `#E2F800` | `0.833` | `bg-primary text-primary-foreground` — **Exclusivo para acción principal (CTA)**, foco (`--ring`) e ítem activo. |
| `--volt-hover` | **Volt Pressed** | `#CDE000` | `0.685` | `hover:bg-volt-500` — Estado *hover* / presionado del botón primario. |

---

## 1.2 Matriz de Contraste — Medida y Verificada (WCAG 2.1)

Ratios calculados mediante la fórmula de luminancia relativa de **WCAG 2.1** ($(L_1 + 0.05) / (L_2 + 0.05)$).
*Umbrales de referencia: AA texto normal $\ge 4.5$ · AA texto grande $\ge 3.0$ · AAA texto normal $\ge 7.0$ · Componentes UI y bordes activos $\ge 3.0$.*

| Combinación | Ratio Medido | Texto Normal | Texto Grande | UI / Gráficos |
| :--- | :---: | :---: | :---: | :---: |
| **Blanco (`#FFFFFF`) sobre Pure Black (`#000000`)** | **21.00 : 1** | AAA | AAA | ✅ |
| **Blanco (`#FFFFFF`) sobre Charcoal (`#121214`)** | **18.71 : 1** | AAA | AAA | ✅ |
| **Negro (`#000000`) sobre Volt (`#E2F800`)** *(Botón CTA)* | **17.66 : 1** | AAA | AAA | ✅ |
| **Volt (`#E2F800`) sobre Pure Black (`#000000`)** | **17.66 : 1** | AAA | AAA | ✅ |
| **Volt (`#E2F800`) sobre Charcoal (`#121214`)** | **15.74 : 1** | AAA | AAA | ✅ |
| **Cool Gray (`#A1A1AA`) sobre Charcoal (`#121214`)** | **7.29 : 1** | AAA | AAA | ✅ |
| **⚠️ Blanco (`#FFFFFF`) sobre Volt (`#E2F800`)** | **1.19 : 1** | ❌ Falla | ❌ Falla | ❌ Falla |

### ⚠️ Restricción Crítica del Acento `Volt (#E2F800)`

El color **Volt (`#E2F800`)** tiene una luminancia relativa altísima (`0.833`, muy cercana al blanco). Contra el blanco (`#FFFFFF`) arroja un ratio de **`1.19 : 1`**, fallando todos los niveles de accesibilidad. Además, por su alta saturación, usarlo en exceso en elementos informativos anula la jerarquía visual de la pantalla.

| Permitido con `Volt (#E2F800)` | Prohibido con `Volt (#E2F800)` |
| :--- | :--- |
| Fondo de botones de acción principal (`CTA`) **siempre con texto e íconos en negro `#000000`** (`--primary-foreground`) | Texto o íconos blancos (`#FFFFFF`) encima de un fondo Volt |
| Indicador de navegación activa, pestaña seleccionada o borde de foco (`--ring`) sobre fondo oscuro (`#000000` / `#121214`) | Usarlo sobre cualquier superficie clara o blanca |
| Acento puntual en métricas clave o contadores destacados sobre fondo oscuro | Usarlo en *Badges* de tabla repetitivos (*Confirmada*, *Vigente*, *Al día*) donde competiría con el botón CTA |
| — | Fondos de bloques grandes, cabeceras de página o alertas de error/advertencia |

---

## 1.3 Badges y Colores Semánticos de Dominio

Para que el acento **Volt (`#E2F800`)** conserve su poder de señalar **dónde hacer clic**, los estados informativos de las entidades del [`GLOSSARY.md`](../GLOSSARY.md) utilizan colores semánticos dedicados con fondo translúcido (`15%`) y borde sutil (`30%`) sobre `#121214`:

| Estado Semántico | Color Texto | Ratio vs `#121214` | Clases Tailwind (`Badge`) | Entidades de Dominio Asociadas |
| :--- | :---: | :---: | :--- | :--- |
| **Éxito / Activo (`Emerald`)** | `#34D399` (`emerald-400`) | **10.4 : 1** (AAA) | `bg-emerald-500/15 text-emerald-400 border-emerald-500/30` | *Reserva Confirmada*, *Asistencia*, *Membresía Vigente*, *Saldo $0 (Al día)* |
| **Advertencia (`Amber`)** | `#FBBF24` (`amber-400`) | **11.8 : 1** (AAA) | `bg-amber-500/15 text-amber-400 border-amber-500/30` | *Cancelación Tardía*, *Últimos Cupos*, *Membresía Futura (Renovación)* |
| **Destructivo (`Rose`)** | `#FB7185` (`rose-400`) | **6.9 : 1** (AA/AAA) | `bg-rose-500/15 text-rose-400 border-rose-500/30` | *Moroso (`Saldo > 0`)*, *Ausencia*, *Clase Cancelada*, *Pago Anulado*, *Baja Anticipada* |
| **Histórico / Neutro (`Zinc`)** | `#A1A1AA` (`zinc-400`) | **7.29 : 1** (AAA) | `bg-zinc-500/15 text-zinc-400 border-zinc-500/30` | *Reserva Cancelada (en término)*, *Membresía Vencida*, *Plan/Horario Inactivo* |

> [!NOTE]
> **Reglas de Accesibilidad y Dominio en Estados**:
> 1. **El color nunca es el único portador del significado**: todo estado o error de formulario debe acompañarse de su etiqueta textual explícita, ícono de apoyo y atributo `aria-invalid` cuando corresponda.
> 2. **Desacople entre Pago y Reserva ([ADR 0006](./adr/0006-acceso-desacoplado-del-pago.md))**: El badge **`Moroso (`Saldo > 0`)`** alerta visualmente al `Recepcionista`, al `Administrador` y al propio `Atleta`, pero **jamás deshabilita ni oculta el botón primario `Reservar`** mientras la Membresía esté en `Vigencia` y posea `Créditos`.

---

# PARTE 2 — Sistema Tipográfico

Se utilizan dos familias abiertas de Google Fonts cargadas mediante `next/font/google` con `display: "swap"` y `subsets: ["latin", "latin-ext"]` (soporte completo de tildes y `ñ`):

## 2.1 Familias y Techo de Pesos

1. **Tipografía Display y Métricas Deportivas — `Oswald` (`--font-display`)**:
   * **Pesos habilitados**: únicamente **`600` (SemiBold)** y **`700` (Bold)**.
   * **Propósito**: Aporta verticalidad, rigor y carácter atlético en encabezados de página (`<h1>`, `<h2>`), nombres de `Tipo de Clase` (*WOD*, *Halterofilia*, *Open Box*) y cifras de resumen en tarjetas de indicadores.
2. **Tipografía de Interfaz, Tablas y Lectura — `Inter` (`--font-sans`)**:
   * **Pesos habilitados**: únicamente **`400` (Regular)**, **`500` (Medium)** y **`600` (SemiBold)**.
   * **Propósito**: Máxima legibilidad en tablas densas de administración, formularios, botones, navegación y texto corrido.

---

## 2.2 Escala Tipográfica Fluida Mobile-First (`clamp()`)

Definida desde mobile (`360px`) hacia desktop (`1280px+`) usando `clamp()` para escalar sin saltos bruscos y con `letter-spacing` expresado en `em`:

| Rol Tipográfico | Familia | Mobile | Desktop | `clamp()` / Valor | Peso | Tracking (`em`) | Line-Height |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: |
| **Estadística / Saldo Destacado** | `Oswald` | `32px` | `44px` | `clamp(2rem, 1.6rem + 1.8vw, 2.75rem)` | `700` | `-0.02em` | `1.05` |
| **`<h1>` Título de Pantalla** | `Oswald` | `26px` | `36px` | `clamp(1.625rem, 1.35rem + 1.2vw, 2.25rem)` | `700` | `-0.02em` | `1.15` |
| **`<h2>` Título de Sección / Modal** | `Oswald` | `20px` | `26px` | `clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem)` | `600` | `-0.015em` | `1.20` |
| **`<h3>` Nombre de Clase (`ClaseCard`)** | `Oswald` | `18px` | `20px` | `clamp(1.125rem, 1.05rem + 0.3vw, 1.25rem)` | `600` | `-0.01em` | `1.25` |
| **Cuerpo General / Formulario (`Input`)** | `Inter` | `16px` | `16px` | `1rem` *(mínimo estricto en inputs)* | `400` | `normal` | `1.50` |
| **Botón CTA / Navegación** | `Inter` | `15px` | `15px` | `0.9375rem` | `600` | `0.01em` | `1.00` |
| **Celda de Tabla / Metadato** | `Inter` | `14px` | `14px` | `0.875rem` | `400` | `normal` | `1.45` |
| **Header de Tabla / Eyebrow / Badge** | `Inter` | `12px` | `12px` | `0.75rem` | `600` | `+0.06em` | `1.35` |

---

## 2.3 Números Tabulares (`tabular-nums`) y Reglas Tipográficas

> [!IMPORTANT]
> **Reglas Obligatorias verificadas en `/code-review`**:

1. **Uso obligatorio de `tabular-nums`**:
   Toda cifra que aparezca en tablas, tarjetas o contadores debe llevar la clase `tabular-nums` (`font-variant-numeric: tabular-nums`) para alinear decenas, centenas y separadores al píxel:
   * **Precios, Pagos y Saldos**: formateados con `Intl.NumberFormat('es-AR', { style: 'currency', currency: box.moneda, maximumFractionDigits: 0 })` (ej. `$ 35.000`).
   * **Rangos Horarios**: `07:00 – 08:00`, `60 min`.
   * **Contadores de Capacidad y Consumo**: `Cupos: 18/20`, `Créditos: 6/8`.
2. **Tracking según tamaño y caja**:
   * **Tracking negativo (`-0.02em` / `tracking-tight`) solo en `Oswald` de `18px` hacia arriba**.
   * **Tracking positivo (`+0.06em` / `tracking-wider`) en todo texto pequeño en mayúsculas** (encabezados de tabla, *eyebrows*, *badges*), para evitar que los trazos verticales se peguen.
3. **Mayúsculas siempre por CSS (`uppercase`)**:
   * Nunca escribir palabras enteras en mayúsculas en el HTML/JSX ni en la base de datos (excepto siglas reales como `WOD`, `PR`, `ARS`, `USD`). Aplicar la transformación mediante la clase `uppercase` (`text-transform: uppercase`) para no degradar lectores de pantalla.
4. **Prohibido bajar de `16px` (`1rem` / `text-base`) en `<input>`, `<select>` y `<textarea>` móviles**:
   * Por debajo de `16px`, Safari en iOS fuerza un *auto-zoom* al enfocar el campo, descuadrando el layout móvil del `Atleta` y del `Coach`.

---

# PARTE 3 — Arquetipos de Layout por Rol ([ADR 0007](./adr/0007-cuatro-roles-atomicos-componibles.md))

1. **Gestión en Escritorio/Tablet (`Administrador` / `Recepcionista`)**:
   * Sidebar lateral fija (`#121214`) con el **Selector de Box** en la cabecera y navegación filtrada según la unión de roles de la `Afiliación` activa.
   * Tablas densas sobre superficie `#121214` con bordes `#27272A`, *hover* `#1C1C1F` y filtros rápidos (ej. *"Solo Morosos"*).
   * Modales contextuales (`Dialog`) y paneles laterales (`Sheet` / `Drawer`) para registrar Pagos, asignar Membresías y anotar *walk-ins* sin perder el contexto del listado.
2. **Piso de Entrenamiento (`Coach`)**:
   * Vista despejada sin datos financieros (si no posee rol de Recepcionista o Administrador, no ve Precios, Pagos ni Saldos).
   * Foco en sus *Clases del Día*, indicador de tiempo restante de la **Ventana de Corrección de Asistencia (24 hs)** y lista interactiva de inscriptos.
   * Botones de gran formato (*touch targets* $\ge 44\text{px} \times 44\text{px}$) para marcar o desmarcar **Asistencia** con un solo toque.
3. **Autogestión Mobile-First (`Atleta`)**:
   * Barra de navegación inferior fija (*Reservar*, *Mis Clases*, *Mi Membresía*).
   * Selector horizontal de días acotado por la **Anticipación de Reserva** del Box.
   * Tarjetas de clase (`ClaseCard`) con encabezado en `Oswald uppercase`, horario y cupos en `tabular-nums` y botón CTA directo en `Volt (#E2F800)` con texto negro `#000000`.

---

# PARTE 4 — Configuración Técnica (Tailwind CSS v4 + `shadcn/ui`)

## 4.1 Tokens y Variables en `apps/web/src/app/globals.css` (Tailwind v4)

En **Tailwind CSS v4**, toda la configuración del tema y el mapeo de variables semánticas de `shadcn/ui` viven unificados en `globals.css` utilizando valores HEX directos y `@theme inline`:

```css
@import "tailwindcss";
@import "tw-animate-css";

:root,
.dark {
  /* Superficies y Texto */
  --background: #000000;
  --foreground: #FFFFFF;

  --card: #121214;
  --card-foreground: #FFFFFF;

  --popover: #121214;
  --popover-foreground: #FFFFFF;

  /* Acento de Acción Principal: Volt Athletic (#E2F800) con texto Negro obligatorio */
  --primary: #E2F800;
  --primary-foreground: #000000;

  /* Superficies Secundarias y Atenuadas */
  --secondary: #1C1C1F;
  --secondary-foreground: #FFFFFF;

  --muted: #1C1C1F;
  --muted-foreground: #A1A1AA;

  --accent: #1C1C1F;
  --accent-foreground: #FFFFFF;

  /* Estados Destructivos y Bordes */
  --destructive: #FB7185;
  --destructive-foreground: #000000;

  --border: #27272A;
  --input: #27272A;
  --ring: #E2F800;

  --radius: 0.5rem;
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

  /* Escala explícita de Volt para utilidades puntuales */
  --color-volt-50: #FCFFE5;
  --color-volt-400: #E2F800;
  --color-volt-500: #CDE000;

  /* Familias Tipográficas */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-oswald), ui-sans-serif, system-ui, sans-serif;

  /* Escala Tipográfica Fluida */
  --text-stat: clamp(2rem, 1.6rem + 1.8vw, 2.75rem);
  --text-stat--line-height: 1.05;
  --text-stat--letter-spacing: -0.02em;

  --text-h1: clamp(1.625rem, 1.35rem + 1.2vw, 2.25rem);
  --text-h1--line-height: 1.15;
  --text-h1--letter-spacing: -0.02em;

  --text-h2: clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem);
  --text-h2--line-height: 1.2;
  --text-h2--letter-spacing: -0.015em;

  --text-h3: clamp(1.125rem, 1.05rem + 0.3vw, 1.25rem);
  --text-h3--line-height: 1.25;
  --text-h3--letter-spacing: -0.01em;
}
```

---

## 4.2 Configuración de Fuentes en `apps/web/src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  variable: "--font-oswald",
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
    <html lang="es" className={`${inter.variable} ${oswald.variable} dark`}>
      <body className="bg-background text-foreground font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

---

## Resumen Operativo

| Parámetro | Definición Oficial en Centris |
| :--- | :--- |
| **Esquema de Tema** | 100% *Dark-First* (`Pure Black #000000` + `Charcoal #121214` + `Elevated #1C1C1F`) |
| **Color Primario de Acción** | **Volt Athletic `#E2F800`** (Reservado para CTA, foco e ítem activo) |
| **Restricción Crítica de Contraste** | Prohibido texto blanco sobre `Volt #E2F800` (`1.19:1`). Todo texto sobre Volt va en `#000000` (`17.66:1` AAA) |
| **Badges Semánticos** | Éxito en `Emerald #34D399` (`10.4:1`), Aviso en `Amber #FBBF24` (`11.8:1`), Error/Moroso en `Rose #FB7185` (`6.9:1`) |
| **Familias Tipográficas** | **Oswald** (`600`, `700`) para Display/Clases · **Inter** (`400`, `500`, `600`) para UI/Tablas |
| **Reglas Tipográficas** | `tabular-nums` obligatorio en cifras/horarios · `uppercase` solo por CSS · Inputs móviles $\ge 16\text{px}$ (`1rem`) |
| **Configuración CSS** | **Tailwind CSS v4** unificado en `app/globals.css` mediante `@theme inline` |
