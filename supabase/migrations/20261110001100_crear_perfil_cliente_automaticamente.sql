-- ============================================================
-- MODULO 001: USUARIOS, ROLES Y PERMISOS
-- MIGRACION 011: CREACION AUTOMATICA DEL PERFIL CLIENTE
-- ============================================================

CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_rol_cliente_id UUID;
    v_nombre TEXT;
BEGIN
    -- Obtener exclusivamente el rol cliente.
    SELECT id
    INTO v_rol_cliente_id
    FROM public.roles
    WHERE codigo = 'cliente';

    IF v_rol_cliente_id IS NULL THEN
        RAISE EXCEPTION 'No existe el rol cliente en el catalogo.';
    END IF;

    -- Obtener un nombre seguro para el perfil.
    -- Los metadatos nunca determinan el rol ni el estado.
    v_nombre := COALESCE(
        NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'nombre'), ''),
        NULLIF(pg_catalog.split_part(NEW.email, '@', 1), ''),
        NULLIF(NEW.phone, ''),
        'Usuario'
    );

    INSERT INTO public.profiles (
        id,
        rol_id,
        nombre,
        telefono,
        estado
    )
    VALUES (
        NEW.id,
        v_rol_cliente_id,
        v_nombre,
        NEW.phone,
        'pendiente'
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- El trigger es el unico mecanismo que necesita ejecutar
-- esta funcion. No se concede ejecucion directa a clientes.
REVOKE ALL
ON FUNCTION public.crear_perfil_usuario()
FROM PUBLIC, anon, authenticated;

-- Crear el trigger de perfiles en Supabase Auth.
DROP TRIGGER IF EXISTS trg_crear_perfil_usuario
ON auth.users;

CREATE TRIGGER trg_crear_perfil_usuario
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.crear_perfil_usuario();

COMMENT ON FUNCTION public.crear_perfil_usuario() IS
'Crea automaticamente un perfil pendiente con rol cliente para cada nuevo usuario de Supabase Auth. Ignora cualquier rol enviado en los metadatos.';
