-- ============================================================
-- MODULO 001: USUARIOS, ROLES Y PERMISOS
-- MIGRACION 008: PERMISOS GRANULARES DE CAJA
-- ============================================================

-- Crear permisos especificos para operaciones de caja.
INSERT INTO public.permisos (
    codigo,
    nombre,
    descripcion,
    modulo
)
VALUES
(
    'caja.abrir_propia',
    'Abrir caja propia',
    'Permite al cajero abrir su propia caja.',
    'caja'
),
(
    'caja.registrar_movimiento_propio',
    'Registrar movimientos propios',
    'Permite registrar entradas y salidas en la caja propia.',
    'caja'
),
(
    'caja.cerrar_propia',
    'Cerrar caja propia',
    'Permite cerrar la caja propia.',
    'caja'
),
(
    'caja.consultar_propia',
    'Consultar caja propia',
    'Permite consultar la caja y sus movimientos propios.',
    'caja'
),
(
    'caja.consultar_todas',
    'Consultar todas las cajas',
    'Permite consultar todas las cajas y sus movimientos.',
    'caja'
),
(
    'caja.gestionar_todas',
    'Gestionar todas las cajas',
    'Permite administrar las operaciones de todas las cajas.',
    'caja'
)
ON CONFLICT (codigo) DO NOTHING;

-- Cajero: operaciones limitadas a su propia caja.
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT rol.id, permiso.id
FROM public.roles AS rol
CROSS JOIN public.permisos AS permiso
WHERE rol.codigo = 'cajero'
  AND permiso.codigo IN (
      'caja.abrir_propia',
      'caja.registrar_movimiento_propio',
      'caja.cerrar_propia',
      'caja.consultar_propia'
  )
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Administrador: operaciones propias y administracion global.
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT rol.id, permiso.id
FROM public.roles AS rol
CROSS JOIN public.permisos AS permiso
WHERE rol.codigo = 'administrador'
  AND permiso.codigo IN (
      'caja.abrir_propia',
      'caja.registrar_movimiento_propio',
      'caja.cerrar_propia',
      'caja.consultar_propia',
      'caja.consultar_todas',
      'caja.gestionar_todas'
  )
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Retirar la asignacion del permiso general anterior.
DELETE FROM public.rol_permisos
WHERE permiso_id = (
    SELECT id
    FROM public.permisos
    WHERE codigo = 'caja.gestionar'
)
AND rol_id = (
    SELECT id
    FROM public.roles
    WHERE codigo = 'administrador'
);

COMMENT ON TABLE public.permisos IS
'Catalogo de permisos del sistema, incluyendo operaciones granulares de caja.';
