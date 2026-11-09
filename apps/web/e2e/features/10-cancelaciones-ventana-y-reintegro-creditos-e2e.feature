# language: es
Característica: Cancelación de Reservas, Cancelación Tardía, Liberación Inmediata de Cupo y Cancelación de Clase por el Box E2E

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

  Escenario: Liberación inmediata de Cupo de 15/15 a 14/15 en la grilla permite al primer Atleta reservar el lugar
    Dado una Clase con Cupos agotados en "15 / 15" donde un Atleta cancela su Reserva
    Cuando un segundo Atleta con Membresía vigente ingresa a la grilla de Reservas y ve "14 / 15"
    Y presiona Reservar en esa Clase desde la grilla
    Entonces obtiene el Cupo inmediatamente pasando la Clase a "15 / 15"

  Escenario: Cancelación de una Clase puntual por el Administrador reintegra el Crédito a los Atletas inscriptos
    Dado una Clase que comienza en 30 minutos con una Reserva confirmada que consumió el único Crédito semanal de un Atleta
    Cuando el Administrador cancela la Clase desde el Calendario de Clases indicando el motivo "Corte de suministro eléctrico"
    Entonces la tarjeta de la Clase muestra el estado "Clase Cancelada" y el motivo "Corte de suministro eléctrico"
    Y cuando el Atleta consulta su vista de Reservas ve la Reserva como "Cancelada por el Box" y su Crédito restituido en "1 / 1"

  Escenario: Efecto cascada de Baja Anticipada sobre Reservas futuras libera los Cupos automáticamente
    Dado un Atleta con Membresía vigente y una Reserva confirmada para una Clase de la próxima semana
    Cuando el Administrador ejecuta la Baja Anticipada de la Membresía del Atleta con fecha de hoy desde el Directorio de Atletas
    Entonces la Reserva futura del Atleta pasa al historial como "Cancelada" y el Cupo de esa Clase futura queda en "0 / 12"
