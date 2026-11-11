-- ============================================================
-- MODULO 001: USUARIOS, ROLES Y PERMISOS
-- MIGRACION 013: ACTIVACION TRAS CONFIRMAR CONTACTO
-- ============================================================

CREATE OR REPLACE FUNCTION public.activar_perfil_tras_confirmacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Solo actuar cuando el correo o telefono haya sido confirmado.
    IF NEW.email_confirmed_at IS NULL
       AND NEW.phone_confirmed_at IS NULL THEN
        RETURN NEW;
    END IF;

    -- Activar exclusivamente perfiles pendientes.
    -- Nunca modificar perfiles suspendidos.
    -- El rol no se modifica.
    UPDATE public.profiles
    SET
        estado = 'activo',
        actualizado_en = pg_catalog.now()
    WHERE id = NEW.id
      AND estado = 'pendiente';

    RETURN NEW;
END;
$$;

-- La funcion solo se ejecuta mediante el trigger.
REVOKE ALL
ON FUNCTION public.activar_perfil_tras_confirmacion()
FROM PUBLIC, anon, authenticated;

-- Ejecutar cuando Supabase Auth actualice la confirmacion.
DROP TRIGGER IF EXISTS trg_activar_perfil_tras_confirmacion
ON auth.users;

CREATE TRIGGER trg_activar_perfil_tras_confirmacion
AFTER UPDATE OF email_confirmed_at, phone_confirmed_at
ON auth.users
FOR EACH ROW
WHEN (
    NEW.email_confirmed_at IS NOT NULL
    OR NEW.phone_confirmed_at IS NOT NULL
)
EXECUTE FUNCTION public.activar_perfil_tras_confirmacion();

-- Activar tambien perfiles pendientes cuyo contacto ya estuviera
-- confirmado antes de instalar esta migracion.
UPDATE public.profiles AS perfil
SET
    estado = 'activo',
    actualizado_en = pg_catalog.now()
FROM auth.users AS usuario
WHERE perfil.id = usuario.id
  AND perfil.estado = 'pendiente'
  AND (
      usuario.email_confirmed_at IS NOT NULL
      OR usuario.phone_confirmed_at IS NOT NULL
  );

COMMENT ON FUNCTION public.activar_perfil_tras_confirmacion() IS
'Activa perfiles pendientes cuando Supabase Auth confirma el correo o telefono. Nunca reactiva perfiles suspendidos ni modifica roles.';
