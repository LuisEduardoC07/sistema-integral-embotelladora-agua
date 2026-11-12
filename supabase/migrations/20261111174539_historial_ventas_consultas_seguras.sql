-- ============================================================
-- HISTORIAL DE VENTAS: CONSULTA SEGURA, ESTADISTICAS Y PAGINACION
-- ============================================================

-- Índices para ordenar y paginar el historial de ventas.
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_id
ON public.ventas (creado_en DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_ventas_usuario_fecha_id
ON public.ventas (usuario_id, creado_en DESC, id DESC);
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

        -- El identificador debe pertenecer a un cajero activo.
        IF NOT EXISTS (
            SELECT 1
            FROM public.profiles AS p
            INNER JOIN public.roles AS r
                ON r.id = p.rol_id
            WHERE p.id = p_cajero_id
              AND p.estado = 'activo'
              AND r.codigo = 'cajero'
        ) THEN
            RAISE EXCEPTION 'El cajero seleccionado no existe o no está activo.';
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
            v.anulada_en,
            v.motivo_anulacion,
            v.cambio_devuelto,
            p.nombre AS cajero_nombre
        FROM public.ventas AS v
        INNER JOIN public.profiles AS p
            ON p.id = v.usuario_id
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

-- Acceso exclusivo mediante RPC autenticada.
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
'Consulta segura y paginada del historial de ventas con estadísticas globales de los filtros aplicados. Requiere perfil activo y permiso ventas.consultar. No concede lectura directa de las tablas.';
