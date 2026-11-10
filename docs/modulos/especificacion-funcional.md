# Especificación funcional inicial

## Productos e inventario

- Categorías iniciales: funditas de agua, botellas de agua y botellones.
- Productos con SKU, precio, estado y datos de inventario.
- Historial de movimientos de inventario.
- Las solicitudes pendientes no descuentan existencias.
- El inventario se descuenta al confirmar la venta.
- La confirmación debe validar existencias de forma atómica.
- Las anulaciones registran movimientos inversos; no borran el historial.

## Tienda y cotizaciones

- Catálogo público y carrito.
- Cotizaciones convertibles en pedidos o ventas.
- Evitar conversiones duplicadas.
- Conservar el historial de la cotización original.

## Pedidos y entregas

- Horarios y capacidad configurables.
- Reservas protegidas contra doble asignación del último cupo.
- Guardar una copia de la dirección utilizada en cada pedido.
- Mantener estados e historial de cambios.
- Separar estado de pago y estado de entrega.
- Ubicación GPS opcional y con consentimiento.

## Punto de venta

- Búsqueda por SKU, identificador y nombre.
- Pagos en efectivo, tarjeta y transferencia.
- Validar los datos obligatorios según el método de pago.
- No almacenar números completos de tarjeta.
- Confirmar venta, pago e inventario de forma consistente.

## Caja

- Apertura y cierre de caja.
- Movimientos y conciliación.
- Historial de sesiones y operaciones.

## Facturación e integraciones

- Preparar arquitectura para DGII/e-CF y Azul.
- No simular comprobantes fiscales autorizados ni pagos reales.
- Validar confirmaciones de pago en el servidor.
- Procesar notificaciones externas de forma idempotente.
