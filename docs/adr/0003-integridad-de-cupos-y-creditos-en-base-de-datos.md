# Integridad de Cupos y Créditos garantizada por la base de datos

Las Clases más populares se llenan en segundos, y un Atleta puede reservar desde varios dispositivos a la vez. Decidimos que las invariantes "una Clase nunca tiene más Reservas confirmadas que Cupos" y "una Membresía nunca consume más Créditos de los que tiene en un Período" se garantizan **dentro de una transacción de base de datos**, con bloqueos y constraints. Nunca se garantizan solo con validaciones previas en la aplicación o en el frontend, porque esas validaciones son vulnerables a condiciones de carrera entre la lectura y la escritura.

## Consequences

- Reservar, cancelar y cancelar una Clase son operaciones transaccionales que bloquean las filas de la Clase y de la Membresía involucradas (por ejemplo, `SELECT ... FOR UPDATE`). Siempre se toman **en el mismo orden** (primero la Membresía, después la Clase) para evitar deadlocks.
- La unicidad de la Reserva activa por (Atleta, Clase) se garantiza con un constraint único. La no superposición entre Reservas de un mismo Atleta se valida dentro de la misma transacción, con la Membresía bloqueada, porque eso serializa todas las reservas del Atleta.
- Las validaciones de la aplicación y del frontend sirven solo para dar buenos mensajes de error. Nunca reemplazan las de la base de datos.
- Esta decisión requiere un motor relacional con transacciones ACID y bloqueo a nivel de fila.
