-- ============================================================
-- MODULO 001: USUARIOS, ROLES Y PERMISOS
-- MIGRACION 006: AJUSTE DE PRIVILEGIOS DE CATALOGOS RBAC
-- ============================================================

-- Permitir lectura a usuarios autenticados.
-- Las politicas RLS siguen determinando las filas visibles.
GRANT SELECT
ON TABLE
    public.roles,
    public.permisos,
    public.rol_permisos
TO authenticated;

-- Mantener bloqueadas las modificaciones directas.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE
    public.roles,
    public.permisos,
    public.rol_permisos
FROM anon, authenticated;

-- La funcion solo debe utilizarse mediante el trigger creado.
REVOKE ALL
ON FUNCTION public.proteger_roles_sistema()
FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.proteger_roles_sistema() IS
'Funcion interna de trigger para proteger la identidad de los roles del sistema.';
