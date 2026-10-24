# Fechas y Períodos se calculan en la zona horaria del Box

Las reglas de reserva dependen de cortes de calendario (semana, día, Ventana de Cancelación, Anticipación de Reserva). Si esos cortes se calculan en UTC, una Clase del domingo a las 22:00 en Buenos Aires cae en la semana siguiente. Decidimos que cada **Box** tiene una zona horaria IANA (por ejemplo `America/Argentina/Buenos_Aires`), que todos los instantes se guardan como `timestamptz`, y que todo cálculo de calendario se hace en la zona horaria del Box, nunca en la del servidor ni en la del cliente.

## Consequences

- El **Período semanal** es la semana calendario de **lunes 00:00 a domingo 23:59:59**, en la zona horaria del Box. No es configurable en el MVP.
- Un Crédito se imputa al Período en el que cae la fecha y hora de inicio de la Clase (en la zona horaria del Box), no al momento en que se reserva.
- Las semanas parciales al inicio y al final de una Vigencia reciben los Créditos completos. No hay prorrateo.
- En Membresías mensuales o de pack, el Período es toda la Vigencia.
- Las fechas de Vigencia son fechas calendario (`date`) interpretadas en la zona horaria del Box.
- Un Box tiene una sola zona horaria. Una cadena con sedes en varias zonas se modela como varios Boxes.
- Los Horarios se definen en hora local del Box ("lunes 7:00"), y al generar cada Clase se convierten a `timestamptz`. Así, un cambio de horario de verano no corre las clases.
