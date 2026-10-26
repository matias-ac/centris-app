# language: es
Característica: Catálogo de Planes Comerciales E2E

  Escenario: Creación de planes con validación de modalidades de créditos por un Administrador
    Dado un Administrador autenticado operando en "Box Centris Norte" en la pantalla de Catálogo de Planes
    Cuando crea un Plan con modalidad "SEMANAL", 3 créditos semanales, precio de 35000 y vigencia de 30 días
    Entonces el Plan figura en el catálogo con modalidad "SEMANAL", 3 créditos y precio formateado en "ARS"
    Cuando crea un Plan con modalidad "ILIMITADO", precio de 50000 y vigencia de 30 días
    Entonces el Plan figura en el catálogo con modalidad "ILIMITADO" y créditos guardados como nulos

  Escenario: Modificación de estado activo y baja lógica de un Plan por un Administrador
    Dado un Administrador autenticado con un Plan registrado en "Box Centris Norte"
    Cuando desactiva el Plan desde el catálogo
    Entonces el estado del Plan cambia a inactivo
    Cuando el Administrador da de baja lógica el Plan
    Entonces el Plan desaparece del listado visible del catálogo

  Escenario: Consulta de catálogo activo por Recepcionista y restricción de mutaciones
    Dado un Recepcionista autenticado operando en "Box Centris Norte"
    Cuando accede al Catálogo de Planes
    Entonces visualiza los Planes activos disponibles para venta sin controles de creación ni edición
    Cuando intenta enviar una petición de creación de Plan
    Entonces el servidor rechaza la acción con código 403 de acceso denegado

  Escenario: Aislamiento estricto de Planes entre Boxes bajo RLS
    Dado Planes creados y activos en "Box Centris Norte"
    Cuando un Administrador opera en "Box Centris Sur"
    Entonces el catálogo de "Box Centris Sur" no expone ningún Plan perteneciente a "Box Centris Norte"
