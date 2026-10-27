# language: es
Característica: Directorio y Alta de Atletas por Recepción y Administración E2E

  Escenario: Alta de Atleta nuevo con vinculación transparente y contraseña pendiente
    Dado un Recepcionista autenticado operando en "Box Centris Norte" en el Directorio de Atletas
    Cuando da de alta un nuevo Atleta con nombre "Atleta Nuevo BDD" y email "atleta.nuevo.bdd@centris.test"
    Entonces el Atleta figura en el directorio con rol "atleta" y acceso con primer ingreso pendiente
    Y la base de datos almacena el usuario con contraseña nula

  Escenario: Vinculación transparente de Usuario global existente sin alterar contraseña
    Dado un Administrador autenticado operando en "Box Centris Norte" en el Directorio de Atletas
    Cuando da de alta un Atleta con email existente "atleta.sur@test.centris.dev"
    Entonces el Atleta figura en "Box Centris Norte" con contraseña definida
    Y la base de datos conserva el usuario sin duplicarlo

  Escenario: Usuario con rol Coach en el mismo Box que suma el rol Atleta
    Dado un Recepcionista autenticado operando en "Box Centris Norte" en el Directorio de Atletas
    Cuando da de alta como Atleta a un usuario que ya era Coach en el Box
    Entonces la afiliación combina los roles coach y atleta sin duplicar el registro

  Escenario: Búsqueda, edición operativa y baja lógica de Atleta
    Dado un Administrador autenticado en el Directorio de Atletas de "Box Centris Norte"
    Cuando busca atletas por término "BDD"
    Entonces el listado muestra exclusivamente los atletas que coinciden con la búsqueda
    Cuando edita el nombre del Atleta a "Atleta BDD Modificado"
    Entonces el cambio se refleja en el directorio
    Cuando desactiva la afiliación del Atleta
    Entonces el Atleta figura como inactivo con fecha de baja lógica

  Escenario: Restricción de acceso a Directorio para Coach y Atleta
    Dado un Atleta autenticado operando en "Box Centris Norte"
    Cuando intenta acceder a la ruta "/atletas"
    Entonces el sistema deniega el acceso y lo redirige al inicio
