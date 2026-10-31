# language: es
Característica: Tipos de Clase y Grilla de Horarios Recurrentes E2E

  Escenario: CRUD de Tipos de Clase por un Administrador
    Dado un Administrador autenticado operando en "Box Centris Norte" en la pantalla de Horarios
    Cuando crea un Tipo de Clase con nombre "WOD E2E" y descripción "Entrenamiento del día"
    Entonces el Tipo de Clase "WOD E2E" figura en el listado de tipos de clase
    Cuando da de baja lógica el Tipo de Clase "WOD E2E"
    Entonces el Tipo de Clase "WOD E2E" deja de mostrarse en el catálogo activo

  Escenario: Configuración y visualización de la plantilla semanal de Horarios
    Dado un Administrador autenticado operando en "Box Centris Norte" en la pantalla de Horarios
    Cuando programa un Horario recurrente con tipo "WOD", día 1 a las "07:00" con duración de 60 minutos y 16 cupos
    Entonces el Horario se visualiza en la grilla semanal en la columna del día 1 a las "07:00"
    Cuando da de baja lógica el bloque horario de las "07:00"
    Entonces el bloque horario deja de mostrarse en la grilla semanal

  Escenario: Consulta de grilla por Coach o Atleta y restricción de mutaciones
    Dado un Atleta autenticado operando en "Box Centris Norte"
    Cuando accede a la pantalla de Horarios
    Entonces visualiza la grilla semanal sin controles de creación de horarios ni tipos de clase
