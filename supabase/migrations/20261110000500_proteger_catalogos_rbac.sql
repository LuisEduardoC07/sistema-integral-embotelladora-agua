-- ============================================================
-- MODULO 001: USUARIOS, ROLES Y PERMISOS
-- MIGRACION 005: PROTECCION DE CATALOGOS RBAC
-- ============================================================

-- Activar Row Level Security.
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rol_permisos ENABLE ROW LEVEL SECURITY;

-- Los catálogos son consultables por usuarios autenticados.
CREATE POLICY roles_consulta_autenticada
ON public.roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY permisos_consulta_autenticada
ON public.permisos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY rol_permisos_consulta_autenticada
ON public.rol_permisos
FOR SELECT
TO authenticated
USING (true);

-- Impedir modificaciones directas desde los clientes autenticados.
REVOKE INSERT, UPDATE, DELETE
ON public.roles, public.permisos, public.rol_permisos
FROM anon, authenticated;

-- Los usuarios anónimos no pueden consultar los catálogos.
REVOKE ALL
ON public.roles, public.permisos, public.rol_permisos
FROM anon;

-- Proteger los roles del sistema contra eliminación.
CREATE OR REPLACE FUNCTION public.proteger_roles_sistema()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.es_sistema THEN
            RAISE EXCEPTION 'No se pueden eliminar roles del sistema.';
        END IF;

        RETURN OLD;
    END IF;

    IF OLD.es_sistema THEN
        IF NEW.codigo IS DISTINCT FROM OLD.codigo
           OR NEW.es_sistema IS DISTINCT FROM OLD.es_sistema THEN
            RAISE EXCEPTION 'No se puede modificar la identidad de un rol del sistema.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_proteger_roles_sistema
BEFORE UPDATE OR DELETE
ON public.roles
FOR EACH ROW
EXECUTE FUNCTION public.proteger_roles_sistema();

-- Evitar modificaciones directas de permisos asignados.
-- Las futuras funciones administrativas controlarán estas operaciones.
COMMENT ON FUNCTION public.proteger_roles_sistema() IS
'Impide eliminar roles del sistema o modificar su identidad.';
