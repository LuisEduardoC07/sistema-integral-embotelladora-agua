CREATE TABLE IF NOT EXISTS public.identidades_usuarios_eliminados (
  usuario_id UUID PRIMARY KEY,
  nombre TEXT NOT NULL,
  correo TEXT,
  rol_codigo TEXT NOT NULL,
  telefono TEXT,
  creado_en_original TIMESTAMPTZ,
  eliminado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  eliminado_por UUID,
  eliminado_por_nombre TEXT,
  motivo TEXT,
  CONSTRAINT identidades_usuarios_eliminados_nombre_check
    CHECK (btrim(nombre) <> ''),
  CONSTRAINT identidades_usuarios_eliminados_rol_check
    CHECK (btrim(rol_codigo) <> '')
);

COMMENT ON TABLE public.identidades_usuarios_eliminados IS
  'Archivo histórico inmutable de identidades de cuentas eliminadas. Conserva UUID y datos identificativos para historiales comerciales y auditorías.';

CREATE INDEX IF NOT EXISTS idx_identidades_usuarios_eliminados_rol
  ON public.identidades_usuarios_eliminados (rol_codigo);

CREATE INDEX IF NOT EXISTS idx_identidades_usuarios_eliminados_fecha
  ON public.identidades_usuarios_eliminados (eliminado_en DESC);

ALTER TABLE public.identidades_usuarios_eliminados ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.identidades_usuarios_eliminados
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT ON TABLE public.identidades_usuarios_eliminados
  TO service_role;

CREATE OR REPLACE FUNCTION public.impedir_modificacion_identidad_eliminada()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION
    'El archivo histórico de identidades eliminadas es inmutable.';
END;
$$;

REVOKE ALL ON FUNCTION public.impedir_modificacion_identidad_eliminada()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_identidades_eliminadas_inmutables
  ON public.identidades_usuarios_eliminados;

CREATE TRIGGER trg_identidades_eliminadas_inmutables
BEFORE UPDATE OR DELETE
ON public.identidades_usuarios_eliminados
FOR EACH ROW
EXECUTE FUNCTION public.impedir_modificacion_identidad_eliminada();

DROP TRIGGER IF EXISTS trg_identidades_eliminadas_no_truncate
  ON public.identidades_usuarios_eliminados;

CREATE TRIGGER trg_identidades_eliminadas_no_truncate
BEFORE TRUNCATE
ON public.identidades_usuarios_eliminados
FOR EACH STATEMENT
EXECUTE FUNCTION public.impedir_modificacion_identidad_eliminada();

-- ============================================================
-- CONSERVAR UUID HISTÓRICOS AL ELIMINAR PERFILES
-- ============================================================

ALTER TABLE public.auditoria_operaciones
  DROP CONSTRAINT IF EXISTS auditoria_operaciones_actor_id_fkey;

ALTER TABLE public.auditoria_usuarios
  DROP CONSTRAINT IF EXISTS auditoria_usuarios_actor_id_fkey;

ALTER TABLE public.auditoria_usuarios
  DROP CONSTRAINT IF EXISTS auditoria_usuarios_usuario_afectado_id_fkey;

ALTER TABLE public.caja_movimientos
  DROP CONSTRAINT IF EXISTS caja_movimientos_usuario_id_fkey;

ALTER TABLE public.cajas
  DROP CONSTRAINT IF EXISTS cajas_usuario_id_fkey;

ALTER TABLE public.configuracion_sistema
  DROP CONSTRAINT IF EXISTS configuracion_sistema_actualizado_por_fkey;

ALTER TABLE public.inventario_movimientos
  DROP CONSTRAINT IF EXISTS inventario_movimientos_usuario_id_fkey;

ALTER TABLE public.pedidos
  DROP CONSTRAINT IF EXISTS pedidos_cliente_id_fkey;

ALTER TABLE public.pedidos
  DROP CONSTRAINT IF EXISTS pedidos_gestionado_por_fkey;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_creado_por_fkey;

ALTER TABLE public.ventas
  DROP CONSTRAINT IF EXISTS ventas_anulada_por_fkey;

ALTER TABLE public.ventas
  DROP CONSTRAINT IF EXISTS ventas_usuario_id_fkey;
CREATE OR REPLACE FUNCTION public.consultar_historial_ventas(
    p_limite INTEGER DEFAULT 25,
    p_cursor_fecha TIMESTAMPTZ DEFAULT NULL,
    p_cursor_id UUID DEFAULT NULL,
    p_fecha_desde DATE DEFAULT NULL,
    p_fecha_hasta DATE DEFAULT NULL,
    p_cajero_id UUID DEFAULT NULL,
    p_metodo_pago TEXT DEFAULT NULL,
    p_estado TEXT DEFAULT NULL,
    p_busqueda TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_usuario UUID;
    v_rol TEXT;
    v_limite INTEGER;
    v_resultado JSONB;
BEGIN
    v_usuario := (SELECT auth.uid());

    -- Verificar identidad.
    IF v_usuario IS NULL THEN
        RAISE EXCEPTION 'Se requiere autenticación.';
    END IF;

    -- Verificar perfil activo y rol.
    SELECT r.codigo
    INTO v_rol
    FROM public.profiles AS p
    INNER JOIN public.roles AS r
        ON r.id = p.rol_id
    WHERE p.id = v_usuario
      AND p.estado = 'activo';

    IF v_rol IS NULL THEN
        RAISE EXCEPTION 'Se requiere un perfil activo y autenticado.';
    END IF;

    IF v_rol NOT IN ('cajero', 'administrador', 'superusuario') THEN
        RAISE EXCEPTION 'Tu rol no puede consultar el historial de ventas.';
    END IF;

    -- Verificar permiso en la base de datos.
    IF NOT public.tiene_permiso('ventas.consultar') THEN
        RAISE EXCEPTION 'No tienes permiso para consultar el historial de ventas.';
    END IF;

    -- Validar el cajero solicitado.
    IF p_cajero_id IS NOT NULL THEN

        -- Un cajero solo puede consultar su propio historial.
        IF v_rol = 'cajero'
           AND p_cajero_id <> v_usuario THEN
            RAISE EXCEPTION 'No puedes consultar las ventas de otro cajero.';
        END IF;

        -- El identificador debe pertenecer a un cajero activo o archivado.
        IF NOT EXISTS (
            SELECT 1
            FROM public.profiles AS p
            INNER JOIN public.roles AS r
                ON r.id = p.rol_id
            WHERE p.id = p_cajero_id
              AND p.estado = 'activo'
              AND r.codigo = 'cajero'
        )
        AND NOT EXISTS (
            SELECT 1
            FROM public.identidades_usuarios_eliminados AS ie
            WHERE ie.usuario_id = p_cajero_id
              AND ie.rol_codigo = 'cajero'
        ) THEN
            RAISE EXCEPTION 'El cajero seleccionado no existe, no está activo o no está archivado.';
        END IF;

    END IF;

    -- Validar cursor.
    IF (p_cursor_fecha IS NULL) <> (p_cursor_id IS NULL) THEN
        RAISE EXCEPTION 'El cursor debe incluir fecha e identificador.';
    END IF;

    -- Validar fechas.
    IF p_fecha_desde IS NOT NULL
       AND p_fecha_hasta IS NOT NULL
       AND p_fecha_desde > p_fecha_hasta THEN
        RAISE EXCEPTION 'El rango de fechas no es válido.';
    END IF;

    -- Validar método de pago.
    IF p_metodo_pago IS NOT NULL
       AND p_metodo_pago NOT IN (
           'efectivo',
           'tarjeta',
           'transferencia',
           'otro'
       ) THEN
        RAISE EXCEPTION 'El método de pago no es válido.';
    END IF;

    -- Validar estado.
    IF p_estado IS NOT NULL
       AND p_estado NOT IN ('completada', 'anulada') THEN
        RAISE EXCEPTION 'El estado de venta no es válido.';
    END IF;

    -- Validar búsqueda.
    IF p_busqueda IS NOT NULL
       AND pg_catalog.length(pg_catalog.btrim(p_busqueda)) > 100 THEN
        RAISE EXCEPTION 'La búsqueda admite máximo 100 caracteres.';
    END IF;

    v_limite := LEAST(GREATEST(COALESCE(p_limite, 25), 1), 100);

    /*
     * ventas_base:
     * Contiene todas las ventas que cumplen los filtros.
     * No aplica el cursor, para que las estadísticas no cambien
     * cuando el usuario avance a otra página.
     */
    WITH ventas_base AS (
        SELECT
            v.id,
            v.numero,
            v.caja_id,
            v.usuario_id,
            v.cliente_nombre,
            v.subtotal,
            v.descuento,
            v.impuesto,
            v.total,
            v.estado,
            v.observaciones,
            v.creado_en,
            v.anulada_por,
            COALESCE(pa.nombre, ia.nombre) AS anulada_por_nombre,
            v.anulada_en,
            v.motivo_anulacion,
            v.cambio_devuelto,
            COALESCE(p.nombre, ie.nombre, 'Usuario eliminado') AS cajero_nombre
        FROM public.ventas AS v
        LEFT JOIN public.profiles AS p
            ON p.id = v.usuario_id
        LEFT JOIN public.identidades_usuarios_eliminados AS ie
            ON ie.usuario_id = v.usuario_id
        LEFT JOIN public.profiles AS pa ON pa.id = v.anulada_por
        LEFT JOIN public.identidades_usuarios_eliminados AS ia ON ia.usuario_id = v.anulada_por
        WHERE
            (
                p_fecha_desde IS NULL
                OR v.creado_en >= (
                    p_fecha_desde::TIMESTAMP
                    AT TIME ZONE 'America/Santo_Domingo'
                )
            )
            AND (
                p_fecha_hasta IS NULL
                OR v.creado_en < (
                    (p_fecha_hasta + 1)::TIMESTAMP
                    AT TIME ZONE 'America/Santo_Domingo'
                )
            )
            AND (
                v_rol <> 'cajero'
                OR v.usuario_id = v_usuario
            )
            AND (
                p_cajero_id IS NULL
                OR v.usuario_id = p_cajero_id
            )
            AND (
                p_estado IS NULL
                OR v.estado = p_estado
            )
            AND (
                NULLIF(pg_catalog.btrim(p_busqueda), '') IS NULL
                OR v.numero::TEXT ILIKE
                    '%' || pg_catalog.btrim(p_busqueda) || '%'
                OR COALESCE(v.cliente_nombre, '') ILIKE
                    '%' || pg_catalog.btrim(p_busqueda) || '%'
                OR v.id::TEXT ILIKE
                    '%' || pg_catalog.btrim(p_busqueda) || '%'
            )
            AND (
                p_metodo_pago IS NULL
                OR EXISTS (
                    SELECT 1
                    FROM public.venta_pagos AS vp
                    WHERE vp.venta_id = v.id
                      AND vp.metodo = p_metodo_pago
                )
            )
    ),

    -- La paginación se aplica después de construir el conjunto completo.
    ventas_candidatas AS (
        SELECT *
        FROM ventas_base
        WHERE
            p_cursor_fecha IS NULL
            OR (creado_en, id) < (p_cursor_fecha, p_cursor_id)
        ORDER BY creado_en DESC, id DESC
        LIMIT (v_limite + 1)
    ),

    pagina AS (
        SELECT *
        FROM ventas_candidatas
        ORDER BY creado_en DESC, id DESC
        LIMIT v_limite
    ),

    elementos AS (
        SELECT
            pg.*,
            (
                SELECT COALESCE(
                    pg_catalog.jsonb_agg(
                        pg_catalog.jsonb_build_object(
                            'id', d.id,
                            'producto_id', d.producto_id,
                            'codigo_producto', d.codigo_producto,
                            'nombre_producto', d.nombre_producto,
                            'cantidad', d.cantidad,
                            'precio_unitario', d.precio_unitario,
                            'tasa_impuesto', d.tasa_impuesto,
                            'subtotal', d.subtotal,
                            'impuesto', d.impuesto,
                            'total', d.total
                        )
                        ORDER BY d.nombre_producto
                    ),
                    '[]'::JSONB
                )
                FROM public.venta_detalles AS d
                WHERE d.venta_id = pg.id
            ) AS detalles,
            (
                SELECT COALESCE(
                    pg_catalog.jsonb_agg(
                        pg_catalog.jsonb_build_object(
                            'id', vp.id,
                            'metodo', vp.metodo,
                            'monto', vp.monto,
                            'monto_recibido', vp.monto_recibido,
                            'referencia', vp.referencia,
                            'creado_en', vp.creado_en
                        )
                        ORDER BY vp.creado_en
                    ),
                    '[]'::JSONB
                )
                FROM public.venta_pagos AS vp
                WHERE vp.venta_id = pg.id
            ) AS pagos
        FROM pagina AS pg
    ),

    -- Estadísticas generales: siempre sobre todas las ventas filtradas.
    estadisticas_totales AS (
        SELECT
            COUNT(*) FILTER (
                WHERE estado = 'completada'
            )::INTEGER AS cantidad_ventas,

            COUNT(*) FILTER (
                WHERE estado = 'anulada'
            )::INTEGER AS cantidad_anuladas,

            COALESCE(
                SUM(total) FILTER (WHERE estado = 'completada'),
                0
            ) AS total_ventas,

            COALESCE(
                SUM(total) FILTER (WHERE estado = 'anulada'),
                0
            ) AS total_anulado,

            COALESCE(
                ROUND(
                    (
                        SUM(total) FILTER (WHERE estado = 'completada')
                    ) / NULLIF(
                        COUNT(*) FILTER (WHERE estado = 'completada'),
                        0
                    ),
                    2
                ),
                0
            ) AS ticket_promedio
        FROM ventas_base
    ),

    estadisticas_productos AS (
        SELECT
            COALESCE(SUM(d.cantidad), 0) AS productos_vendidos
        FROM ventas_base AS v
        INNER JOIN public.venta_detalles AS d
            ON d.venta_id = v.id
        WHERE v.estado = 'completada'
    ),

    estadisticas_metodos AS (
        SELECT COALESCE(
            pg_catalog.jsonb_agg(
                pg_catalog.jsonb_build_object(
                    'metodo', resumen.metodo,
                    'cantidad', resumen.cantidad,
                    'total', resumen.total
                )
                ORDER BY resumen.total DESC
            ),
            '[]'::JSONB
        ) AS datos
        FROM (
            SELECT
                vp.metodo,
                COUNT(*)::INTEGER AS cantidad,
                COALESCE(SUM(vp.monto), 0) AS total
            FROM ventas_base AS v
            INNER JOIN public.venta_pagos AS vp
                ON vp.venta_id = v.id
            WHERE v.estado = 'completada'
            GROUP BY vp.metodo
        ) AS resumen
    ),

    estadisticas_dias AS (
        SELECT COALESCE(
            pg_catalog.jsonb_agg(
                pg_catalog.jsonb_build_object(
                    'fecha', resumen.fecha,
                    'cantidad', resumen.cantidad,
                    'total', resumen.total
                )
                ORDER BY resumen.fecha
            ),
            '[]'::JSONB
        ) AS datos
        FROM (
            SELECT
                (v.creado_en AT TIME ZONE 'America/Santo_Domingo')::DATE
                    AS fecha,
                COUNT(*)::INTEGER AS cantidad,
                COALESCE(SUM(v.total), 0) AS total
            FROM ventas_base AS v
            WHERE v.estado = 'completada'
            GROUP BY (
                v.creado_en AT TIME ZONE 'America/Santo_Domingo'
            )::DATE
        ) AS resumen
    ),

    estadisticas_productos_top AS (
        SELECT COALESCE(
            pg_catalog.jsonb_agg(
                pg_catalog.jsonb_build_object(
                    'producto_id', resumen.producto_id,
                    'nombre', resumen.nombre,
                    'cantidad', resumen.cantidad,
                    'total', resumen.total
                )
                ORDER BY resumen.cantidad DESC, resumen.total DESC
            ),
            '[]'::JSONB
        ) AS datos
        FROM (
            SELECT
                d.producto_id,
                d.nombre_producto AS nombre,
                SUM(d.cantidad) AS cantidad,
                COALESCE(SUM(d.total), 0) AS total
            FROM ventas_base AS v
            INNER JOIN public.venta_detalles AS d
                ON d.venta_id = v.id
            WHERE v.estado = 'completada'
            GROUP BY d.producto_id, d.nombre_producto
            ORDER BY SUM(d.cantidad) DESC, SUM(d.total) DESC
            LIMIT 10
        ) AS resumen
    ),

    estadisticas_cajeros AS (
        SELECT COALESCE(
            pg_catalog.jsonb_agg(
                pg_catalog.jsonb_build_object(
                    'usuario_id', resumen.usuario_id,
                    'nombre', resumen.nombre,
                    'cantidad', resumen.cantidad,
                    'total', resumen.total
                )
                ORDER BY resumen.total DESC
            ),
            '[]'::JSONB
        ) AS datos
        FROM (
            SELECT
                v.usuario_id,
                v.cajero_nombre AS nombre,
                COUNT(*)::INTEGER AS cantidad,
                COALESCE(SUM(v.total), 0) AS total
            FROM ventas_base AS v
            WHERE v.estado = 'completada'
            GROUP BY v.usuario_id, v.cajero_nombre
        ) AS resumen
    ),

    estadisticas AS (
        SELECT pg_catalog.jsonb_build_object(
            'cantidad_ventas', t.cantidad_ventas,
            'cantidad_anuladas', t.cantidad_anuladas,
            'total_ventas', t.total_ventas,
            'total_anulado', t.total_anulado,
            'ticket_promedio', t.ticket_promedio,
            'productos_vendidos', p.productos_vendidos,
            'metodos_pago', m.datos,
            'ventas_por_dia', d.datos,
            'productos_mas_vendidos', pt.datos,
            'ventas_por_cajero', c.datos
        ) AS datos
        FROM estadisticas_totales AS t
        CROSS JOIN estadisticas_productos AS p
        CROSS JOIN estadisticas_metodos AS m
        CROSS JOIN estadisticas_dias AS d
        CROSS JOIN estadisticas_productos_top AS pt
        CROSS JOIN estadisticas_cajeros AS c
    )

    SELECT pg_catalog.jsonb_build_object(
        'ventas',
        COALESCE(
            (
                SELECT pg_catalog.jsonb_agg(
                    pg_catalog.jsonb_build_object(
                        'id', e.id,
                        'numero', e.numero,
                        'caja_id', e.caja_id,
                        'usuario_id', e.usuario_id,
                        'cajero_nombre', e.cajero_nombre,
                        'cliente_nombre', e.cliente_nombre,
                        'subtotal', e.subtotal,
                        'descuento', e.descuento,
                        'impuesto', e.impuesto,
                        'total', e.total,
                        'estado', e.estado,
                        'observaciones', e.observaciones,
                        'creado_en', e.creado_en,
                        'anulada_por', e.anulada_por,
                        'anulada_por_nombre', e.anulada_por_nombre,
                        'anulada_en', e.anulada_en,
                        'motivo_anulacion', e.motivo_anulacion,
                        'cambio_devuelto', e.cambio_devuelto,
                        'detalles', e.detalles,
                        'pagos', e.pagos
                    )
                    ORDER BY e.creado_en DESC, e.id DESC
                )
                FROM elementos AS e
            ),
            '[]'::JSONB
        ),

        'hay_mas',
        EXISTS (
            SELECT 1
            FROM ventas_candidatas
            OFFSET v_limite
            LIMIT 1
        ),

        'siguiente_cursor',
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM ventas_candidatas
                OFFSET v_limite
                LIMIT 1
            )
            THEN (
                SELECT pg_catalog.jsonb_build_object(
                    'creado_en', pg.creado_en,
                    'id', pg.id
                )
                FROM pagina AS pg
                ORDER BY pg.creado_en ASC, pg.id ASC
                LIMIT 1
            )
            ELSE NULL
        END,

        'estadisticas',
        (SELECT datos FROM estadisticas)
    )
    INTO v_resultado;

    RETURN v_resultado;
END;
$$;

-- Mantener el acceso exclusivo mediante RPC autenticada.
REVOKE ALL ON FUNCTION public.consultar_historial_ventas(
    INTEGER,
    TIMESTAMPTZ,
    UUID,
    DATE,
    DATE,
    UUID,
    TEXT,
    TEXT,
    TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consultar_historial_ventas(
    INTEGER,
    TIMESTAMPTZ,
    UUID,
    DATE,
    DATE,
    UUID,
    TEXT,
    TEXT,
    TEXT
) TO authenticated;

COMMENT ON FUNCTION public.consultar_historial_ventas(
    INTEGER,
    TIMESTAMPTZ,
    UUID,
    DATE,
    DATE,
    UUID,
    TEXT,
    TEXT,
    TEXT
) IS
'Consulta segura y paginada del historial de ventas con estadísticas globales de los filtros aplicados. Requiere perfil activo y permiso ventas.consultar. Conserva la identidad histórica de cajeros eliminados.';


-- ELIMINACION SEGURA DE CUENTAS GESTIONADAS
CREATE OR REPLACE FUNCTION public.eliminar_usuario_gestionado(
    p_actor_id uuid,
    p_usuario_id uuid,
    p_motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_actor record;
    v_objetivo record;
    v_archivos bigint;
    v_motivo text;
BEGIN
    IF p_actor_id IS NULL OR p_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Se requiere identificar al actor y al usuario objetivo.';
    END IF;

    IF p_actor_id = p_usuario_id THEN
        RAISE EXCEPTION 'No puedes eliminar tu propia cuenta.';
    END IF;

    v_motivo := pg_catalog.left(
        NULLIF(pg_catalog.btrim(p_motivo), ''),
        500
    );

    SELECT p.id, p.nombre, p.estado, r.codigo AS rol
    INTO v_actor
    FROM public.profiles AS p
    JOIN public.roles AS r ON r.id = p.rol_id
    WHERE p.id = p_actor_id;

    IF NOT FOUND OR v_actor.estado <> 'activo'
       OR v_actor.rol NOT IN ('superusuario', 'administrador') THEN
        RAISE EXCEPTION 'El actor no tiene autorización para eliminar cuentas.';
    END IF;

    SELECT
        p.id,
        p.nombre,
        p.telefono,
        p.estado,
        p.creado_en,
        r.codigo AS rol,
        u.email
    INTO v_objetivo
    FROM public.profiles AS p
    JOIN public.roles AS r ON r.id = p.rol_id
    JOIN auth.users AS u ON u.id = p.id
    WHERE p.id = p_usuario_id
    FOR UPDATE OF p;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró el perfil del usuario.';
    END IF;

    IF v_objetivo.rol = 'superusuario' THEN
        RAISE EXCEPTION 'Las cuentas de superusuario están protegidas.';
    END IF;

    IF v_actor.rol = 'administrador'
       AND v_objetivo.rol <> 'cajero' THEN
        RAISE EXCEPTION 'El administrador únicamente puede eliminar cuentas de cajero.';
    END IF;

    IF v_actor.rol = 'superusuario'
       AND v_objetivo.rol NOT IN ('cliente', 'administrador', 'cajero') THEN
        RAISE EXCEPTION 'El rol del usuario no puede eliminarse.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.cajas AS c
        WHERE c.usuario_id = p_usuario_id
          AND c.estado = 'abierta'
    ) THEN
        RAISE EXCEPTION 'No se puede eliminar la cuenta porque tiene una caja abierta.';
    END IF;

    SELECT pg_catalog.count(*)
    INTO v_archivos
    FROM storage.objects AS o
    WHERE o.owner_id::text = p_usuario_id::text;

    IF v_archivos > 0 THEN
        RAISE EXCEPTION 'No se puede eliminar la cuenta: posee % archivo(s) en Storage.', v_archivos;
    END IF;

    INSERT INTO public.identidades_usuarios_eliminados (
        usuario_id,
        nombre,
        correo,
        rol_codigo,
        telefono,
        creado_en_original,
        eliminado_por,
        eliminado_por_nombre,
        motivo
    )
    VALUES (
        v_objetivo.id,
        v_objetivo.nombre,
        v_objetivo.email,
        v_objetivo.rol,
        v_objetivo.telefono,
        v_objetivo.creado_en,
        v_actor.id,
        v_actor.nombre,
        v_motivo
    )
    ON CONFLICT (usuario_id) DO NOTHING;

    INSERT INTO public.auditoria_usuarios (
        actor_id,
        usuario_afectado_id,
        accion,
        datos_anteriores,
        datos_nuevos,
        motivo
    )
    VALUES (
        v_actor.id,
        v_objetivo.id,
        'eliminar_' || v_objetivo.rol,
        pg_catalog.jsonb_build_object(
            'id', v_objetivo.id,
            'nombre', v_objetivo.nombre,
            'correo', v_objetivo.email,
            'telefono', v_objetivo.telefono,
            'rol', v_objetivo.rol,
            'estado', v_objetivo.estado
        ),
        pg_catalog.jsonb_build_object(
            'identidad_archivada', true,
            'perfil_eliminado', true,
            'auth_pendiente_de_eliminacion', true
        ),
        v_motivo
    );

    DELETE FROM public.profiles
    WHERE id = p_usuario_id;

    RETURN pg_catalog.jsonb_build_object(
        'id', v_objetivo.id,
        'nombre', v_objetivo.nombre,
        'correo', v_objetivo.email,
        'rol', v_objetivo.rol,
        'perfil_eliminado', true,
        'auth_pendiente_de_eliminacion', true
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.eliminar_usuario_gestionado(uuid, uuid, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.eliminar_usuario_gestionado(uuid, uuid, text)
TO service_role;

COMMENT ON FUNCTION public.eliminar_usuario_gestionado(uuid, uuid, text)
IS 'Archiva la identidad, registra auditoría y elimina el perfil conservando los historiales. La eliminación Auth se completa posteriormente desde el servidor.';

