# 13 — Rediseño UX/UI e Integración de Datos Reales en `/inicio` (Panel Bento)

**Status:** ready-for-agent
**Branch:** `feat/ui-13-inicio-dashboard`
**Blocked by:** `01`, `06`, `07`, `08`, `09`, `10`, `11`, `12`

## Contexto

Ticket final del rediseño UX/UI. Reconstruye `/inicio` siguiendo el tablero **Dark Bento Cockpit** aprobado en `.scratch/propuesta-shell-inicio.html`, conectando cada tarjeta KPI, lista operativa y botón circular rápido (`↗`) con datos reales del Box y las rutas ya migradas, adaptando los módulos visibles según los roles componibles de la `Afiliación` activa ([ADR 0007](../../../docs/adr/0007-cuatro-roles-atomicos-componibles.md)):

- **`Administrador` / `Recepcionista`**: ingresos del mes, morosos pendientes con enlace a `/caja`, ocupación semanal con gráfico `recharts` + rayado diagonal y acceso directo a `/atletas`, `/planes`, `/afiliaciones` y `/horarios`.
- **`Coach`**: agenda operativa de *Clases de hoy*, pendientes de asistencia dentro de la ventana de 24 hs y enlace directo a `/clases` (sin KPIs financieros si no tiene rol de caja).
- **`Atleta`**: próximas reservas confirmadas, créditos disponibles de su membresía vigente, recordatorio no bloqueante si posee saldo pendiente ([ADR 0006](../../../docs/adr/0006-acceso-desacoplado-del-pago.md)) y enlace directo `↗` a `/reservas`.

## Fuentes de Verdad

- Mockup aprobado: [`.scratch/propuesta-shell-inicio.html`](../../propuesta-shell-inicio.html)
- Referencia histórica de mapeo funcional: `~/repos/ifts/pp4/ux-ui-dashboard-notas.md` *(archivo externo al repo; prevalece la paleta, `Inter` y sidebar con etiquetas de [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md))*
- Design System v2: [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md)

## Archivos Objetivo

- `apps/web/src/app/(box)/inicio/page.tsx`
- Componentes de dashboard Bento en `apps/web/src/app/(box)/inicio/` *(a modularizar según complejidad)*
- Consultas/agregaciones en `apps/api/` o `apps/web/src/lib/` si faltara algún endpoint agregado con RLS (`SET LOCAL app.box_id`)

## Suites E2E Impactadas

- Regresión transversal completa (`01` a `12`) + nuevos tests (`Vitest` + BDD si corresponde) validando visibilidad por rol en `/inicio`.

## Acceptance Criteria (TDD / BDD)

- [ ] **Agregaciones Reales con Aislamiento RLS (Red $\rightarrow$ Green)**: Cualquier nueva consulta o endpoint de resumen para `/inicio` debe ejecutar dentro de transacción Drizzle con `SET LOCAL app.box_id`, filtrar por zona horaria del Box ([ADR 0005](../../../docs/adr/0005-calculos-de-calendario-en-zona-horaria-del-box.md)) y cubrirse con tests (`Vitest`) que validen aislamiento entre Boxes y autorización por rol.
- [ ] **Tablero Bento Adaptado por Rol (ADR 0007)**: Verificar en tests que un usuario exclusivamente `Coach` o `Atleta` nunca reciba ni visualice cifras financieras de recaudación del Box en `/inicio`, mientras `Administrador` / `Recepcionista` ven KPIs reales de ingresos, morosos y ocupación semanal.
- [ ] **Gráficos `recharts` y Botones `↗` Bento**: Implementar gráfico semanal con estética `#C1F429` + pista con rayado diagonal oscuro, cifras KPI `tabular-nums` en *Display*, cards `24px` (`#111214`, borde `#232428`) y botones circulares `↗` (`44x44px`) apuntando a `/reservas`, `/clases`, `/horarios`, `/planes`, `/atletas`, `/caja` y `/afiliaciones`.
- [ ] **Estabilidad Notebook y Mobile**: Cero desbordes horizontales en `375px`, `1280px` y `1440px`, sin datos *hardcodeados* ni *placeholders* ficticios.
- [ ] **Verificación CI / DoD**: Pasar `pnpm lint`, `pnpm typecheck`, `pnpm test` (`Vitest` + las 12 suites `playwright-bdd`) y `/code-review`.

## Comments

- *Sin comentarios aún.*
