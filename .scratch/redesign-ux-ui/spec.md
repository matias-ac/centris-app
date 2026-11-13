# Spec — Rediseño UX/UI v2 ("Dark Bento Cockpit") en `apps/web`

## 1. Objetivo

Migrar de forma incremental las 12 pantallas de `apps/web` y el shell autenticado desde la estética v1 (`#000000` / `#E2F800` / `Oswald` / top-nav horizontal) hacia el sistema de diseño **Centris v2 — Dark Bento Cockpit**, manteniendo:

- **Unificación de fuentes de verdad**: [`docs/DESIGN_SYSTEM.md`](../../docs/DESIGN_SYSTEM.md) y [`apps/web/DESIGN.md`](../../apps/web/DESIGN.md) como referencia común para `/implement`, `/tdd`, `/code-review` e `impeccable`.
- **1 pantalla por branch/PR**: entregas pequeñas, revisables y desplegables sin acumular conflictos ni romper CI en `main`.
- **CI 100% verde en cada PR**: todos los checks de [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) (`pnpm build`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm lint`, `pnpm typecheck`, `pnpm test` con `Vitest` y las 12 suites `playwright-bdd`) deben pasar tras cada rama.
- **TDD / BDD Red $\rightarrow$ Green**: antes de reemplazar comportamientos heredados que hoy atan los tests E2E (diálogos `confirm()` nativos y textos técnicos `"403 Forbidden"`), se actualizan primero los tests/steps en fase **Red** y luego se implementa el nuevo comportamiento hasta lograr **Green**.

---

## 2. Arquitectura Compartida y Módulos Profundos (`/codebase-design`)

Todo componente compartido que se cree en el Ticket `01` debe concentrar complejidad repetida (accesibilidad ARIA, foco, estados táctiles `>= 44px`, `tabular-nums`, prevención de *layout shift*) bajo una interfaz mínima en `apps/web/src/components/ui/`:

1. **Tokens y tipografía base** (`apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`):
   - Única familia tipográfica **`Inter`** (`300`, `400`, `500`, `600`) en *Sentence case*. Eliminación completa de `Oswald`.
   - Superficies `#09090B` / `#111214` / `#18191C`, bordes `#232428`, acento `#C1F429` (`#000000` foreground) y semánticos `#18FFC8`, `#FBBF24`, `#FF6D6D`.
2. **Primitivas estilísticas** (`button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `label.tsx`, `select.tsx`):
   - Radios `24px` (`Card`), `16px` (pozos internos), `12px` (`Input`/`Select`), `9999px` (`Button`/`Badge`), altura mínima `44px` en controles interactivos y fuente mínima `16px` en campos editables.
   - Variantes semánticas de `Badge`: `mint`, `amber`, `coral`, `zinc` + variante `volt` reservada exclusivamente a señales protagonistas.
3. **Módulos de interacción reusable (sin diálogos nativos)**:
   - `InlineConfirm`: reemplaza `window.confirm()` con confirmación en línea accesible (`Confirmar` / `Cancelar`, `min-h-11`), estado de carga deshabilitado y soporte `Escape`.
   - `SideDrawer`: panel lateral responsive (`>= 1024px` drawer derecho; móvil sheet adaptable) con *backdrop*, cierre por `Escape` y restauración de foco para formularios complejos (inscriptos de clase, ficha de membresías, alta rápida).
   - `FilterChips`: barra táctil de cápsulas filtrantes con *wrap* seguro (`gap-2`, `min-h-11`, `aria-pressed`).
4. **Shell `(box)/layout.tsx` + `selector-box-header.tsx`**:
   - Sidebar vertical izquierdo (`248px` en `>= 1024px`, drawer móvil en `< 1024px`) mostrando **ícono + nombre visible** por cada ruta habilitada según roles de la `Afiliación` ([ADR 0007](../../docs/adr/0007-cuatro-roles-atomicos-componibles.md)).
   - Topbar de cápsulas con selector rápido de Box activo, fecha/zona horaria operativa y menú de usuario/logout.
   - **Regla de compatibilidad E2E**: conservar todos los `data-testid` de navegación (`nav-link-*`, `box-activo-nombre`, `roles-activos-badges`) para que el Ticket `01` sea 100% compatible con todas las pantallas aún no migradas.

---

## 3. Reglas de Seguridad para el CI y Transición de Tests E2E

| Cambio de UX v2 | Riesgo sobre CI existente | Acción obligatoria en la rama de la pantalla afectada |
| :--- | :--- | :--- |
| Eliminación de `confirm()` nativo en `/planes`, `/atletas`, `/horarios` | `page.on("dialog", ...)` en `.steps.ts` queda esperando un diálogo que nunca abre | Actualizar primero el `.steps.ts` correspondiente para interactuar con el botón/confirmación inline (`InlineConfirm`) en ciclo **Red $\rightarrow$ Green** dentro del mismo PR. |
| Eliminación del texto literal `"403 Forbidden"` en banners de UI | Aserciones `toContainText("403 Forbidden")` / `getByText("403 Forbidden")` fallan | Actualizar la aserción en `04-directorio-y-alta-atletas-e2e.steps.ts` y `06-pagos-inmutables-anulaciones-y-morosos-e2e.steps.ts` por el mensaje de negocio accesible en español sin jerga HTTP. |
| Reemplazo de `uppercase` / enums crudos (`SEMANAL`, `ILIMITADO`, etc.) | Textos visibles cambian de código técnico a etiqueta humana | Verificar en `.steps.ts` que cualquier selector busque `role`/`data-testid`/`label` en español en lugar de claves de enum crudas. |
| Cambios de layout en sidebar (`248px` + drawer móvil) | Tests móviles o desktop buscan links del sidebar | Conservar `data-testid="nav-link-*"` visibles (abriendo drawer móvil si corresponde en viewport `< 1024px`) y probar ambos viewports. |

---

## 4. Secuencia Segura de Ramas y Dependencias

```text
Branch 0 (actual): docs/actualizar-documentacion-ux-ui-version-2
   └── 01-shell-sidebar-y-primitivas  [PR #1 - Prerrequisito global]
         ├── 02-login
         ├── 03-activar-cuenta
         ├── 04-seleccionar-box
         ├── 05-configuracion
         ├── 06-afiliaciones
         ├── 07-planes
         ├── 08-atletas  ──────────────────┐
         │                                 ▼
         ├── 09-caja (deep-link a /atletas?afiliacionId=...)
         ├── 10-horarios
         ├── 11-clases
         └── 12-reservas
               └── 13-inicio-dashboard  [PR final - requiere 01 + 06..12]
```

## 5. Índice de Tickets (`.scratch/redesign-ux-ui/issues/`)

| # | Archivo | Rama sugerida | Ruta / Alcance | Mockup HTML | Estado |
| :-: | :--- | :--- | :--- | :--- | :--- |
| 01 | [01-shell-sidebar-y-primitivas.md](./issues/01-shell-sidebar-y-primitivas.md) | `feat/ui-01-shell-sidebar-y-primitivas` | Tokens, `Inter`, `components/ui/*`, `(box)/layout.tsx` | [propuesta-shell-inicio.html](../propuesta-shell-inicio.html) | `ready-for-agent` |
| 02 | [02-login.md](./issues/02-login.md) | `feat/ui-02-login` | `/login` | [propuesta-login.html](../propuesta-login.html) | `ready-for-agent` |
| 03 | [03-activar-cuenta.md](./issues/03-activar-cuenta.md) | `feat/ui-03-activar-cuenta` | `/activar-cuenta` | [propuesta-activar-cuenta.html](../propuesta-activar-cuenta.html) | `ready-for-agent` |
| 04 | [04-seleccionar-box.md](./issues/04-seleccionar-box.md) | `feat/ui-04-seleccionar-box` | `/seleccionar-box` | [propuesta-seleccionar-box.html](../propuesta-seleccionar-box.html) | `ready-for-agent` |
| 05 | [05-configuracion.md](./issues/05-configuracion.md) | `feat/ui-05-configuracion` | `/configuracion` | [propuesta-configuracion.html](../propuesta-configuracion.html) | `ready-for-agent` |
| 06 | [06-afiliaciones.md](./issues/06-afiliaciones.md) | `feat/ui-06-afiliaciones` | `/afiliaciones` | [propuesta-afiliaciones.html](../propuesta-afiliaciones.html) | `ready-for-agent` |
| 07 | [07-planes.md](./issues/07-planes.md) | `feat/ui-07-planes` | `/planes` | [propuesta-planes.html](../propuesta-planes.html) | `ready-for-agent` |
| 08 | [08-atletas.md](./issues/08-atletas.md) | `feat/ui-08-atletas` | `/atletas` | [propuesta-atletas.html](../propuesta-atletas.html) | `ready-for-agent` |
| 09 | [09-caja.md](./issues/09-caja.md) | `feat/ui-09-caja` | `/caja` | [propuesta-caja.html](../propuesta-caja.html) | `ready-for-agent` |
| 10 | [10-horarios.md](./issues/10-horarios.md) | `feat/ui-10-horarios` | `/horarios` | [propuesta-horarios.html](../propuesta-horarios.html) | `ready-for-agent` |
| 11 | [11-clases.md](./issues/11-clases.md) | `feat/ui-11-clases` | `/clases` | [propuesta-clases.html](../propuesta-clases.html) | `ready-for-agent` |
| 12 | [12-reservas.md](./issues/12-reservas.md) | `feat/ui-12-reservas` | `/reservas` | [propuesta-reservas.html](../propuesta-reservas.html) | `ready-for-agent` |
| 13 | [13-inicio-dashboard.md](./issues/13-inicio-dashboard.md) | `feat/ui-13-inicio-dashboard` | `/inicio` (Panel KPIs + `recharts`) | [propuesta-shell-inicio.html](../propuesta-shell-inicio.html) | `ready-for-agent` |

---

## 6. Flujo de Ejecución Estándar por Ticket

Para cada ticket (`01` al `13`):
1. Crear rama desde `main` actualizado (`git checkout -b feat/ui-<NN>-<slug>`).
2. Cambiar el estado del ticket a `in-progress` en su archivo `.md`.
3. Leer la crítica asociada en `apps/web/.impeccable/critique/`, el mockup aprobado `.scratch/propuesta-*.html`, [`docs/DESIGN_SYSTEM.md`](../../docs/DESIGN_SYSTEM.md) y [`GLOSSARY.md`](../../GLOSSARY.md).
4. Ejecutar **Red $\rightarrow$ Green** (`/tdd`): primero specs/tests unitarios (`Vitest`) y ajustes de E2E (`playwright-bdd`), luego implementación en commits atómicos siguiendo [`docs/CONTRIBUTING.md`](../../docs/CONTRIBUTING.md).
5. Verificar en escritorio (`1440px`, notebook `1280px`) y móvil (`375px` / `390px`), correr `pnpm lint`, `pnpm typecheck` y `pnpm test` completos, y ejecutar `/code-review`.
6. Marcar el ticket como `done`, abrir PR y mergear a `main` antes de iniciar ramas dependientes.
