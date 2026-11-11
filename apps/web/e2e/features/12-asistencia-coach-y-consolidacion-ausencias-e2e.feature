# language: es
Característica: Panel del Coach, Marcado de Asistencia, Ventana de 24 hs y Consolidación de Ausencias E2E

  Escenario: Visibilidad acotada del Coach con rol exclusivo y permisos de asistencia según asignación
    Dado un usuario autenticado con rol exclusivo de "Coach" en Box Centris Norte para asistencias
    Y dos Clases materializadas: una asignada a dicho Coach y otra dictada por un Coach diferente
    Cuando el Coach consulta la barra de navegación y el Calendario de Clases
    Entonces no visualiza accesos a Caja, Morosos ni Configuración del Box
    Y visualiza en su agenda únicamente la Clase que tiene asignada con su nómina de Atletas inscriptos
    Pero cuando inicia sesión un "Recepcionista" o un "Administrador"
    Entonces puede gestionar la Asistencia en las Clases de cualquier Coach del Box

  Escenario: Marcado y rectificación de Asistencia dentro de la Ventana de 24 horas
    Dado una Clase finalizada hace menos de 24 horas con una Reserva confirmada
    Cuando el Coach asignado abre el panel de control de Asistencia
    Y marca el presente del Atleta
    Entonces la Reserva se visualiza como "Presente" con la hora y el operador registrados
    Cuando rectifica la lista desmarcando la Asistencia dentro del plazo permitido
    Entonces la Reserva vuelve al estado "Sin marcar"

  Escenario: Cierre estricto tras 24 horas de clase.fin y consolidación automática de Ausencia
    Dado una Clase finalizada hace más de 24 horas con una Reserva confirmada sin presente
    Cuando el Coach o Recepcionista abre el panel de Asistencia de dicha Clase
    Entonces la interfaz muestra la advertencia de Ventana de Corrección Vencida y bloquea la modificación
    Cuando el Atleta consulta su historial de reservas
    Entonces visualiza la Reserva consolidada con el indicador "Ausencia" y el Crédito perdido
