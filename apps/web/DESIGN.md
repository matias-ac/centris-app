---
name: Centris
description: Sistema visual dark-first de estética bento modular con acento volt-lime (#C1F429), tarjetas de bordes generosos (24px) y barra lateral vertical izquierda para la gestión operativa de boxes.
colors:
  volt-lime: "#C1F429"
  volt-lime-hover: "#AEDF1B"
  volt-lime-tint: "#F4FDE0"
  pure-black: "#000000"
  canvas-obsidian: "#09090B"
  surface-card: "#111214"
  surface-elevated: "#18191C"
  border-hairline: "#232428"
  pure-white: "#FFFFFF"
  cool-gray: "#A1A1AA"
  mint-active: "#18FFC8"
  amber-warning: "#FBBF24"
  coral-alert: "#FF6D6D"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "clamp(1.75rem, 1.45rem + 1.4vw, 2.375rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "clamp(1.375rem, 1.2rem + 0.8vw, 1.75rem)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0.02em"
rounded:
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.volt-lime}"
    textColor: "{colors.pure-black}"
    rounded: "{rounded.full}"
    padding: "10px 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.volt-lime-hover}"
    textColor: "{colors.pure-black}"
  button-secondary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.full}"
    padding: "10px 18px"
    height: "44px"
  button-icon-circle:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.full}"
    padding: "0px"
    height: "44px"
  button-destructive:
    backgroundColor: "rgba(255, 109, 109, 0.14)"
    textColor: "{colors.coral-alert}"
    rounded: "{rounded.full}"
    padding: "10px 18px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.cool-gray}"
    rounded: "{rounded.full}"
    padding: "10px 16px"
    height: "44px"
  card-container:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input-field:
    backgroundColor: "{colors.canvas-obsidian}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    height: "44px"
  badge-mint:
    backgroundColor: "rgba(24, 255, 200, 0.14)"
    textColor: "{colors.mint-active}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-amber:
    backgroundColor: "rgba(251, 191, 36, 0.14)"
    textColor: "{colors.amber-warning}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-coral:
    backgroundColor: "rgba(255, 109, 109, 0.14)"
    textColor: "{colors.coral-alert}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-zinc:
    backgroundColor: "rgba(161, 161, 170, 0.14)"
    textColor: "{colors.cool-gray}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Design System: Centris

## Overview

**Creative North Star: "Dark Bento Cockpit"**

Centris combina la claridad de un tablero operativo modular (Bento Grid oscuro de bordes generosos en `24px`, cápsulas contextuales en la barra superior y tarjetas de KPIs con cifras protagonistas) con la simplicidad cotidiana que necesita un dueño de box, un coach o un atleta en Argentina.

El diseño abandona las mayúsculas forzadas y tipografías condensadas en favor de una única familia sans-serif limpia (**Inter**, pesos `Light 300`, `Regular 400`, `Medium 500` y `SemiBold 600`) en formato oración (*Sentence case*), reservando el acento **Volt Lime** (`#C1F429`) para la acción principal, el ítem activo del menú lateral izquierdo y los indicadores destacados en gráficos de ocupación y cobranza.

**Key Characteristics:**
- Base dark-first en negro obsidiana (`#09090B`) y tarjetas carbón (`#111214`) con elevaciones sutiles (`#18191C`) y bordes finos (`1px solid #232428`).
- Paleta directa basada en los mockups de referencia: **Volt Lime** (`#C1F429`), **Pure White** (`#FFFFFF`), **Mint Active** (`#18FFC8`) y **Coral Alert** (`#FF6D6D`).
- Única familia tipográfica **Inter** (`300`–`600`) en *Sentence case* con `.tabular-nums` obligatorio en montos, horarios, cupos y créditos.
- Geometría suave y táctil: tarjetas principales con `24px` (`rounded-3xl`), sub-ítems con `16px`, cápsulas/botones en `9999px` (`rounded-full`) y controles con altura mínima `44px`.
- Shell transversal con **sidebar vertical izquierdo (ícono + nombre de sección visible)** filtrado por rol y **barra superior contextual de cápsulas**.

## Colors

### Primary
- **Volt Lime** (`#C1F429`): CTA principal, ítem activo del sidebar izquierdo y barra/porción protagonista en métricas clave. Siempre acompañado de texto o ícono en negro puro (`#000000`).
- **Volt Lime Hover** (`#AEDF1B`): Estado hover y pressed sobre botones y pills Volt Lime.
- **Volt Lime Tint** (`#F4FDE0`): Referencia clara de la escala cuando se requiera contraste extremo sobre superficies oscuras.

### Neutral
- **Pure Black** (`#000000`): Texto e íconos sobre `#C1F429`, y marcos de máximo contraste.
- **Canvas Obsidian** (`#09090B`): Fondo raíz de la aplicación y pozos de inputs.
- **Surface Card** (`#111214`): Fondo principal de cards bento, sidebar izquierdo y contenedores de tablas.
- **Surface Elevated** (`#18191C`): Cápsulas de la barra superior, filas internas de listas, botones secundarios y estados hover.
- **Border Hairline** (`#232428`): Líneas divisorias y bordes `1px` sutiles alrededor de tarjetas, pills y botones circulares (`↗`).
- **Pure White** (`#FFFFFF`): Títulos, cifras protagonistas, nombres y texto principal.
- **Cool Gray** (`#A1A1AA`): Subtítulos de tarjetas, descripciones cortas, etiquetas secundarias y metadatos.

### Semantic Accents
- **Mint Active** (`#18FFC8` sobre `rgba(24, 255, 200, 0.14)`): Reservas confirmadas, asistencias presentes, membresías activas, cupos disponibles y métricas positivas.
- **Amber Warning** (`#FBBF24` sobre `rgba(251, 191, 36, 0.14)`): Cancelación tardía, últimos cupos disponibles y renovaciones próximas.
- **Coral Alert** (`#FF6D6D` sobre `rgba(255, 109, 109, 0.14)`): Saldo pendiente (*Moroso*), ausencias, clases canceladas, contadores de alertas urgentes y acciones destructivas.

### Named Rules
**The Black-on-Volt Rule.** Nunca colocar texto o íconos blancos (`#FFFFFF`) sobre Volt Lime (`#C1F429`); todo elemento sobre `#C1F429` usa Pure Black (`#000000`).
**The Single-Signal Accent Rule.** `#C1F429` señala foco de navegación activo, acción primaria o barra/dato protagonista — nunca se repite en múltiples badges de una tabla.

## Typography

**Primary & Display Font:** Inter (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`) — pesos `300` (Light), `400` (Regular), `500` (Medium) y `600` (SemiBold).

**Character:** Limpia, geométrica y legible en español sin forzar mayúsculas ni fuentes condensadas. Los títulos de pantalla y tarjetas usan *Sentence case* y peso `500` con tracking levemente ajustado (`-0.02em`), mientras que las cifras grandes (`Light`/`Medium` en `.tabular-nums`) destacan por escala.

### Hierarchy
- **Display** (`500`, `clamp(1.75rem, 1.45rem + 1.4vw, 2.375rem)`, `1.1` line-height, `-0.025em` tracking): Cifras KPI protagonistas (ingresos del mes, ocupación semanal, créditos).
- **Headline** (`500`, `clamp(1.375rem, 1.2rem + 0.8vw, 1.75rem)`, `1.2` line-height, `-0.02em` tracking): Encabezado `<h1>` de cada pantalla en *Sentence case*.
- **Title** (`500`, `1.0625rem` / `17px`, `1.3` line-height, `-0.01em` tracking): Títulos de cards bento (`<h2>` / `<h3>`) con subtítulo breve debajo en `Cool Gray`.
- **Body** (`400`–`500`, `14px`–`15px`, `1.5` line-height): Copy operativo, listas, celdas de tabla y botones (`15px` Medium/SemiBold).
- **Label** (`500`, `12px` / `0.75rem`, `1.35` line-height, `+0.02em` tracking): Badges semánticos en *Sentence case* y encabezados sutiles.

### Named Rules
**The Tabular Numerals Rule.** Aplicar `.tabular-nums` en todo monto (`$`), horario, cupo (`18/20`), porcentaje y contador de créditos.
**The 16px Input Floor Rule.** Mantener `<input>` y `<select>` en `16px` (`1rem`) mínimo en móvil para evitar zoom automático.

## Layout & Navigation Shell

El shell autenticado `(box)/layout.tsx` se estructura con:
1. **Sidebar vertical izquierdo (desktop `>= 1024px`, ancho `248px` / `15.5rem`)**: Fondo `#111214`, borde derecho `1px solid #232428`, logotipo de Centris arriba, lista de accesos filtrados por los roles activos del Box mostrando **ícono + nombre de sección visible** (`Panel`, `Horarios`, `Calendario de Clases`, `Mis Reservas`, `Planes`, `Atletas`, `Caja y Morosos`, `Afiliaciones`), con el ítem activo resaltado en cápsula `#C1F429` y texto/ícono negro (`#000000`), y `Configuración` anclado al pie. En móvil (`< 1024px`) colapsa a un drawer táctil accesible desde el topbar + accesos rápidos con objetivos `>= 44px`.
2. **Topbar contextual de cápsulas**: Barra superior limpia con pills (`#18191C`, `rounded-full`, borde `#232428`) para el selector de Box activo, estado/fecha operativa del día y menú de usuario + cierre de sesión.
3. **Área de contenido Bento**: Canvas `#09090B`, padding responsivo (`24px`), grillas asimétricas de tarjetas `24px` (`gap-4` / `16px`) que priorizan lo más accionable de cada rol.

## Elevation & Depth

Capas tonales planas con bordes finos (`1px solid #232428`) y sin sombras pesadas:
`#09090B` (canvas) -> `#111214` (sidebar y cards principales) -> `#18191C` (cápsulas, filas internas de listas y botones secundarios).
Para barras de capacidad total u objetivos pendientes se utiliza un patrón sutil de **rayado diagonal** oscuro detrás del relleno sólido `#C1F429`.

## Shapes

- **Cards Bento**: `24px` (`rounded-3xl`).
- **Filas y sub-contenedores internos**: `16px` (`rounded-2xl`).
- **Inputs / Selects**: `12px` (`rounded-xl`).
- **Botones primarios/secundarios, botones circulares (`↗`), badges y pills de navegación**: `9999px` (`rounded-full`).

## Components

### Cards Bento
- Fondo `#111214`, borde `1px solid #232428`, `border-radius: 24px`, padding `22px–24px`.
- Encabezado con título claro en *Sentence case* + subtítulo corto (`1–2` líneas) en `#A1A1AA`.
- Cifra protagonista abajo a la izquierda dentro de una cápsula `#18191C` (o junto a ella) y botón circular de navegación rápida (`↗`, `44x44px`, borde `#232428`) abajo a la derecha o arriba a la derecha.

### Buttons & Pills
- Altura mínima `44px`, forma `rounded-full`, tipografía `Inter` `500/600`.
- **Primary**: `#C1F429` con texto `#000000`; hover `#AEDF1B`.
- **Secondary**: `#18191C` con texto `#FFFFFF` y borde `#232428`.
- **Destructive**: `rgba(255, 109, 109, 0.14)` con texto `#FF6D6D` y borde `rgba(255, 109, 109, 0.28)`.

### Chips (Badges)
- Cápsulas `rounded-full` con ícono + etiqueta corta en español (*Sentence case*): variantes `mint` (`#18FFC8`), `amber` (`#FBBF24`), `coral` (`#FF6D6D`) y `zinc` (`#A1A1AA`).

## Do's and Don'ts

### Do:
- **Do** mantener `#C1F429` exclusivamente con texto e íconos `#000000`.
- **Do** usar **Inter** en *Sentence case* en toda la interfaz, sin `Oswald` ni títulos todo en mayúsculas.
- **Do** mostrar siempre ícono + nombre visible en cada enlace del sidebar izquierdo.
- **Do** aplicar `.tabular-nums` en todo número, hora, cupo, crédito y precio.
- **Do** respetar `>= 44px` de altura/tamaño táctil en enlaces del sidebar, botones circulares `↗`, tabs y controles.

### Don't:
- **Don't** usar texto blanco sobre `#C1F429` ni sobre `#18FFC8`.
- **Don't** ocultar las etiquetas de navegación detrás de un rail de íconos solos en desktop.
- **Don't** usar terminología técnica o anglicismos innecesarios cuando exista término en [GLOSSARY.md](../../GLOSSARY.md).
- **Don't** bajar el tamaño de fuente de inputs en móvil por debajo de `16px`.
