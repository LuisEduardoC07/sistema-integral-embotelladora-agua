-- ============================================================
-- MODULO 001: USUARIOS, ROLES Y PERMISOS
-- MIGRACION 004: ASIGNACION DE PERMISOS POR ROL
-- ============================================================

-- SUPERUSUARIO: todos los permisos existentes.
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.codigo = 'superusuario';

-- ADMINISTRADOR: operaciones y administracion limitada.
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permisos p
    ON p.codigo IN (
        'perfil.consultar',
        'usuarios.consultar',
        'usuarios.crear_cajero',
        'usuarios.suspender_cajero',
        'usuarios.reactivar_cajero',
        'productos.consultar',
        'productos.crear',
        'productos.editar',
        'productos.desactivar',
        'categorias.gestionar',
        'inventario.consultar',
        'inventario.ajustar',
        'ventas.consultar',
        'ventas.crear',
        'ventas.anular',
        'pedidos.consultar',
        'pedidos.gestionar',
        'cotizaciones.crear',
        'reportes.consultar',
        'facturas.consultar',
        'caja.gestionar'
    )
WHERE r.codigo = 'administrador';

-- CAJERO: ventas y consultas operativas.
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permisos p
    ON p.codigo IN (
        'perfil.consultar',
        'productos.consultar',
        'inventario.consultar',
        'ventas.consultar',
        'ventas.crear',
        'pedidos.consultar',
        'pedidos.gestionar',
        'facturas.consultar'
    )
WHERE r.codigo = 'cajero';

-- CLIENTE: operaciones de su propia cuenta.
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permisos p
    ON p.codigo IN (
        'perfil.consultar',
        'productos.consultar',
        'pedidos.consultar_propios',
        'cotizaciones.crear'
    )
WHERE r.codigo = 'cliente';
