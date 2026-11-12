-- ============================================================
-- EFECTIVO RECIBIDO Y CAMBIO DEVUELTO EN POS
-- ============================================================

BEGIN;

ALTER TABLE public.ventas
    ADD COLUMN cambio_devuelto NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.ventas
    ADD CONSTRAINT ventas_cambio_devuelto_no_negativo
    CHECK (cambio_devuelto >= 0);

ALTER TABLE public.venta_pagos
    ADD COLUMN monto_recibido NUMERIC(12,2);

UPDATE public.venta_pagos
SET monto_recibido = monto;

ALTER TABLE public.venta_pagos
    ALTER COLUMN monto_recibido SET NOT NULL;

ALTER TABLE public.venta_pagos
    DROP CONSTRAINT venta_pago_monto_positivo;

ALTER TABLE public.venta_pagos
    ADD CONSTRAINT venta_pago_importes_validos
    CHECK (
        monto >= 0
        AND monto_recibido > 0
        AND monto_recibido >= monto
        AND (
            metodo = 'efectivo'
            OR (
                metodo IN ('tarjeta', 'transferencia', 'otro')
                AND monto > 0
                AND monto_recibido = monto
            )
        )
    );
CREATE OR REPLACE FUNCTION public.pos_confirmar_venta(
    p_caja_id UUID,
    p_items JSONB,
    p_pagos JSONB,
    p_cliente_nombre TEXT DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_usuario UUID;
    v_venta_id UUID;
    v_numero BIGINT;

    v_subtotal NUMERIC(12,2) := 0;
    v_impuesto NUMERIC(12,2) := 0;
    v_total NUMERIC(12,2) := 0;
    v_total_pagado NUMERIC(12,2) := 0;
    v_efectivo NUMERIC(12,2) := 0;
    v_efectivo_recibido NUMERIC(12,2) := 0;
    v_total_no_efectivo NUMERIC(12,2) := 0;
    v_cambio NUMERIC(12,2) := 0;
    v_importe_recibido NUMERIC(12,2);

    v_item JSONB;
    v_pago JSONB;
    v_producto RECORD;

    v_cantidad NUMERIC(12,3);
    v_importe NUMERIC(12,2);
    v_subtotal_linea NUMERIC(12,2);
    v_impuesto_linea NUMERIC(12,2);
    v_existencia_anterior NUMERIC(12,3);

    v_productos_solicitados INTEGER;
    v_productos_encontrados INTEGER;
BEGIN
    v_usuario := auth.uid();

    IF v_usuario IS NULL
       OR NOT EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = v_usuario
              AND estado = 'activo'
       ) THEN
        RAISE EXCEPTION 'El perfil no está activo.';
    END IF;

    IF NOT public.tiene_permiso('ventas.crear') THEN
        RAISE EXCEPTION 'No tienes permiso para registrar ventas.';
    END IF;

    -- Validar estructura de productos.
    IF p_items IS NULL
       OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Los productos enviados no tienen un formato válido.';
    END IF;

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La venta debe contener productos.';
    END IF;

    -- Validar estructura de pagos.
    IF p_pagos IS NULL
       OR jsonb_typeof(p_pagos) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Los pagos enviados no tienen un formato válido.';
    END IF;

    IF jsonb_array_length(p_pagos) = 0 THEN
        RAISE EXCEPTION 'Debes registrar al menos un pago.';
    END IF;

    -- Validar cada producto antes de realizar conversiones.
    FOR v_item IN
        SELECT value
        FROM jsonb_array_elements(p_items)
    LOOP
        IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN
            RAISE EXCEPTION 'Cada producto debe enviarse como un objeto JSON.';
        END IF;

        IF COALESCE(v_item->>'producto_id', '') !~
            '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
            RAISE EXCEPTION 'Identificador de producto no válido.';
        END IF;

        IF COALESCE(v_item->>'cantidad', '') !~
            '^[0-9]+(\.[0-9]{1,3})?$' THEN
            RAISE EXCEPTION 'Cantidad no válida.';
        END IF;

        v_cantidad := (v_item->>'cantidad')::NUMERIC;

        IF v_cantidad <= 0 THEN
            RAISE EXCEPTION 'La cantidad debe ser mayor que cero.';
        END IF;
    END LOOP;

    -- Validar todos los pagos.
    FOR v_pago IN
        SELECT value
        FROM jsonb_array_elements(p_pagos)
    LOOP
        IF jsonb_typeof(v_pago) IS DISTINCT FROM 'object' THEN
            RAISE EXCEPTION 'Cada pago debe enviarse como un objeto JSON.';
        END IF;

        IF v_pago->>'metodo' IS NULL
           OR v_pago->>'metodo' NOT IN (
                'efectivo',
                'tarjeta',
                'transferencia',
                'otro'
           ) THEN
            RAISE EXCEPTION 'Método de pago no válido.';
        END IF;

        IF COALESCE(v_pago->>'monto', '') !~
            '^[0-9]+(\.[0-9]{1,2})?$' THEN
            RAISE EXCEPTION 'Importe aplicado no válido.';
        END IF;

        IF COALESCE(v_pago->>'monto_recibido', v_pago->>'monto', '') !~
            '^[0-9]+(\.[0-9]{1,2})?$' THEN
            RAISE EXCEPTION 'Importe recibido no válido.';
        END IF;

        v_importe := (v_pago->>'monto')::NUMERIC;
        v_importe_recibido :=
            COALESCE(v_pago->>'monto_recibido', v_pago->>'monto')::NUMERIC;

        IF v_importe < 0 OR v_importe_recibido <= 0 THEN
            RAISE EXCEPTION 'Los importes del pago no son válidos.';
        END IF;

        IF v_importe_recibido < v_importe THEN
            RAISE EXCEPTION 'El importe recibido no puede ser menor que el aplicado.';
        END IF;

        IF v_pago->>'metodo' <> 'efectivo'
           AND (
                v_importe <= 0
                OR v_importe_recibido <> v_importe
           ) THEN
            RAISE EXCEPTION 'Los pagos no efectivos deben coincidir con el importe aplicado.';
        END IF;

        IF v_pago->>'metodo' = 'efectivo' THEN
            v_efectivo := v_efectivo + v_importe;
            v_efectivo_recibido :=
                v_efectivo_recibido + v_importe_recibido;
        ELSE
            v_total_no_efectivo :=
                v_total_no_efectivo + v_importe;
        END IF;

        v_total_pagado := v_total_pagado + v_importe;
    END LOOP;

    -- Bloquear la caja propia antes de procesar la venta.
    PERFORM 1
    FROM public.cajas
    WHERE id = p_caja_id
      AND usuario_id = v_usuario
      AND estado = 'abierta'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Debes tener una caja propia abierta.';
    END IF;

    -- Contar productos distintos solicitados.
    SELECT COUNT(*)
    INTO v_productos_solicitados
    FROM (
        SELECT DISTINCT (elemento->>'producto_id')::UUID AS producto_id
        FROM jsonb_array_elements(p_items) AS elemento
    ) AS solicitados;

    -- Bloquear productos e inventarios siempre en el mismo orden.
    -- Esto reduce el riesgo de deadlocks entre ventas concurrentes.
    PERFORM p.id
    FROM public.productos AS p
    INNER JOIN public.inventario AS i
        ON i.producto_id = p.id
    WHERE p.id IN (
        SELECT DISTINCT (elemento->>'producto_id')::UUID
        FROM jsonb_array_elements(p_items) AS elemento
    )
      AND p.activo = TRUE
    ORDER BY p.id
    FOR UPDATE OF p, i;

    -- Comprobar que todos los productos existen, están activos
    -- y tienen registro de inventario.
    SELECT COUNT(*)
    INTO v_productos_encontrados
    FROM (
        SELECT DISTINCT (elemento->>'producto_id')::UUID AS producto_id
        FROM jsonb_array_elements(p_items) AS elemento
    ) AS solicitados
    INNER JOIN public.productos AS p
        ON p.id = solicitados.producto_id
       AND p.activo = TRUE
    INNER JOIN public.inventario AS i
        ON i.producto_id = p.id;

    IF v_productos_encontrados <> v_productos_solicitados THEN
        RAISE EXCEPTION 'Uno o más productos no están disponibles o no tienen inventario.';
    END IF;

    -- Calcular importes agrupando productos repetidos.
    FOR v_producto IN
        SELECT
            p.id,
            p.codigo,
            p.nombre,
            p.precio,
            p.tasa_impuesto,
            i.existencia,
            SUM((elemento->>'cantidad')::NUMERIC)::NUMERIC(12,3)
                AS cantidad_total
        FROM jsonb_array_elements(p_items) AS elemento
        INNER JOIN public.productos AS p
            ON p.id = (elemento->>'producto_id')::UUID
        INNER JOIN public.inventario AS i
            ON i.producto_id = p.id
        GROUP BY
            p.id,
            p.codigo,
            p.nombre,
            p.precio,
            p.tasa_impuesto,
            i.existencia
        ORDER BY p.id
    LOOP
        IF v_producto.existencia < v_producto.cantidad_total THEN
            RAISE EXCEPTION
                'Existencia insuficiente para %. Disponible: %, solicitado: %.',
                v_producto.nombre,
                v_producto.existencia,
                v_producto.cantidad_total;
        END IF;

        v_subtotal_linea :=
            ROUND(v_producto.precio * v_producto.cantidad_total, 2);

        v_impuesto_linea :=
            ROUND(
                v_subtotal_linea * v_producto.tasa_impuesto / 100,
                2
            );

        v_subtotal := v_subtotal + v_subtotal_linea;
        v_impuesto := v_impuesto + v_impuesto_linea;
    END LOOP;

    v_total := v_subtotal + v_impuesto;

    IF ROUND(v_total_no_efectivo, 2) > ROUND(v_total, 2) THEN
        RAISE EXCEPTION
            'Los pagos no efectivos no pueden superar el total de la venta.';
    END IF;

    IF ROUND(v_total_pagado, 2) <> ROUND(v_total, 2) THEN
        RAISE EXCEPTION
            'Los pagos aplicados (%) no coinciden con el total de la venta (%).',
            v_total_pagado,
            v_total;
    END IF;

    v_cambio := v_efectivo_recibido - v_efectivo;

    IF v_cambio < 0 THEN
        RAISE EXCEPTION 'El cambio calculado no puede ser negativo.';
    END IF;

    -- Crear la venta.
    INSERT INTO public.ventas (
        caja_id,
        usuario_id,
        cliente_nombre,
        subtotal,
        impuesto,
        total,
        cambio_devuelto,
        observaciones
    )
    VALUES (
        p_caja_id,
        v_usuario,
        NULLIF(pg_catalog.btrim(p_cliente_nombre), ''),
        v_subtotal,
        v_impuesto,
        v_total,
        v_cambio,
        NULLIF(pg_catalog.btrim(p_observaciones), '')
    )
    RETURNING id, numero
    INTO v_venta_id, v_numero;

    -- Guardar un detalle por producto y descontar la cantidad agrupada.
    FOR v_producto IN
        SELECT
            p.id,
            p.codigo,
            p.nombre,
            p.precio,
            p.tasa_impuesto,
            i.existencia,
            SUM((elemento->>'cantidad')::NUMERIC)::NUMERIC(12,3)
                AS cantidad_total
        FROM jsonb_array_elements(p_items) AS elemento
        INNER JOIN public.productos AS p
            ON p.id = (elemento->>'producto_id')::UUID
        INNER JOIN public.inventario AS i
            ON i.producto_id = p.id
        GROUP BY
            p.id,
            p.codigo,
            p.nombre,
            p.precio,
            p.tasa_impuesto,
            i.existencia
        ORDER BY p.id
    LOOP
        v_subtotal_linea :=
            ROUND(v_producto.precio * v_producto.cantidad_total, 2);

        v_impuesto_linea :=
            ROUND(
                v_subtotal_linea * v_producto.tasa_impuesto / 100,
                2
            );

        v_existencia_anterior := v_producto.existencia;

        INSERT INTO public.venta_detalles (
            venta_id,
            producto_id,
            codigo_producto,
            nombre_producto,
            cantidad,
            precio_unitario,
            tasa_impuesto,
            subtotal,
            impuesto,
            total
        )
        VALUES (
            v_venta_id,
            v_producto.id,
            v_producto.codigo,
            v_producto.nombre,
            v_producto.cantidad_total,
            v_producto.precio,
            v_producto.tasa_impuesto,
            v_subtotal_linea,
            v_impuesto_linea,
            v_subtotal_linea + v_impuesto_linea
        );

        UPDATE public.inventario
        SET existencia = existencia - v_producto.cantidad_total,
            actualizado_en = NOW()
        WHERE producto_id = v_producto.id;

        INSERT INTO public.inventario_movimientos (
            producto_id,
            usuario_id,
            tipo,
            cantidad,
            existencia_anterior,
            existencia_nueva,
            referencia_id,
            motivo
        )
        VALUES (
            v_producto.id,
            v_usuario,
            'venta',
            v_producto.cantidad_total,
            v_existencia_anterior,
            v_existencia_anterior - v_producto.cantidad_total,
            v_venta_id,
            'Salida por venta POS'
        );
    END LOOP;

    -- Registrar pagos. No guardar referencias de tarjeta.
    FOR v_pago IN
        SELECT value
        FROM jsonb_array_elements(p_pagos)
    LOOP
        INSERT INTO public.venta_pagos (
            venta_id,
            metodo,
            monto,
            monto_recibido,
            referencia
        )
        VALUES (
            v_venta_id,
            v_pago->>'metodo',
            (v_pago->>'monto')::NUMERIC,
            COALESCE(
                (v_pago->>'monto_recibido')::NUMERIC,
                (v_pago->>'monto')::NUMERIC
            ),
            CASE
                WHEN v_pago->>'metodo' IN ('transferencia', 'otro')
                THEN NULLIF(
                    pg_catalog.left(
                        pg_catalog.btrim(v_pago->>'referencia'),
                        100
                    ),
                    ''
                )
                ELSE NULL
            END
        );
    END LOOP;

    -- El efectivo cobrado ingresa a la caja.
    IF v_efectivo > 0 THEN
        INSERT INTO public.caja_movimientos (
            caja_id,
            usuario_id,
            tipo,
            monto,
            descripcion,
            referencia_id
        )
        VALUES (
            p_caja_id,
            v_usuario,
            'venta_efectivo',
            v_efectivo,
            'Cobro en efectivo de venta POS',
            v_venta_id
        );
    END IF;

        INSERT INTO public.auditoria_operaciones (
        actor_id, entidad, entidad_id, accion, datos
    )
    VALUES (
        v_usuario,
        'venta',
        v_venta_id,
        'venta_creada',
        jsonb_build_object(
            'numero', v_numero,
            'caja_id', p_caja_id,
            'subtotal', v_subtotal,
            'impuesto', v_impuesto,
            'total', v_total,
            'efectivo_aplicado', v_efectivo,
            'efectivo_recibido', v_efectivo_recibido,
            'cambio_devuelto', v_cambio
        )
    );

    RETURN jsonb_build_object(
        'venta_id', v_venta_id,
        'numero', v_numero,
        'subtotal', v_subtotal,
        'impuesto', v_impuesto,
        'total', v_total,
        'cambio_devuelto', v_cambio,
        'estado', 'completada'
    );
END;
$$;
COMMIT;