# language: es
Característica: Identidad Global, Autenticación, Selector de Box y Guard de 4 Roles Componibles E2E

  Escenario: Activación de primer ingreso para Usuario creado en mostrador y sesión JWT con Auth.js
    Dado un Usuario creado en mostrador con contraseña pendiente de activación y Afiliación activa en "Box Centris Norte"
    Cuando accede por primera vez al flujo de activación de cuenta e ingresa su email y nueva contraseña
    Entonces define su contraseña global por única vez y accede al panel operativo de "Box Centris Norte"
    Cuando intenta utilizar nuevamente el flujo de activación de cuenta con ese mismo email
    Entonces visualiza el rechazo indicando que la cuenta ya fue activada previamente

  Escenario: Selector de Box bajo RLS, cambio de Box sin re-login y composición de los 4 roles atómicos
    Dado un Usuario autenticado con Afiliaciones activas en "Box Centris Norte" como Coach y Recepcionista y en "Box Centris Sur" como Atleta
    Cuando inicia sesión en la aplicación web mediante Auth.js
    Entonces visualiza el selector de Box con sus Afiliaciones en "Box Centris Norte" y "Box Centris Sur"
    Cuando selecciona operar en "Box Centris Norte"
    Entonces el layout le habilita la unión de las vistas de Coach y Recepcionista y le bloquea el acceso a la configuración exclusiva de Administrador
    Cuando cambia de Box activo a "Box Centris Sur" desde el encabezado sin volver a autenticarse
    Entonces el encabezado muestra "Box Centris Sur" y el layout habilita únicamente la vista de Atleta

  Escenario: Configuración general del Box con validación Zod por un Administrador
    Dado un Administrador autenticado operando en "Box Centris Norte"
    Cuando actualiza la configuración de su Box con zona horaria "America/Montevideo", moneda "UYU", anticipación de 10 días y ventana de cancelación de 90 minutos
    Entonces los cambios se validan con Zod y quedan persistidos en "Box Centris Norte"

  Escenario: Gestión de roles y Soft Delete de Afiliaciones del Box por un Administrador
    Dado un Usuario del equipo con Afiliación activa en "Box Centris Norte" y en "Box Centris Sur"
    Cuando el Administrador de "Box Centris Norte" modifica los roles de su Afiliación y luego le aplica baja lógica
    Entonces los permisos del Usuario se actualizan de inmediato en "Box Centris Norte" sin afectar su Afiliación en "Box Centris Sur"
