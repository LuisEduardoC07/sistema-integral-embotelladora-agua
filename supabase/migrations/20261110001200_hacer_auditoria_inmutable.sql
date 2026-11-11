-- ============================================================
-- MODULO 001: USUARIOS, ROLES Y PERMISOS
-- MIGRACION 012: AUDITORIA INMUTABLE
-- ============================================================

CREATE OR REPLACE FUNCTION public.proteger_auditoria_usuarios()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION
        'La auditoria de usuarios es inmutable. Operacion no permitida: %.',
        TG_OP;

    RETURN NULL;
END;
$$;

-- Impedir modificar o eliminar registros individuales.
CREATE TRIGGER trg_auditoria_usuarios_inmutable
BEFORE UPDATE OR DELETE
ON public.auditoria_usuarios
FOR EACH ROW
EXECUTE FUNCTION public.proteger_auditoria_usuarios();

-- Impedir eliminar todos los registros mediante TRUNCATE.
CREATE TRIGGER trg_auditoria_usuarios_no_truncate
BEFORE TRUNCATE
ON public.auditoria_usuarios
FOR EACH STATEMENT
EXECUTE FUNCTION public.proteger_auditoria_usuarios();

-- La funcion solo debe ejecutarse mediante sus triggers.
REVOKE ALL
ON FUNCTION public.proteger_auditoria_usuarios()
FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.proteger_auditoria_usuarios() IS
'Protege la auditoria de usuarios contra UPDATE, DELETE y TRUNCATE.';
