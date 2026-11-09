# language: es
Característica: Gestión de Walk-ins en Mostrador por Recepción y Administración E2E

  Escenario: Usuario con rol exclusivo de Coach no tiene acceso a registrar Walk-ins mientras Recepción y Admin sí pueden
    Dado un usuario autenticado con rol exclusivo de "Coach" en Box Centris Norte
    Cuando consulta el Calendario de Clases
    Entonces no visualiza el botón de Anotar Walk-in en ninguna Clase
    Pero cuando inicia sesión un "Recepcionista" o un usuario con roles combinados "Coach y Recepcionista"
    Y selecciona una Clase no cancelada para anotar un Walk-in
    Entonces puede registrar exitosamente al Atleta espontáneo registrando al operador en creada_por_usuario_id

  Escenario: Clase con Cupos agotados rechaza el Walk-in y guía al Recepcionista para editar el Cupo antes de confirmar
    Dado una Clase con Cupos agotados en "20 / 20" en Box Centris Norte
    Cuando el "Recepcionista" intenta anotar un Walk-in para un Atleta con Membresía vigente
    Entonces la interfaz muestra el rechazo por Cupo Agotado y ofrece la opción de editar el Cupo
    Y cuando el Recepcionista aumenta los Cupos de la Clase a "21" y vuelve a confirmar el Walk-in
    Entonces la Reserva se registra exitosamente y el Cupo de la Clase pasa a "21 / 21"

  Escenario: Atleta sin Créditos disponibles rechaza el Walk-in y ofrece regularizar su Membresía o Créditos Extra
    Dado un Atleta que no dispone de Créditos libres en su Membresía para la fecha de la Clase
    Cuando el "Recepcionista" intenta inscribir al Atleta espontáneo como Walk-in
    Entonces la interfaz rechaza la Reserva por falta de Créditos y ofrece el acceso para regularizar su cuenta
    Y cuando el Recepcionista le acredita 1 Crédito Extra y vuelve a confirmar la inscripción
    Entonces la Reserva del Walk-in se confirma exitosamente
