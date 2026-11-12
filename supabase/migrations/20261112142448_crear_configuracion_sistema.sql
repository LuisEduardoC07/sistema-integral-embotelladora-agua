BEGIN;

CREATE TABLE public.configuracion_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave SMALLINT NOT NULL DEFAULT 1 UNIQUE
        CHECK (clave = 1),

    nombre_comercial TEXT,
    telefono_contacto TEXT,
    whatsapp TEXT,
    correo_contacto TEXT,
    direccion TEXT,
    horario_atencion TEXT,

    zona_horaria TEXT NOT NULL DEFAULT 'America/Santo_Domingo',
    moneda TEXT NOT NULL DEFAULT 'DOP',
    entregas_habilitadas BOOLEAN NOT NULL DEFAULT TRUE,
    costo_entrega NUMERIC(12,2) NOT NULL DEFAULT 0
        CHECK (costo_entrega >= 0),
    pedido_minimo NUMERIC(12,2) NOT NULL DEFAULT 0
        CHECK (pedido_minimo >= 0),

    actualizado_por UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.configuracion_sistema (clave)
VALUES (1);

ALTER TABLE public.configuracion_sistema
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.configuracion_sistema
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.configuracion_sistema TO service_role;

INSERT INTO public.permisos (codigo, nombre, descripcion, modulo)
VALUES (
    'sistema.configuracion',
    'Gestionar configuración',
    'Consultar y modificar la configuración general del sistema.',
    'sistema'
)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.codigo = 'superusuario'
  AND p.codigo = 'sistema.configuracion'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

COMMENT ON TABLE public.configuracion_sistema IS
'Configuración general y comercial de AquaControl.';


-- Actualización transaccional de configuración y auditoría.
CREATE OR REPLACE FUNCTION public.actualizar_configuracion_sistema(
    p_datos JSONB,
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_anterior public.configuracion_sistema%ROWTYPE;
    v_actualizada public.configuracion_sistema%ROWTYPE;
BEGIN
    SELECT *
    INTO v_anterior
    FROM public.configuracion_sistema
    WHERE clave = 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe la configuración del sistema.';
    END IF;

    UPDATE public.configuracion_sistema
    SET
        nombre_comercial = NULLIF(p_datos->>'nombre_comercial', ''),
        telefono_contacto = NULLIF(p_datos->>'telefono_contacto', ''),
        whatsapp = NULLIF(p_datos->>'whatsapp', ''),
        correo_contacto = NULLIF(p_datos->>'correo_contacto', ''),
        direccion = NULLIF(p_datos->>'direccion', ''),
        horario_atencion = NULLIF(p_datos->>'horario_atencion', ''),
        zona_horaria = p_datos->>'zona_horaria',
        moneda = p_datos->>'moneda',
        entregas_habilitadas = (p_datos->>'entregas_habilitadas')::BOOLEAN,
        costo_entrega = (p_datos->>'costo_entrega')::NUMERIC(12,2),
        pedido_minimo = (p_datos->>'pedido_minimo')::NUMERIC(12,2),
        actualizado_por = p_actor_id,
        actualizado_en = NOW()
    WHERE id = v_anterior.id
    RETURNING * INTO v_actualizada;

    INSERT INTO public.auditoria_operaciones (
        actor_id,
        entidad,
        entidad_id,
        accion,
        datos
    )
    VALUES (
        p_actor_id,
        'configuracion_sistema',
        v_actualizada.id,
        'actualizar',
        jsonb_build_object(
            'antes', to_jsonb(v_anterior),
            'despues', to_jsonb(v_actualizada)
        )
    );

    RETURN to_jsonb(v_actualizada);
END;
$func$;

REVOKE ALL ON FUNCTION public.actualizar_configuracion_sistema(JSONB, UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.actualizar_configuracion_sistema(JSONB, UUID)
TO service_role;
COMMIT;
