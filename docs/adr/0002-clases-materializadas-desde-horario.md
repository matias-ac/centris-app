# Las Clases se materializan a partir del Horario

Las reservas, la asistencia y los cambios puntuales (coach suplente, feriado, cambio de cupo) ocurren sobre una fecha concreta y no sobre la regla recurrente. Decidimos guardar cada **Clase** como un registro propio, generado a partir de su **Horario** con algunas semanas de anticipación, en vez de calcular las ocurrencias al vuelo desde la regla. Una vez generada, la Clase tiene vida propia: se puede editar o cancelar sin tocar el Horario, y un cambio en el Horario solo regenera las Clases futuras que todavía no tienen reservas.

## Considered Options

- **Ocurrencias virtuales calculadas desde el Horario** (estilo RRULE de calendario), guardando solo las excepciones: no requiere un proceso de generación, pero las reservas y la asistencia quedan colgadas de una ocurrencia que no existe como registro. Además, cada cambio en el Horario obliga a reconciliar excepciones y reservas.

## Consequences

- Hace falta un proceso periódico que genere las Clases hasta el horizonte de generación, que debe ser al menos tan largo como la Anticipación de Reserva máxima configurada.
- Las Clases que ya tienen reservas no se modifican automáticamente cuando cambia su Horario. Si hace falta, un Administrador las ajusta o cancela a mano.
