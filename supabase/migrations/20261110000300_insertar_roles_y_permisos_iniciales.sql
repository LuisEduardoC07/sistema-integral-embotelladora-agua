-- ============================================================
-- MODULO 001: USUARIOS, ROLES Y PERMISOS
-- MIGRACION 003: ROLES Y PERMISOS INICIALES
-- ============================================================

INSERT INTO public.roles (codigo, nombre, descripcion, es_sistema)
VALUES
(
    'superusuario',
    'Superusuario',
    'Control total del sistema y administracion de usuarios.',
    TRUE
),
(
    'administrador',
    'Administrador',
    'Gestion operativa, reportes y administracion de cajeros.',
    TRUE
),
(
    'cajero',
    'Cajero',
    'Ventas, pedidos y consultas operativas autorizadas.',
    TRUE
),
(
    'cliente',
    'Cliente',
    'Acceso a catalogo, cotizaciones, compras y pedidos propios.',
    TRUE
);

INSERT INTO public.permisos (codigo, nombre, descripcion, modulo)
VALUES
('perfil.consultar', 'Consultar perfil', 'Consultar el perfil propio.', 'usuarios'),
('usuarios.consultar', 'Consultar usuarios', 'Consultar usuarios autorizados.', 'usuarios'),
('usuarios.crear_cajero', 'Crear cajeros', 'Crear cuentas con rol cajero.', 'usuarios'),
('usuarios.crear_administrador', 'Crear administradores', 'Crear cuentas administrativas.', 'usuarios'),
('usuarios.suspender_cajero', 'Suspender cajeros', 'Suspender cuentas de cajero.', 'usuarios'),
('usuarios.reactivar_cajero', 'Reactivar cajeros', 'Reactivar cuentas de cajero.', 'usuarios'),
('usuarios.gestionar_roles', 'Gestionar roles', 'Administrar asignaciones de roles.', 'usuarios'),
('usuarios.gestionar_permisos', 'Gestionar permisos', 'Administrar permisos del sistema.', 'usuarios'),
('usuarios.auditoria', 'Consultar auditoria', 'Consultar auditoria de usuarios.', 'usuarios'),
('productos.consultar', 'Consultar productos', 'Consultar catalogo de productos.', 'productos'),
('productos.crear', 'Crear productos', 'Registrar productos.', 'productos'),
('productos.editar', 'Editar productos', 'Modificar productos.', 'productos'),
('productos.desactivar', 'Desactivar productos', 'Desactivar productos.', 'productos'),
('categorias.gestionar', 'Gestionar categorias', 'Administrar categorias.', 'productos'),
('inventario.consultar', 'Consultar inventario', 'Consultar existencias.', 'inventario'),
('inventario.ajustar', 'Ajustar inventario', 'Registrar ajustes de existencias.', 'inventario'),
('ventas.consultar', 'Consultar ventas', 'Consultar historial de ventas.', 'ventas'),
('ventas.crear', 'Registrar ventas', 'Registrar ventas en POS.', 'ventas'),
('ventas.anular', 'Anular ventas', 'Anular ventas autorizadas.', 'ventas'),
('pedidos.consultar', 'Consultar pedidos', 'Consultar pedidos autorizados.', 'pedidos'),
('pedidos.gestionar', 'Gestionar pedidos', 'Gestionar pedidos y despachos.', 'pedidos'),
('pedidos.consultar_propios', 'Consultar pedidos propios', 'Consultar pedidos del cliente autenticado.', 'pedidos'),
('cotizaciones.crear', 'Crear cotizaciones', 'Solicitar cotizaciones.', 'cotizaciones'),
('reportes.consultar', 'Consultar reportes', 'Consultar reportes operativos.', 'reportes'),
('facturas.consultar', 'Consultar facturas', 'Consultar facturas en modo lectura.', 'facturacion'),
('caja.gestionar', 'Gestionar caja', 'Administrar operaciones de caja.', 'caja'),
('sistema.mantenimiento', 'Mantenimiento del sistema', 'Ejecutar tareas administrativas.', 'sistema');

COMMENT ON TABLE public.permisos IS
    'Catalogo inicial de permisos del sistema';
