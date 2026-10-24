# Triage Labels y Ciclo de Estados de Tickets

Las skills de ingeniería utilizan cinco roles canónicos de triage, complementados en este repositorio por los estados de ejecución local en [`.scratch/mvp/issues/`](../../.scratch/mvp/issues/).

## 1. Roles Canónicos (`mattpocock/skills`)

| Label en `mattpocock/skills` | Valor en `Status:` del ticket | Significado |
| :--- | :--- | :--- |
| `needs-triage` | `needs-triage` | Pendiente de evaluación y refinamiento |
| `needs-info` | `needs-info` | A la espera de definiciones adicionales del usuario |
| `ready-for-agent` | `ready-for-agent` | Completamente especificado y listo para implementarse con `/implement` o `/tdd` |
| `ready-for-human` | `ready-for-human` | Requiere intervención manual humana (ej. credenciales externas) |
| `wontfix` | `wontfix` | Descartado / Fuera de alcance |

## 2. Estados de Ejecución durante el Desarrollo

Cuando un ticket en `.scratch/mvp/issues/<NN>-<slug>.md` entra en construcción:

| Valor en `Status:` | Significado |
| :--- | :--- |
| `ready-for-agent` | Estado inicial de los 12 tickets del MVP; listo para ser tomado cuando sus `Blocked by:` están en `done`. |
| `in-progress` | El ticket está siendo implementado activamente en su rama `feat/<NN>-<slug>`. |
| `done` | Todos los criterios `- [x]` del ticket fueron completados, pasaron `/code-review` y los tests están en verde. |
