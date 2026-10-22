# El acceso lo da la Membresía, no el Pago

Los boxes suelen dejar entrenar a atletas que "pagan el viernes" y manejan la deuda en persona. Por eso decidimos separar el **acceso** del **dinero**. La única condición para reservar es tener una Membresía vigente en la fecha de la Clase. Los **Pagos** son un registro contable manual asociado a la Membresía (monto, medio, fecha), que sirve para llevar la caja y ver quién debe, pero nunca habilita ni bloquea reservas. El MVP no integra pasarelas de pago online.

## Considered Options

- **Bloquear reservas con pagos pendientes**: no refleja cómo operan los boxes, que toleran la deuda, y obligaría a modelar excepciones y prórrogas desde el día uno.
- **No registrar pagos**: más simple, pero el administrador necesita llevar la caja y la lista de morosos dentro del sistema.

## Consequences

- Una Membresía impaga es tan válida para reservar como una pagada. Que el Atleta deba es información para el Administrador, no una regla del sistema.
- Si en el futuro se quiere bloquear por deuda o integrar cobro online, es una regla nueva que se suma sobre este modelo, no un cambio de la Membresía.

## Modelo contable

- La **Membresía guarda su Precio**, copiado del Plan al crearse y ajustable en ella (descuentos, becas a $0). Un cambio de precio del Plan no afecta a las Membresías existentes.
- El **Pago es un evento inmutable** de dinero efectivamente recibido (monto, medio, fecha). No existe un Pago "pendiente", y una Membresía puede tener varios Pagos (pagos parciales).
- El **Saldo se calcula, no se guarda**: Precio − suma de Pagos no anulados. Guardarlo crearía una segunda fuente de verdad que se puede desincronizar.
- Los Pagos **no se editan ni se borran**. Un error se corrige con una **Anulación** (quién y cuándo) y un Pago nuevo, para que la caja sea auditable.
- Cada Box opera en una **única moneda**, configurada en el Box. Los montos se guardan como enteros en la unidad mínima de la moneda (o `numeric`), nunca como punto flotante.
