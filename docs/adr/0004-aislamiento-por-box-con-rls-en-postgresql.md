# Aislamiento entre Boxes con esquema compartido y Row Level Security en PostgreSQL

El peor error posible de la plataforma es que un Box vea datos de otro. Decidimos usar un **esquema compartido** en PostgreSQL, donde toda tabla que pertenece a un Box lleva `box_id` y está protegida con **Row Level Security forzado**. El Box activo se fija por transacción con `SET LOCAL app.box_id`, y las políticas rechazan cualquier fila de otro Box, aunque la consulta se olvide el filtro. El stack es **NestJS** (backend), **Next.js** (frontend), **PostgreSQL** y **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`), elegido por ser SQL-first y permitir ejecutar `SET LOCAL` de forma nativa y segura al inicio de cada transacción sobre la misma conexión física.

## Considered Options

- **Esquema compartido con `box_id`, sin RLS**: el aislamiento depende de que cada consulta incluya el filtro, y un solo olvido expone datos de otro Box.
- **Un esquema o una base por Box**: el aislamiento es fuerte, pero las migraciones se multiplican por cada Box, dar de alta un Box requiere crear infraestructura y choca con la identidad global (ADR-0001). Como `box_id` está en todas las tablas, queda abierta la puerta para mover en el futuro un Box muy grande a una base dedicada.

## Consequences

- La aplicación se conecta con un rol que **no** es dueño de las tablas y no tiene `BYPASSRLS`. Las tablas usan `FORCE ROW LEVEL SECURITY`.
- Toda operación sobre datos de un Box corre dentro de una transacción que primero ejecuta `SET LOCAL app.box_id`. Fuera de una transacción no hay contexto, y las políticas no devuelven filas. Al ser `SET LOCAL`, el contexto no queda en la conexión cuando vuelve al pool (sirve también con PgBouncer en modo transacción).
- Las tablas globales (`Usuario` y `Box`) quedan fuera de RLS. En `Afiliación`, la política RLS de lectura (`SELECT`) permite consultar filas cuando coincide `app.box_id` (operación dentro de un Box) o cuando coincide `usuario_id = current_setting('app.usuario_id', true)::uuid` (inicio de sesión y selector de Box antes de tener Box activo), mientras que toda escritura (`INSERT`, `UPDATE`, `DELETE`) exige estrictamente `app.box_id`.
- Las claves foráneas entre tablas de un Box incluyen `box_id` (por ejemplo, `(box_id, clase_id)`), para que sea imposible relacionar filas de Boxes distintos.
- Los procesos en background iteran Box por Box, fijando el contexto en cada transacción. No existe un rol de aplicación que saltee RLS.
- El MVP no tiene panel de super-administrador de la plataforma.
