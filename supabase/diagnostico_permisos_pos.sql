SELECT
    r.codigo AS rol,
    p.codigo AS permiso
FROM public.rol_permisos rp
JOIN public.roles r ON r.id = rp.rol_id
JOIN public.permisos p ON p.id = rp.permiso_id
WHERE p.codigo IN (
    'caja.abrir_propia',
    'caja.cerrar_propia',
    'caja.consultar_propia',
    'caja.registrar_movimiento_propio',
    'caja.consultar_todas',
    'caja.gestionar',
    'caja.gestionar_todas',
    'productos.consultar',
    'inventario.consultar',
    'ventas.crear',
    'ventas.consultar',
    'ventas.anular'
)
ORDER BY r.codigo, p.codigo;
