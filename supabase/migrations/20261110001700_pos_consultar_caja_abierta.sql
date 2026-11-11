CREATE OR REPLACE FUNCTION public.pos_obtener_caja_abierta()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_usuario_id uuid;
    v_caja public.cajas%ROWTYPE;
BEGIN
    v_usuario_id := auth.uid();

    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Sesión no autenticada'
            USING ERRCODE = '28000';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = v_usuario_id
          AND p.estado = 'activo'
    ) THEN
        RAISE EXCEPTION 'El perfil no está activo'
            USING ERRCODE = '42501';
    END IF;

    IF NOT public.tiene_permiso('caja.consultar_propia') THEN
        RAISE EXCEPTION 'No tienes permiso para consultar tu caja'
            USING ERRCODE = '42501';
    END IF;

    SELECT c.*
    INTO v_caja
    FROM public.cajas c
    WHERE c.usuario_id = v_usuario_id
      AND c.estado = 'abierta'
    ORDER BY c.abierta_en DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('caja', NULL);
    END IF;

    RETURN jsonb_build_object(
        'caja',
        jsonb_build_object(
            'id', v_caja.id,
            'estado', v_caja.estado,
            'monto_apertura', v_caja.monto_apertura,
            'abierta_en', v_caja.abierta_en
        )
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.pos_obtener_caja_abierta() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pos_obtener_caja_abierta() FROM anon;
GRANT EXECUTE ON FUNCTION public.pos_obtener_caja_abierta() TO authenticated;
