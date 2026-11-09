# language: es
Característica: Cancelación de Reservas, Cancelación Tardía, Liberación sin Waitlist y Cancelación de Clase por el Box E2E

  Escenario: Cancelación en término libera el Cupo y devuelve el Crédito al Período del Atleta
    Dado un Atleta con Membresía semanal de 1 crédito que reservó una Clase fuera de la Ventana de Cancelación
    Cuando el Atleta cancela su Reserva en término desde la vista de Reservas
    Entonces el contador de Créditos del Período vuelve a mostrar "1 / 1" y el Cupo de la Clase pasa a "0 / 12"
    Y la Reserva figura en el historial con estado "Cancelada"

  Escenario: Cancelación Tardía dentro de la Ventana de Cancelación advierte al Atleta, libera el Cupo y mantiene el Crédito consumido
    Dado un Atleta con Membresía semanal de 1 crédito que tiene una Reserva confirmada dentro de la Ventana de Cancelación
    Cuando el Atleta presiona Cancelar Reserva y visualiza la advertencia de Cancelación Tardía
    Y confirma la Cancelación Tardía desde la interfaz
    Entonces el Cupo de la Clase se libera pasando a "0 / 12" pero el contador de Créditos del Período permanece en "0 / 1"
    Y la Reserva figura en el historial con estado "Cancelación Tardía"

  Escenario: Cancelación de una Clase puntual por el Administrador reintegra el Crédito a los Atletas inscriptos
    Dado una Clase que comienza en 30 minutos con una Reserva confirmada que consumió el único Crédito semanal de un Atleta
    Cuando el Administrador cancela la Clase desde el Calendario de Clases indicando el motivo "Corte de suministro eléctrico"
    Entonces la tarjeta de la Clase muestra el estado "Clase Cancelada" y el motivo "Corte de suministro eléctrico"
    Y cuando el Atleta consulta su vista de Reservas ve la Reserva como "Cancelada por el Box" y su Crédito restituido en "1 / 1"
