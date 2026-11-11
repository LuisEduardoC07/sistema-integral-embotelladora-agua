-- ============================================================
-- MODULO 001: USUARIOS, ROLES Y PERMISOS
-- MIGRACION 009: COMPLETAR PERMISOS DEL SUPERUSUARIO
-- ============================================================

-- El superusuario debe tener asignados todos los permisos
-- existentes en el catalogo, incluidos los agregados posteriormente.

INSERT INTO public.rol_permisos (
    rol_id,
    permiso_id
)
SELECT
    rol.id,
    permiso.id
FROM public.roles AS rol
CROSS JOIN public.permisos AS permiso
WHERE rol.codigo = 'superusuario'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

COMMENT ON TABLE public.rol_permisos IS
'Relacion de permisos asignados a cada rol. El superusuario recibe todos los permisos existentes.';
