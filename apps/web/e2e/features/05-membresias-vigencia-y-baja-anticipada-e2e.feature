# language: es
Característica: Asignación de Membresías, Renovaciones, Ajustes y Baja Anticipada E2E

  Escenario: Recepción asigna una Membresía, programa una Renovación y ajusta créditos extra desde la ficha del Atleta
    Dado un Recepcionista autenticado en la ficha de un Atleta con el Plan "Plan Membresía BDD" de 30 días a 35000
    Cuando asigna el Plan al Atleta con inicio el "2026-11-01"
    Entonces la ficha muestra una Membresía con Vigencia del "2026-11-01" al "2026-11-30"
    Cuando intenta asignar otra Membresía con inicio el "2026-11-15"
    Entonces la ficha informa que la Vigencia se solapa con otra Membresía del Atleta
    Cuando programa una Renovación con inicio el "2026-12-01"
    Entonces la ficha muestra una Membresía con Vigencia del "2026-12-01" al "2026-12-30"
    Cuando ajusta los créditos extra de la Membresía del "2026-11-01" a 2
    Entonces la Membresía del "2026-11-01" muestra 2 créditos extra
    Y no dispone de las acciones de ajuste de Precio ni de Baja Anticipada

  Escenario: Administración ajusta el Precio a beca y ejecuta la Baja Anticipada desde la ficha del Atleta
    Dado un Administrador autenticado en la ficha de un Atleta con el Plan "Plan Membresía BDD" de 30 días a 35000
    Cuando asigna el Plan al Atleta con inicio el "2026-11-01"
    Y ajusta el Precio de la Membresía del "2026-11-01" a 0
    Entonces la Membresía del "2026-11-01" muestra un Precio de 0
    Cuando ejecuta la Baja Anticipada de la Membresía del "2026-11-01" con fin el "2026-11-15"
    Entonces la ficha muestra una Membresía con Vigencia del "2026-11-01" al "2026-11-15"
