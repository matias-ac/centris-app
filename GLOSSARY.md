# Functional Training SaaS

Plataforma multitenant para que boxes de CrossFit, centros de entrenamiento funcional y gimnasios boutique gestionen clases, reservas, asistencia y planes de sus atletas.

## Identidad y tenancy

**Box**:
Organización cliente de la plataforma (un centro de entrenamiento). Es la unidad de aislamiento: sus atletas, coaches, clases y configuración no son visibles para otros boxes.
_Avoid_: Tenant (en conversaciones de dominio), gimnasio, organización, cuenta

**Usuario**:
Persona con una identidad única en la plataforma (credenciales, nombre, email), independiente de cualquier box.
_Avoid_: Cuenta, cliente, perfil

**Afiliación**:
Relación entre un Usuario y un Box que le da acceso a ese box con uno o más roles. Un Usuario puede tener afiliaciones a varios boxes; cada box solo ve la afiliación propia.
_Avoid_: Membresía (reservado para lo comercial), miembro, suscripción

**Rol**:
Función que un Usuario cumple dentro de un Box a través de su Afiliación: Atleta, Coach, Recepcionista o Administrador. Una misma Afiliación puede combinar varios roles.

**Atleta**:
Usuario con rol de atleta en un Box; reserva y cancela sus clases.
_Avoid_: Alumno, socio, cliente

**Coach**:
Usuario con rol de coach en un Box; consulta la lista de inscriptos a sus Clases y registra Asistencia.
_Avoid_: Profesor, entrenador, instructor

**Recepcionista**:
Usuario con rol de atención y administración operativa en un Box; gestiona perfiles de Atletas, asigna Membresías, asienta Pagos y registra Asistencia. No gestiona el catálogo de Planes ni la configuración del Box.
_Avoid_: Staff, secretario, empleado, administrativo

**Administrador**:
Usuario con control total sobre un Box; gestiona su configuración, Horarios, catálogo de Planes y audita Pagos y Anulaciones.
_Avoid_: Dueño, owner, admin

## Planes

**Plan**:
Oferta del catálogo de un Box, creada por un Administrador, que define cuántas clases se pueden reservar (Créditos por Período, o ilimitado) y por cuánto tiempo. Ilimitado mensual, "3 veces por semana" y "pack de 10 clases" son configuraciones de un mismo Plan. Es una plantilla: no pertenece a ningún Atleta.
_Avoid_: Abono, pack, paquete, cuota

**Membresía**:
Asignación de un Plan a un Atleta para una Vigencia concreta. Lleva una copia propia de las condiciones del Plan al momento de crearse, y los ajustes individuales (por ejemplo, un Crédito de regalo) se hacen sobre ella. Un Atleta tiene como máximo una Membresía vigente en una fecha dada.
_Avoid_: Plan (cuando se habla del atleta), suscripción, abono, afiliación

**Crédito**:
Unidad que habilita reservar una clase dentro de un Período. Todas las clases consumen lo mismo, sin importar su tipo.
_Avoid_: Cupo (reservado para la capacidad de una clase), clase disponible, ficha

**Período**:
Lapso en el que se renuevan los Créditos de una Membresía: la semana calendario de lunes a domingo en la zona horaria del Box o, si no se renuevan semanalmente, toda su Vigencia. Cada Crédito consumido pertenece al Período en el que cae la Clase reservada.

**Vigencia**:
Intervalo de fechas en que una Membresía habilita al Atleta. Una reserva es válida si la fecha de la clase cae dentro de la Vigencia, sin importar cuándo se reservó.
_Avoid_: Validez, duración

**Baja Anticipada**:
Finalización de una Membresía antes del fin de su Vigencia, decidida por un Administrador. Acorta la Vigencia y cancela las Reservas de Clases posteriores.
_Avoid_: Cancelación de membresía, suspensión

**Renovación**:
Creación manual de una nueva Membresía del mismo Plan que empieza al terminar la Vigencia anterior. Puede hacerse por adelantado, como Membresía futura.
_Avoid_: Recarga, extensión

## Pagos

**Precio**:
Monto que un Atleta debe por una Membresía, en la moneda del Box. Se copia del Plan al crear la Membresía y el Administrador puede ajustarlo en ella (descuento, beca a $0).
_Avoid_: Cuota, tarifa, importe

**Pago**:
Registro manual e inmutable, asentado por un Administrador o Recepcionista, de dinero efectivamente recibido por una Membresía, con su monto, medio (efectivo, transferencia, etc.) y fecha. Una Membresía puede tener varios Pagos. Es solo contable: no habilita ni bloquea reservas.
_Avoid_: Transacción, cobro, pago pendiente

**Anulación**:
Marca sobre un Pago erróneo que lo deja sin efecto en el Saldo, registrando quién lo anuló y cuándo. Es la única forma de corregir un Pago.
_Avoid_: Borrado, edición, reversión

**Saldo**:
Diferencia entre el Precio de una Membresía y la suma de sus Pagos no anulados. Un Saldo mayor a cero es deuda.
_Avoid_: Deuda pendiente, balance

**Moroso**:
Atleta con al menos una Membresía con Saldo mayor a cero.
_Avoid_: Deudor, impago

## Clases

**Tipo de Clase**:
Categoría de entrenamiento que ofrece un Box (por ejemplo WOD, Halterofilia, Open Box). Solo describe qué se hace, no cuándo.
_Avoid_: Disciplina, actividad, clase (para referirse al tipo)

**Horario**:
Regla recurrente de un Box que define cuándo se dicta un Tipo de Clase, con qué duración, con cuántos Cupos y con qué Coach por defecto. No se reserva: es el molde del que salen las Clases.
_Avoid_: Turno, grilla, cronograma, clase recurrente

**Clase**:
Ocurrencia concreta de un Tipo de Clase en una fecha y hora, generada a partir de un Horario. Es lo que el Atleta reserva y donde se registra la asistencia, y puede editarse o cancelarse sin alterar su Horario.
_Avoid_: Turno, sesión, evento

**Cupo**:
Lugar disponible para un Atleta en una Clase. La cantidad de Cupos de una Clase nunca puede ser menor a la de reservas confirmadas.
_Avoid_: Capacidad, lugar, crédito

**Anticipación de Reserva**:
Cantidad máxima de días antes de una Clase en que un Atleta puede reservarla. La configura cada Box.
_Avoid_: Ventana de reserva, horizonte

## Reservas y asistencia

**Reserva**:
Cupo de una Clase tomado por un Atleta, que consume un Crédito de su Membresía al momento de reservar (salvo en Membresías ilimitadas). Un Atleta no puede tener Reservas en Clases que se superpongan en el tiempo.
_Avoid_: Turno, inscripción, booking

**Ventana de Cancelación**:
Tiempo mínimo antes del inicio de una Clase hasta el cual un Atleta puede cancelar su Reserva y recuperar el Crédito. La configura cada Box.
_Avoid_: Límite de cancelación, plazo

**Cancelación Tardía**:
Cancelación de una Reserva dentro de la Ventana de Cancelación: libera el Cupo pero el Crédito no se devuelve.

**Asistencia**:
Registro, hecho por un Coach, Recepcionista o Administrador, de que un Atleta con Reserva se presentó a la Clase.
_Avoid_: Check-in, presente

**Ausencia**:
Reserva no cancelada cuyo Atleta no tiene Asistencia registrada en la Clase. El Crédito se pierde.
_Avoid_: No-show, falta, inasistencia
