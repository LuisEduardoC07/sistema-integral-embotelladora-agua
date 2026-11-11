-- ============================================================
-- MODULO 001: USUARIOS, ROLES Y PERMISOS
-- MIGRACION 010: PROTEGER PERFILES Y AUDITORIA
-- ============================================================

-- Activar Row Level Security.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_usuarios ENABLE ROW LEVEL SECURITY;

-- Retirar todos los privilegios directos de los clientes.
REVOKE ALL ON TABLE public.profiles
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.auditoria_usuarios
FROM PUBLIC, anon, authenticated;

-- Permitir exclusivamente consultas sujetas a RLS.
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.auditoria_usuarios TO authenticated;

-- ============================================================
-- PERFILES
-- ============================================================

DROP POLICY IF EXISTS profiles_select_autorizado
ON public.profiles;

CREATE POLICY profiles_select_autorizado
ON public.profiles
FOR SELECT
TO authenticated
USING (
    -- Cada usuario puede consultar su propio perfil.
    id = (SELECT auth.uid())

    -- El superusuario puede consultar todos los perfiles.
    OR public.tiene_permiso('usuarios.gestionar_roles')

    -- El administrador puede consultar perfiles de cajeros.
    OR (
        public.tiene_permiso('usuarios.consultar')
        AND EXISTS (
            SELECT 1
            FROM public.roles AS rol_objetivo
            WHERE rol_objetivo.id = profiles.rol_id
              AND rol_objetivo.codigo = 'cajero'
        )
    )
);

-- No se crean politicas INSERT, UPDATE ni DELETE.
-- Los cambios de perfiles se realizaran mediante funciones
-- controladas del servidor.

-- ============================================================
-- AUDITORIA DE USUARIOS
-- ============================================================

DROP POLICY IF EXISTS auditoria_usuarios_select_superusuario
ON public.auditoria_usuarios;

CREATE POLICY auditoria_usuarios_select_superusuario
ON public.auditoria_usuarios
FOR SELECT
TO authenticated
USING (
    public.tiene_permiso('usuarios.auditoria')
);

-- No se crean politicas INSERT, UPDATE ni DELETE.
-- Los registros de auditoria se generaran mediante mecanismos
-- controlados del servidor y permaneceran protegidos.

COMMENT ON TABLE public.profiles IS
'Perfiles de usuarios. La consulta esta restringida mediante RLS segun identidad, rol y permisos.';

COMMENT ON TABLE public.auditoria_usuarios IS
'Auditoria de usuarios. Consulta exclusiva del superusuario y sin modificacion directa desde clientes.';
