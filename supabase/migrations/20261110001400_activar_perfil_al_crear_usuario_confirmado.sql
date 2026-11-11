-- ============================================================
-- MODULO 001: USUARIOS, ROLES Y PERMISOS
-- MIGRACION 014: ACTIVAR PERFIL SI EL USUARIO YA ESTA CONFIRMADO
-- ============================================================

CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_rol_cliente_id UUID;
    v_nombre TEXT;
    v_estado TEXT;
BEGIN
    -- El registro publico siempre asigna exclusivamente cliente.
    SELECT id
    INTO v_rol_cliente_id
    FROM public.roles
    WHERE codigo = 'cliente';

    IF v_rol_cliente_id IS NULL THEN
        RAISE EXCEPTION 'No existe el rol cliente en el catalogo.';
    END IF;

    -- Obtener un nombre seguro.
    v_nombre := COALESCE(
        NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'nombre'), ''),
        NULLIF(pg_catalog.split_part(NEW.email, '@', 1), ''),
        NULLIF(NEW.phone, ''),
        'Usuario'
    );

    -- Activar solamente si el usuario ya llega confirmado.
    v_estado := CASE
        WHEN NEW.email_confirmed_at IS NOT NULL
          OR NEW.phone_confirmed_at IS NOT NULL
        THEN 'activo'
        ELSE 'pendiente'
    END;

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
        v_estado
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.crear_perfil_usuario()
IS 'Crea perfiles exclusivamente de cliente y determina su estado segun la confirmacion del usuario en Auth.';
