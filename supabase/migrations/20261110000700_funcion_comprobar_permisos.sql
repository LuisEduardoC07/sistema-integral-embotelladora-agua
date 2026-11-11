-- ============================================================
-- MODULO 001: USUARIOS, ROLES Y PERMISOS
-- MIGRACION 007: FUNCION CENTRAL DE AUTORIZACION
-- ============================================================

CREATE OR REPLACE FUNCTION public.tiene_permiso(
    p_codigo_permiso TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_autorizado BOOLEAN;
BEGIN
    -- Rechazar permisos vacios o nulos.
    IF p_codigo_permiso IS NULL
       OR pg_catalog.btrim(p_codigo_permiso) = '' THEN
        RETURN FALSE;
    END IF;

    -- Rechazar llamadas sin usuario autenticado.
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Comprobar estado y permisos del usuario actual.
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles AS perfil
        INNER JOIN public.roles AS rol
            ON rol.id = perfil.rol_id
        LEFT JOIN public.rol_permisos AS rp
            ON rp.rol_id = rol.id
        LEFT JOIN public.permisos AS permiso
            ON permiso.id = rp.permiso_id
        WHERE perfil.id = auth.uid()
          AND perfil.estado = 'activo'
          AND (
              rol.codigo = 'superusuario'
              OR permiso.codigo = p_codigo_permiso
          )
    )
    INTO v_autorizado;

    RETURN COALESCE(v_autorizado, FALSE);
END;
$$;

-- No permitir ejecucion publica ni anonima.
REVOKE ALL
ON FUNCTION public.tiene_permiso(TEXT)
FROM PUBLIC, anon;

-- Los usuarios autenticados pueden consultar sus propios permisos.
GRANT EXECUTE
ON FUNCTION public.tiene_permiso(TEXT)
TO authenticated;

COMMENT ON FUNCTION public.tiene_permiso(TEXT) IS
'Comprueba el permiso del usuario autenticado y exige que su perfil este activo. El superusuario tiene todos los permisos.';
