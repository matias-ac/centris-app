# language: es
Característica: Cimientos del Monorepo, PostgreSQL en Docker e Infraestructura RLS

  Escenario: Verificación E2E de salud, rol sin BYPASSRLS y aislamiento RLS por Box
    Dado que existen los Boxes de semilla "Box Centris Norte" y "Box Centris Sur" con sus respectivas Afiliaciones
    Cuando se consulta el estado de salud de la API sin contexto de Box activo
    Entonces la API responde con rol de conexión "centris_app_user", RLS activo, sin privilegio BYPASSRLS y 0 Afiliaciones visibles
    Cuando se consulta el estado de salud fijando el contexto del "Box Centris Norte"
    Entonces la API devuelve únicamente las 7 Afiliaciones pertenecientes al "Box Centris Norte"
    Cuando el usuario abre la pantalla de diagnóstico de salud e infraestructura RLS
    Entonces visualiza el estado operativo de PostgreSQL, el rol "centris_app_user" sin BYPASSRLS y el aislamiento verificado por Box
