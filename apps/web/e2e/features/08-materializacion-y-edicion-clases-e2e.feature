# language: es
Característica: Materialización de Clases en Zona Horaria del Box y Edición Manual de Clases E2E

  Escenario: Materialización exacta de Clases según zona horaria IANA del Box
    Dado un Administrador autenticado en la pantalla de Clases con un Horario recurrente a las "07:00"
    Cuando ejecuta la materialización de Clases
    Entonces se visualizan las Clases generadas con el horario local "07:00 - 08:00"
    Y la fecha y hora UTC almacenada en base de datos corresponde a las "10:00:00+00"

  Escenario: Administrador cambia Coach por un suplente sin alterar el Horario recurrente
    Dado un Administrador autenticado en la pantalla de Clases con una Clase programada
    Cuando edita la Clase puntual asignando al coach suplente
    Entonces la tarjeta de la Clase refleja al nuevo coach suplente
    Y el Horario recurrente en la base de datos conserva su coach titular original

  Escenario: Recepcionista incrementa los Cupos de una Clase puntual
    Dado un Recepcionista autenticado en la pantalla de Clases
    Cuando edita la Clase puntual incrementando los Cupos a 20
    Entonces la tarjeta de la Clase muestra 20 cupos disponibles

  Escenario: Validación de invariante impide reducir Cupos por debajo de reservas confirmadas
    Dado un Administrador autenticado en la pantalla de Clases con una Clase que tiene 2 reservas confirmadas
    Cuando intenta reducir los Cupos de la Clase a 1
    Entonces la interfaz muestra un error indicando que los cupos no pueden ser menores a las reservas confirmadas
