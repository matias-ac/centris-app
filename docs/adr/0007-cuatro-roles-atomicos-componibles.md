# Cuatro roles atómicos componibles por Afiliación

Los boxes van desde operaciones unipersonales (donde un coach también cobra y anota) hasta estructuras con personal de recepción y coaches por hora. Decidimos modelar la autorización dentro de un Box mediante **cuatro roles atómicos e independientes** combinables en la **Afiliación**: **Administrador**, **Recepcionista**, **Coach** y **Atleta**. En lugar de jerarquías rígidas o matrices de permisos granulares, un Usuario acumula capacidades según los roles asignados en su Afiliación a ese Box.

## Considered Options

- **Jerarquía de roles lineal** (Admin > Staff > Coach > Atleta): Asume que un rol superior siempre incluye las facultades del inferior. Falla en boxes reales: un Coach no debe ver la caja ni modificar membresías de otros atletas, y un Recepcionista no dicta clases ni necesita acceso a funciones técnicas del Box.
- **Matriz granular de permisos (RBAC por acción)**: Ofrece flexibilidad total, pero introduce sobrecarga de modelado, tablas intermedias y complejidad de interfaz innecesaria para las necesidades del MVP.

## Consequences

- Los permisos se evalúan verificando si el conjunto de roles de la Afiliación en el Box activo contiene el rol requerido para la operación:
  - **Administrador**: Configuración general del Box, Horarios de clases, catálogo de Planes y auditoría de Pagos y Anulaciones.
  - **Recepcionista**: Operación cotidiana de mostrador (crear perfiles de Atletas, asignar Membresías, registrar Pagos y marcar Asistencia). No puede modificar la configuración del Box ni el catálogo de Planes.
  - **Coach**: Consulta de inscriptos a sus Clases asignadas y marcado de Asistencia.
  - **Atleta**: Reserva y cancelación de sus propios turnos.
- La polivalencia operativa se resuelve por composición: un coach que también administra la recepción en un turno acumula los roles `['coach', 'recepcionista']`.
- La asignación de Membresías por parte del Recepcionista se limita estrictamente a los Planes ya definidos y vigentes en el catálogo del Box.
