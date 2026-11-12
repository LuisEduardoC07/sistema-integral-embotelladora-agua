-- ============================================================
-- AQUACONTROL
-- MIGRACION: SEPARACION DE PERMISOS Y ACCESO A PEDIDOS
-- ============================================================

BEGIN;

-- 1. Registrar los nuevos permisos.
INSERT INTO public.permisos (codigo, nombre, descripcion, modulo)
SELECT datos.codigo, datos.nombre, datos.descripcion, 'pedidos'
FROM (
    VALUES
        (
            'pedidos.consultar_todos',
            'Consultar todos los pedidos',
            'Consultar pedidos de todos los clientes y todos sus estados.'
        ),
        (
            'pedidos.entregar',
            'Completar entregas',
            'Marcar como entregados los pedidos pendientes.'
        )
) AS datos(codigo, nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.permisos p
    WHERE p.codigo = datos.codigo
);

-- 2. Administradores: consulta completa.
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.codigo = 'administrador'
  AND p.codigo = 'pedidos.consultar_todos'
  AND NOT EXISTS (
      SELECT 1
      FROM public.rol_permisos rp
      WHERE rp.rol_id = r.id
        AND rp.permiso_id = p.id
  );

-- 3. Cajeros: permiso exclusivo para completar entregas.
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.codigo = 'cajero'
  AND p.codigo = 'pedidos.entregar'
  AND NOT EXISTS (
      SELECT 1
      FROM public.rol_permisos rp
      WHERE rp.rol_id = r.id
        AND rp.permiso_id = p.id
  );

-- 4. Retirar al cajero el permiso de gestión administrativa.
DELETE FROM public.rol_permisos rp
USING public.roles r, public.permisos p
WHERE rp.rol_id = r.id
  AND rp.permiso_id = p.id
  AND r.codigo = 'cajero'
  AND p.codigo = 'pedidos.gestionar';

-- 5. Sustituir la política de consulta del personal.
DROP POLICY IF EXISTS pedidos_consultar_personal
ON public.pedidos;

CREATE POLICY pedidos_consultar_personal
ON public.pedidos
FOR SELECT
TO authenticated
USING (
    public.tiene_permiso('pedidos.consultar_todos')
    OR (
        estado = 'pendiente'
        AND public.tiene_permiso('pedidos.consultar')
    )
);

-- 6. Restringir también los detalles de cada pedido.
DROP POLICY IF EXISTS pedido_detalles_consultar_autorizado
ON public.pedido_detalles;

CREATE POLICY pedido_detalles_consultar_autorizado
ON public.pedido_detalles
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.pedidos p
        WHERE p.id = pedido_detalles.pedido_id
          AND (
              (
                  p.cliente_id = (SELECT auth.uid())
                  AND public.tiene_permiso('pedidos.consultar_propios')
              )
              OR public.tiene_permiso('pedidos.consultar_todos')
              OR (
                  p.estado = 'pendiente'
                  AND public.tiene_permiso('pedidos.consultar')
              )
          )
    )
);

-- 7. Separar la entrega de la gestión administrativa.
CREATE OR REPLACE FUNCTION public.pedidos_actualizar_estado(
    p_pedido_id UUID,
    p_estado TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_usuario UUID := auth.uid();
    v_estado_actual TEXT;
    v_puede_gestionar BOOLEAN;
    v_puede_entregar BOOLEAN;
BEGIN
    IF v_usuario IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión.';
    END IF;

    v_puede_gestionar :=
        public.tiene_permiso('pedidos.gestionar');

    v_puede_entregar :=
        public.tiene_permiso('pedidos.entregar');

    IF NOT v_puede_gestionar AND NOT v_puede_entregar THEN
        RAISE EXCEPTION 'No tienes permiso para modificar pedidos.';
    END IF;

    IF p_pedido_id IS NULL OR p_estado IS NULL
       OR p_estado NOT IN (
           'pendiente',
           'confirmado',
           'en_preparacion',
           'en_camino',
           'entregado',
           'cancelado'
       ) THEN
        RAISE EXCEPTION 'El pedido o el estado solicitado no son válidos.';
    END IF;

    SELECT p.estado
    INTO v_estado_actual
    FROM public.pedidos p
    WHERE p.id = p_pedido_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pedido no existe.';
    END IF;

    IF v_estado_actual IN ('entregado', 'cancelado') THEN
        RAISE EXCEPTION 'No se puede modificar un pedido finalizado.';
    END IF;

    -- El cajero únicamente puede completar un pedido pendiente.
    IF NOT v_puede_gestionar THEN
        IF NOT (
            v_puede_entregar
            AND v_estado_actual = 'pendiente'
            AND p_estado = 'entregado'
        ) THEN
            RAISE EXCEPTION
                'El cajero solamente puede completar pedidos pendientes.';
        END IF;
    END IF;

    UPDATE public.pedidos
    SET estado = p_estado,
        gestionado_por = v_usuario,
        gestionado_en = now(),
        actualizado_en = now()
    WHERE id = p_pedido_id;
END;
$function$;

REVOKE ALL
ON FUNCTION public.pedidos_actualizar_estado(UUID, TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.pedidos_actualizar_estado(UUID, TEXT)
TO authenticated;

COMMENT ON FUNCTION public.pedidos_actualizar_estado(UUID, TEXT) IS
'El cajero solo puede completar pedidos pendientes. Administradores y superusuarios pueden gestionar estados y cancelaciones.';

COMMIT;
