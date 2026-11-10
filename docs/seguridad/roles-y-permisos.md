# Roles y permisos

## Roles del sistema

### Cliente
- Registro público exclusivamente con rol cliente.
- Consultar catálogo y disponibilidad.
- Solicitar cotizaciones y realizar pedidos.
- Consultar sus propios pedidos e historial.

### Cajero
- Operar el punto de venta.
- Consultar productos, precios e inventario.
- Consultar ventas e información de facturas autorizada.
- Consultar y gestionar pedidos pendientes según permisos.
- Registrar despachos y entregas.
- No modificar productos, categorías, precios ni inventario.

### Administrador
- Todas las operaciones autorizadas al cajero.
- Administrar productos, categorías, precios e inventario.
- Consultar reportes, ventas y facturación.
- Crear únicamente usuarios con rol cajero.
- No crear administradores ni superusuarios.

### Superusuario
- Acceso administrativo total.
- Crear administradores y cajeros.
- Gestionar usuarios y roles.
- Acceder al mantenimiento y auditoría del sistema.

## Reglas de autorización

- El registro público nunca permite seleccionar un rol privilegiado.
- La asignación de roles se valida exclusivamente en el servidor.
- La interfaz no constituye una barrera de seguridad.
- Las operaciones de base de datos deben respetar RLS y permisos.
- Los cambios administrativos deben conservar trazabilidad.

## Principio de mínimo privilegio

Cada usuario recibe únicamente los permisos necesarios para realizar
las funciones correspondientes a su rol.
