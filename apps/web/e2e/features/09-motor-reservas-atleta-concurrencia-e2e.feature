# language: es
Característica: Motor Transaccional de Reservas del Atleta y Control de Concurrencia E2E

  Escenario: Atleta moroso con Saldo pendiente reserva una Clase desde su interfaz móvil sin bloqueo
    Dado un Atleta moroso con Membresía vigente impaga autenticado en la vista móvil de Reservas
    Cuando el Atleta presiona Reservar en la Clase disponible desde su interfaz móvil
    Entonces se muestra la confirmación de Reserva y el contador de Cupos de la Clase pasa a "1 / 12"
    Y la Clase figura dentro de la sección Mis Reservas Confirmadas del Atleta

  Escenario: Consumo de bolsa creditos_extra cuando el Atleta agotó los Créditos de su Período semanal
    Dado un Atleta con Membresía semanal de 1 crédito ya consumido en la semana pero con 1 crédito extra en bolsa
    Cuando el Atleta reserva una segunda Clase dentro de la misma semana desde la vista de Reservas
    Entonces la segunda Reserva queda confirmada y el indicador de créditos extra restantes muestra 0

  Escenario: Rechazo en la interfaz móvil al intentar reservar una Clase con superposición horaria
    Dado un Atleta autenticado en la vista de Reservas que ya tiene una Reserva confirmada a las "10:00" y otra Clase a las "10:30"
    Cuando el Atleta intenta reservar la Clase superpuesta de las "10:30"
    Entonces la interfaz de Reservas muestra una alerta de error indicando superposición horaria
