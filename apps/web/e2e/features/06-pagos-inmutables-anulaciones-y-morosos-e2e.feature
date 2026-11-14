# language: es
Característica: Caja Contable de Pagos Inmutables, Anulaciones Auditables y Reporte de Morosos E2E

  Escenario: Recepcionista asienta pagos parciales, verifica cálculo dinámico de Saldo, deep-link y salida de Moroso
    Dado un Recepcionista autenticado en la ficha de un Atleta con Membresía de 30000 iniciada el "2026-11-01"
    Entonces la ficha muestra un Saldo de 30000 y el Atleta figura como Moroso
    Cuando registra un Pago de 15000 en "EFECTIVO"
    Y registra un Pago de 10000 en "TRANSFERENCIA"
    Entonces el Saldo de la Membresía se actualiza dinámicamente a 5000
    Y en el reporte de Morosos el Atleta figura con una deuda de 5000 y puede abrir su ficha desde Caja
    Cuando registra un Pago de 5000 en "EFECTIVO"
    Entonces el Saldo de la Membresía se actualiza dinámicamente a 0
    Y el Atleta deja de figurar como Moroso
    Y el Recepcionista no dispone de controles para anular pagos ni acceder a la Auditoría de Caja

  Escenario: Administrador anula un pago auditable con motivo obligatorio y el saldo se recalcula
    Dado un Administrador autenticado en la ficha de un Atleta con Membresía de 30000 y un Pago de 10000
    Entonces el Saldo de la Membresía es de 20000
    Cuando el Administrador anula el Pago de 10000 ingresando el motivo "Pago duplicado por error"
    Entonces el Pago figura marcado como Anulado con el motivo "Pago duplicado por error"
    Y el Saldo de la Membresía se recalcula automáticamente a 30000
    Y en la Auditoría de Caja el Pago permanece visible con su motivo de anulación y sin desborde horizontal

  Escenario: Administrador anula un pago directamente desde el panel lateral de Auditoría de Caja
    Dado un Administrador autenticado en la Auditoría de Caja con un Pago de 15000 en "EFECTIVO" sobre una Membresía de 30000
    Cuando abre el panel de anulación en Caja e ingresa el motivo "Comprobante repetido en mostrador"
    Entonces la Auditoría de Caja actualiza los ingresos válidos y muestra el Pago Anulado con su motivo sin desborde horizontal

  Escenario: Coach no tiene acceso a las pantallas financieras ni reporte de Morosos
    Dado un Coach autenticado en el sistema
    Cuando intenta navegar a la pantalla de Caja y Morosos
    Entonces el sistema le deniega el acceso sin código 403 Forbidden y puede volver al panel
