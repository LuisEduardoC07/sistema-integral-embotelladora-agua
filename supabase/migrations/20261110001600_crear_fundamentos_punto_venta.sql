-- ============================================================
-- MODULO 002: PUNTO DE VENTA
-- MIGRACION 016: FUNDAMENTOS OPERATIVOS
-- ============================================================

-- CATEGORIAS
CREATE TABLE public.categorias_producto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT categorias_nombre_no_vacio
        CHECK (length(trim(nombre)) > 0)
);

-- PRODUCTOS
CREATE TABLE public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID REFERENCES public.categorias_producto(id)
        ON DELETE RESTRICT,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    unidad TEXT NOT NULL DEFAULT 'unidad',
    precio NUMERIC(12,2) NOT NULL,
    costo NUMERIC(12,2) NOT NULL DEFAULT 0,
    tasa_impuesto NUMERIC(5,2) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT productos_codigo_no_vacio
        CHECK (length(trim(codigo)) > 0),
    CONSTRAINT productos_nombre_no_vacio
        CHECK (length(trim(nombre)) > 0),
    CONSTRAINT productos_precio_valido
        CHECK (precio >= 0),
    CONSTRAINT productos_costo_valido
        CHECK (costo >= 0),
    CONSTRAINT productos_impuesto_valido
        CHECK (tasa_impuesto >= 0 AND tasa_impuesto <= 100)
);

CREATE INDEX idx_productos_nombre
    ON public.productos USING btree (nombre);

CREATE INDEX idx_productos_categoria
    ON public.productos (categoria_id);

CREATE INDEX idx_productos_activo
    ON public.productos (activo);

-- EXISTENCIAS
CREATE TABLE public.inventario (
    producto_id UUID PRIMARY KEY
        REFERENCES public.productos(id) ON DELETE RESTRICT,
    existencia NUMERIC(12,3) NOT NULL DEFAULT 0,
    existencia_minima NUMERIC(12,3) NOT NULL DEFAULT 0,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT inventario_existencia_no_negativa
        CHECK (existencia >= 0),
    CONSTRAINT inventario_minimo_no_negativo
        CHECK (existencia_minima >= 0)
);

-- CAJAS
CREATE TABLE public.cajas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE RESTRICT,
    estado TEXT NOT NULL DEFAULT 'abierta',
    monto_apertura NUMERIC(12,2) NOT NULL,
    monto_cierre NUMERIC(12,2),
    monto_esperado NUMERIC(12,2),
    diferencia NUMERIC(12,2),
    observaciones TEXT,
    abierta_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cerrada_en TIMESTAMPTZ,

    CONSTRAINT cajas_estado_valido
        CHECK (estado IN ('abierta', 'cerrada')),
    CONSTRAINT cajas_apertura_valida
        CHECK (monto_apertura >= 0),
    CONSTRAINT cajas_cierre_valido
        CHECK (monto_cierre IS NULL OR monto_cierre >= 0)
);

CREATE UNIQUE INDEX idx_cajas_usuario_abierta
    ON public.cajas (usuario_id)
    WHERE estado = 'abierta';

CREATE INDEX idx_cajas_fecha
    ON public.cajas (abierta_en DESC);

-- MOVIMIENTOS DE CAJA
CREATE TABLE public.caja_movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_id UUID NOT NULL REFERENCES public.cajas(id)
        ON DELETE RESTRICT,
    usuario_id UUID NOT NULL REFERENCES public.profiles(id)
        ON DELETE RESTRICT,
    tipo TEXT NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    descripcion TEXT,
    referencia_id UUID,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT caja_movimiento_tipo_valido
        CHECK (tipo IN (
            'apertura',
            'entrada',
            'salida',
            'venta_efectivo'
        )),
    CONSTRAINT caja_movimiento_monto_positivo
        CHECK (monto > 0)
);

CREATE INDEX idx_caja_movimientos_caja
    ON public.caja_movimientos (caja_id, creado_en DESC);

-- VENTAS
CREATE SEQUENCE public.ventas_numero_seq START 1;

CREATE TABLE public.ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero BIGINT NOT NULL UNIQUE
        DEFAULT nextval('public.ventas_numero_seq'),
    caja_id UUID NOT NULL REFERENCES public.cajas(id)
        ON DELETE RESTRICT,
    usuario_id UUID NOT NULL REFERENCES public.profiles(id)
        ON DELETE RESTRICT,
    cliente_nombre TEXT,
    subtotal NUMERIC(12,2) NOT NULL,
    descuento NUMERIC(12,2) NOT NULL DEFAULT 0,
    impuesto NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL,
    estado TEXT NOT NULL DEFAULT 'completada',
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ventas_estado_valido
        CHECK (estado IN ('completada', 'anulada')),
    CONSTRAINT ventas_importes_validos
        CHECK (
            subtotal >= 0
            AND descuento >= 0
            AND impuesto >= 0
            AND total >= 0
        )
);

CREATE INDEX idx_ventas_fecha
    ON public.ventas (creado_en DESC);

CREATE INDEX idx_ventas_usuario
    ON public.ventas (usuario_id);

CREATE INDEX idx_ventas_caja
    ON public.ventas (caja_id);

-- DETALLES: CONSERVAN EL PRECIO HISTORICO
CREATE TABLE public.venta_detalles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id)
        ON DELETE RESTRICT,
    producto_id UUID NOT NULL REFERENCES public.productos(id)
        ON DELETE RESTRICT,
    codigo_producto TEXT NOT NULL,
    nombre_producto TEXT NOT NULL,
    cantidad NUMERIC(12,3) NOT NULL,
    precio_unitario NUMERIC(12,2) NOT NULL,
    tasa_impuesto NUMERIC(5,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12,2) NOT NULL,
    impuesto NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL,

    CONSTRAINT venta_detalle_cantidad_positiva
        CHECK (cantidad > 0),
    CONSTRAINT venta_detalle_importes_validos
        CHECK (
            precio_unitario >= 0
            AND subtotal >= 0
            AND impuesto >= 0
            AND total >= 0
        )
);

CREATE INDEX idx_venta_detalles_venta
    ON public.venta_detalles (venta_id);

-- PAGOS
CREATE TABLE public.venta_pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id)
        ON DELETE RESTRICT,
    metodo TEXT NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    referencia TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT venta_pago_metodo_valido
        CHECK (metodo IN (
            'efectivo',
            'tarjeta',
            'transferencia',
            'otro'
        )),
    CONSTRAINT venta_pago_monto_positivo
        CHECK (monto > 0)
);

CREATE INDEX idx_venta_pagos_venta
    ON public.venta_pagos (venta_id);

-- MOVIMIENTOS DE INVENTARIO
CREATE TABLE public.inventario_movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES public.productos(id)
        ON DELETE RESTRICT,
    usuario_id UUID NOT NULL REFERENCES public.profiles(id)
        ON DELETE RESTRICT,
    tipo TEXT NOT NULL,
    cantidad NUMERIC(12,3) NOT NULL,
    existencia_anterior NUMERIC(12,3) NOT NULL,
    existencia_nueva NUMERIC(12,3) NOT NULL,
    referencia_id UUID,
    motivo TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT inventario_movimiento_tipo_valido
        CHECK (tipo IN (
            'entrada',
            'salida',
            'venta',
            'ajuste',
            'anulacion'
        )),
    CONSTRAINT inventario_movimiento_cantidad_positiva
        CHECK (cantidad > 0)
);

CREATE INDEX idx_inventario_movimientos_producto
    ON public.inventario_movimientos (producto_id, creado_en DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- ============================================================
-- ÍNDICES OPERATIVOS Y GARANTÍAS DE INTEGRIDAD
-- ============================================================

-- Un usuario no puede tener dos cajas abiertas simultáneamente.
-- Consultas de movimientos y cierres de caja.
CREATE INDEX idx_caja_movimientos_caja_creado
    ON public.caja_movimientos (caja_id, creado_en);

-- Consultas del historial de ventas.
CREATE INDEX idx_ventas_caja_creado
    ON public.ventas (caja_id, creado_en DESC);

CREATE INDEX idx_ventas_usuario_creado
    ON public.ventas (usuario_id, creado_en DESC);

-- Detalles, pagos y movimientos de inventario.

CREATE INDEX idx_venta_detalles_producto
    ON public.venta_detalles (producto_id);


CREATE INDEX idx_inventario_movimientos_producto_creado
    ON public.inventario_movimientos (producto_id, creado_en DESC);

-- Catálogo por categoría.
CREATE INDEX idx_productos_categoria_activo
    ON public.productos (categoria_id, activo);

ALTER TABLE public.categorias_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_movimientos ENABLE ROW LEVEL SECURITY;

-- No se permiten escrituras directas desde el cliente.
REVOKE ALL ON TABLE
    public.categorias_producto,
    public.productos,
    public.inventario,
    public.cajas,
    public.caja_movimientos,
    public.ventas,
    public.venta_detalles,
    public.venta_pagos,
    public.inventario_movimientos
FROM PUBLIC, anon, authenticated;

-- Consultas del catálogo para usuarios con permiso.
GRANT SELECT ON TABLE
    public.categorias_producto,
    public.productos,
    public.inventario
TO authenticated;

CREATE POLICY categorias_consultar_autorizado
ON public.categorias_producto
FOR SELECT TO authenticated
USING (
    activa
    AND public.tiene_permiso('productos.consultar')
);

CREATE POLICY productos_consultar_autorizado
ON public.productos
FOR SELECT TO authenticated
USING (
    activo
    AND public.tiene_permiso('productos.consultar')
);

CREATE POLICY inventario_consultar_autorizado
ON public.inventario
FOR SELECT TO authenticated
USING (
    public.tiene_permiso('inventario.consultar')
);

-- ============================================================
-- FUNCION: ABRIR CAJA
-- ============================================================

CREATE OR REPLACE FUNCTION public.pos_abrir_caja(
    p_monto_apertura NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_usuario UUID;
    v_caja_id UUID;
BEGIN
    v_usuario := auth.uid();

    IF v_usuario IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = v_usuario
          AND estado = 'activo'
    ) THEN
        RAISE EXCEPTION 'El perfil no está activo.';
    END IF;

    IF NOT public.tiene_permiso('caja.abrir_propia') THEN
        RAISE EXCEPTION 'No tienes permiso para abrir una caja.';
    END IF;

    IF p_monto_apertura IS NULL
       OR p_monto_apertura < 0
       OR p_monto_apertura::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
        RAISE EXCEPTION 'El monto de apertura no es válido.';
    END IF;

    IF p_monto_apertura <> ROUND(p_monto_apertura, 2) THEN
        RAISE EXCEPTION 'El monto de apertura admite máximo dos decimales.';
    END IF;

    -- El índice único parcial es la garantía definitiva
    -- frente a solicitudes simultáneas.
    BEGIN
        INSERT INTO public.cajas (
            usuario_id,
            monto_apertura
        )
        VALUES (
            v_usuario,
            p_monto_apertura
        )
        RETURNING id INTO v_caja_id;

    EXCEPTION
        WHEN unique_violation THEN
            RAISE EXCEPTION
                'Ya tienes una caja abierta. Debes cerrarla antes de abrir otra.';
    END;

    IF p_monto_apertura > 0 THEN
        INSERT INTO public.caja_movimientos (
            caja_id,
            usuario_id,
            tipo,
            monto,
            descripcion
        )
        VALUES (
            v_caja_id,
            v_usuario,
            'apertura',
            p_monto_apertura,
            'Monto inicial de caja'
        );
    END IF;

        INSERT INTO public.auditoria_operaciones (
        actor_id, entidad, entidad_id, accion, datos
    )
    VALUES (
        v_usuario,
        'caja',
        v_caja_id,
        'caja_abierta',
        jsonb_build_object(
            'monto_apertura', p_monto_apertura
        )
    );

    RETURN jsonb_build_object(
        'caja_id', v_caja_id,
        'estado', 'abierta',
        'monto_apertura', p_monto_apertura
    );
END;
$$;

-- ============================================================
-- FUNCION: REGISTRAR MOVIMIENTO MANUAL DE CAJA
-- ============================================================

CREATE OR REPLACE FUNCTION public.pos_registrar_movimiento_caja(
    p_caja_id UUID,
    p_tipo TEXT,
    p_monto NUMERIC,
    p_descripcion TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_usuario UUID;
    v_movimiento_id UUID;
BEGIN
    v_usuario := auth.uid();

    IF v_usuario IS NULL
       OR NOT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = v_usuario AND estado = 'activo'
       ) THEN
        RAISE EXCEPTION 'Perfil no autorizado.';
    END IF;

    IF NOT public.tiene_permiso('caja.registrar_movimiento_propio') THEN
        RAISE EXCEPTION 'No tienes permiso para registrar movimientos.';
    END IF;

    IF p_tipo IS NULL
       OR p_tipo NOT IN ('entrada', 'salida')
       OR p_monto IS NULL
       OR p_monto <= 0
       OR p_monto::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
        RAISE EXCEPTION 'El movimiento no es válido.';
    END IF;

    IF p_monto <> ROUND(p_monto, 2) THEN
        RAISE EXCEPTION 'El movimiento admite máximo dos decimales.';
    END IF;

    PERFORM 1
    FROM public.cajas
    WHERE id = p_caja_id
      AND usuario_id = v_usuario
      AND estado = 'abierta'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe una caja abierta propia con ese identificador.';
    END IF;

    INSERT INTO public.caja_movimientos (
        caja_id,
        usuario_id,
        tipo,
        monto,
        descripcion
    )
    VALUES (
        p_caja_id,
        v_usuario,
        p_tipo,
        p_monto,
        NULLIF(pg_catalog.btrim(p_descripcion), '')
    )
    RETURNING id INTO v_movimiento_id;

        INSERT INTO public.auditoria_operaciones (
        actor_id, entidad, entidad_id, accion, datos
    )
    VALUES (
        v_usuario,
        'caja_movimiento',
        v_movimiento_id,
        'movimiento_caja_registrado',
        jsonb_build_object(
            'caja_id', p_caja_id,
            'tipo', p_tipo,
            'monto', p_monto
        )
    );

    RETURN jsonb_build_object(
        'movimiento_id', v_movimiento_id,
        'tipo', p_tipo,
        'monto', p_monto
    );
END;
$$;

-- ============================================================
-- FUNCION: CONFIRMAR VENTA ATOMICAMENTE
-- El precio y el impuesto se leen desde la base de datos.
-- ============================================================

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
            RAISE EXCEPTION 'Importe de pago no válido.';
        END IF;

        v_importe := (v_pago->>'monto')::NUMERIC;

        IF v_importe <= 0 THEN
            RAISE EXCEPTION 'El importe de pago debe ser positivo.';
        END IF;

        v_total_pagado := v_total_pagado + v_importe;

        IF v_pago->>'metodo' = 'efectivo' THEN
            v_efectivo := v_efectivo + v_importe;
        END IF;
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

    IF ROUND(v_total_pagado, 2) <> ROUND(v_total, 2) THEN
        RAISE EXCEPTION
            'Los pagos (%) no coinciden con el total de la venta (%).',
            v_total_pagado,
            v_total;
    END IF;

    -- Crear la venta.
    INSERT INTO public.ventas (
        caja_id,
        usuario_id,
        cliente_nombre,
        subtotal,
        impuesto,
        total,
        observaciones
    )
    VALUES (
        p_caja_id,
        v_usuario,
        NULLIF(pg_catalog.btrim(p_cliente_nombre), ''),
        v_subtotal,
        v_impuesto,
        v_total,
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
            referencia
        )
        VALUES (
            v_venta_id,
            v_pago->>'metodo',
            (v_pago->>'monto')::NUMERIC,
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
            'efectivo', v_efectivo
        )
    );

    RETURN jsonb_build_object(
        'venta_id', v_venta_id,
        'numero', v_numero,
        'subtotal', v_subtotal,
        'impuesto', v_impuesto,
        'total', v_total,
        'estado', 'completada'
    );
END;
$$;

-- ============================================================
-- FUNCION: CERRAR CAJA
-- ============================================================

CREATE OR REPLACE FUNCTION public.pos_cerrar_caja(
    p_caja_id UUID,
    p_monto_cierre NUMERIC,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_usuario UUID;
    v_monto_apertura NUMERIC(12,2);
    v_esperado NUMERIC(12,2);
    v_diferencia NUMERIC(12,2);
BEGIN
    v_usuario := auth.uid();

    IF v_usuario IS NULL
       OR NOT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = v_usuario AND estado = 'activo'
       ) THEN
        RAISE EXCEPTION 'Perfil no autorizado.';
    END IF;

    IF NOT public.tiene_permiso('caja.cerrar_propia') THEN
        RAISE EXCEPTION 'No tienes permiso para cerrar caja.';
    END IF;

    IF p_monto_cierre IS NULL
       OR p_monto_cierre < 0
       OR p_monto_cierre::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
        RAISE EXCEPTION 'El monto de cierre no es válido.';
    END IF;

    IF p_monto_cierre <> ROUND(p_monto_cierre, 2) THEN
        RAISE EXCEPTION 'El monto de cierre admite máximo dos decimales.';
    END IF;

    SELECT monto_apertura
    INTO v_monto_apertura
    FROM public.cajas
    WHERE id = p_caja_id
      AND usuario_id = v_usuario
      AND estado = 'abierta'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe una caja abierta propia.';
    END IF;

    SELECT
        v_monto_apertura
        + COALESCE(SUM(
            CASE
                WHEN tipo IN ('entrada', 'venta_efectivo') THEN monto
                WHEN tipo IN ('salida', 'devolucion_efectivo') THEN -monto
                ELSE 0
            END
        ), 0)
    INTO v_esperado
    FROM public.caja_movimientos
    WHERE caja_id = p_caja_id;

    v_diferencia := p_monto_cierre - v_esperado;

    UPDATE public.cajas
    SET estado = 'cerrada',
        monto_cierre = p_monto_cierre,
        monto_esperado = v_esperado,
        diferencia = v_diferencia,
        observaciones = NULLIF(pg_catalog.btrim(p_observaciones), ''),
        cerrada_en = NOW()
    WHERE id = p_caja_id;

        INSERT INTO public.auditoria_operaciones (
        actor_id, entidad, entidad_id, accion, datos
    )
    VALUES (
        v_usuario,
        'caja',
        p_caja_id,
        'caja_cerrada',
        jsonb_build_object(
            'monto_esperado', v_esperado,
            'monto_cierre', p_monto_cierre,
            'diferencia', v_diferencia
        )
    );

    RETURN jsonb_build_object(
        'caja_id', p_caja_id,
        'monto_esperado', v_esperado,
        'monto_cierre', p_monto_cierre,
        'diferencia', v_diferencia,
        'estado', 'cerrada'
    );
END;
$$;

-- ============================================================
-- PERMISOS DE EJECUCION RPC
-- ============================================================

REVOKE ALL ON FUNCTION public.pos_abrir_caja(NUMERIC)
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.pos_registrar_movimiento_caja(UUID, TEXT, NUMERIC, TEXT)
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.pos_confirmar_venta(UUID, JSONB, JSONB, TEXT, TEXT)
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.pos_cerrar_caja(UUID, NUMERIC, TEXT)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.pos_abrir_caja(NUMERIC)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.pos_registrar_movimiento_caja(UUID, TEXT, NUMERIC, TEXT)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.pos_confirmar_venta(UUID, JSONB, JSONB, TEXT, TEXT)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.pos_cerrar_caja(UUID, NUMERIC, TEXT)
TO authenticated;

-- El superusuario obtiene los nuevos permisos por la
-- función tiene_permiso(), que le concede acceso global.
-- No se asignan permisos nuevos a otros roles en esta fase.

COMMENT ON TABLE public.productos IS
'Catalogo comercial de productos de la embotelladora.';

COMMENT ON TABLE public.inventario IS
'Existencias actuales. Las salidas por venta se realizan transaccionalmente.';

COMMENT ON TABLE public.cajas IS
'Turnos de caja con apertura, movimientos y cierre.';

COMMENT ON TABLE public.ventas IS
'Ventas confirmadas por el punto de venta.';

COMMENT ON TABLE public.venta_detalles IS
'Detalle histórico de ventas con precio e impuesto congelados.';

COMMENT ON TABLE public.venta_pagos IS
'Pagos asociados a ventas, con soporte de pagos mixtos.';

COMMENT ON TABLE public.inventario_movimientos IS
'Historial de movimientos de inventario.';

COMMENT ON FUNCTION public.pos_confirmar_venta(UUID, JSONB, JSONB, TEXT, TEXT) IS
'Confirma una venta en una sola transacción: valida caja, precios, pagos y existencias, registra venta y descuenta inventario.';

-- ============================================================
-- MIGRACION 016 - AUDITORIA FINANCIERA Y ANULACION
-- ============================================================

-- Permiso de consulta exclusivo para superusuario en esta fase.
INSERT INTO public.permisos (
    codigo,
    nombre,
    descripcion,
    modulo
)
VALUES (
    'auditoria.operaciones.consultar',
    'Consultar auditoría de operaciones',
    'Consultar eventos financieros y operativos inmutables.',
    'auditoria'
)
ON CONFLICT (codigo) DO NOTHING;

-- Datos de anulación conservados en la venta.
ALTER TABLE public.ventas
    ADD COLUMN anulada_por UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    ADD COLUMN anulada_en TIMESTAMPTZ,
    ADD COLUMN motivo_anulacion TEXT;

-- El movimiento compensatorio de efectivo es una salida.
ALTER TABLE public.caja_movimientos
    DROP CONSTRAINT caja_movimiento_tipo_valido;

ALTER TABLE public.caja_movimientos
    ADD CONSTRAINT caja_movimiento_tipo_valido
    CHECK (tipo IN (
        'apertura',
        'entrada',
        'salida',
        'venta_efectivo',
        'devolucion_efectivo'
    ));

-- Auditoría financiera independiente de la auditoría de usuarios.
CREATE TABLE public.auditoria_operaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    entidad TEXT NOT NULL,
    entidad_id UUID NOT NULL,
    accion TEXT NOT NULL,
    datos JSONB NOT NULL DEFAULT '{}'::JSONB,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT auditoria_operaciones_entidad_no_vacia
        CHECK (length(pg_catalog.btrim(entidad)) > 0),

    CONSTRAINT auditoria_operaciones_accion_no_vacia
        CHECK (length(pg_catalog.btrim(accion)) > 0),

    CONSTRAINT auditoria_operaciones_datos_objeto
        CHECK (jsonb_typeof(datos) = 'object')
);

CREATE INDEX idx_auditoria_operaciones_entidad
    ON public.auditoria_operaciones (entidad, entidad_id, creado_en DESC);

CREATE INDEX idx_auditoria_operaciones_actor
    ON public.auditoria_operaciones (actor_id, creado_en DESC);

ALTER TABLE public.auditoria_operaciones ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.auditoria_operaciones
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.auditoria_operaciones
TO authenticated;

CREATE POLICY auditoria_operaciones_consulta_autorizada
ON public.auditoria_operaciones
FOR SELECT
TO authenticated
USING (
    public.tiene_permiso('auditoria.operaciones.consultar')
);

-- Función genérica para proteger registros históricos.
CREATE OR REPLACE FUNCTION public.proteger_registro_historico()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION
        'El historial es inmutable. Operación no permitida: %.',
        TG_OP;

    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.proteger_registro_historico()
FROM PUBLIC, anon, authenticated;

-- Auditoría: impedir UPDATE, DELETE y TRUNCATE.
CREATE TRIGGER trg_auditoria_operaciones_inmutable
BEFORE UPDATE OR DELETE
ON public.auditoria_operaciones
FOR EACH ROW
EXECUTE FUNCTION public.proteger_registro_historico();

CREATE TRIGGER trg_auditoria_operaciones_no_truncate
BEFORE TRUNCATE
ON public.auditoria_operaciones
FOR EACH STATEMENT
EXECUTE FUNCTION public.proteger_registro_historico();

-- Los movimientos de caja e inventario también son históricos.
CREATE TRIGGER trg_caja_movimientos_inmutables
BEFORE UPDATE OR DELETE
ON public.caja_movimientos
FOR EACH ROW
EXECUTE FUNCTION public.proteger_registro_historico();

CREATE TRIGGER trg_caja_movimientos_no_truncate
BEFORE TRUNCATE
ON public.caja_movimientos
FOR EACH STATEMENT
EXECUTE FUNCTION public.proteger_registro_historico();

CREATE TRIGGER trg_inventario_movimientos_inmutables
BEFORE UPDATE OR DELETE
ON public.inventario_movimientos
FOR EACH ROW
EXECUTE FUNCTION public.proteger_registro_historico();

CREATE TRIGGER trg_inventario_movimientos_no_truncate
BEFORE TRUNCATE
ON public.inventario_movimientos
FOR EACH STATEMENT
EXECUTE FUNCTION public.proteger_registro_historico();

-- ============================================================
-- FUNCION: ANULAR VENTA
-- ============================================================

CREATE OR REPLACE FUNCTION public.pos_anular_venta(
    p_venta_id UUID,
    p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_usuario UUID;
    v_estado TEXT;
    v_caja_venta UUID;
    v_caja_devolucion UUID;
    v_propietario_caja UUID;
    v_efectivo NUMERIC(12,2);
    v_no_efectivo NUMERIC(12,2);
    v_producto RECORD;
    v_existencia_anterior NUMERIC(12,3);
    v_productos_solicitados INTEGER;
    v_productos_encontrados INTEGER;
    v_venta_numero BIGINT;
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

    IF NOT public.tiene_permiso('ventas.anular') THEN
        RAISE EXCEPTION 'No tienes permiso para anular ventas.';
    END IF;

    IF p_venta_id IS NULL THEN
        RAISE EXCEPTION 'Debes indicar una venta.';
    END IF;

    IF p_motivo IS NULL
       OR pg_catalog.length(pg_catalog.btrim(p_motivo)) = 0
       OR pg_catalog.length(pg_catalog.btrim(p_motivo)) > 500 THEN
        RAISE EXCEPTION 'El motivo es obligatorio y admite máximo 500 caracteres.';
    END IF;

    -- Bloquear la venta: impide dos anulaciones simultáneas.
    SELECT estado, numero, caja_id
    INTO v_estado, v_venta_numero, v_caja_venta
    FROM public.ventas
    WHERE id = p_venta_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La venta indicada no existe.';
    END IF;

    IF v_estado <> 'completada' THEN
        RAISE EXCEPTION 'La venta ya fue anulada o no está disponible.';
    END IF;

    -- Separar el importe en efectivo de los pagos electrónicos.
    SELECT
        COALESCE(
            SUM(monto) FILTER (WHERE metodo = 'efectivo'),
            0
        ),
        COALESCE(
            SUM(monto) FILTER (WHERE metodo <> 'efectivo'),
            0
        )
    INTO v_efectivo, v_no_efectivo
    FROM public.venta_pagos
    WHERE venta_id = p_venta_id;

    -- La devolución se registra en la caja original de la venta.
    IF v_efectivo > 0 THEN
        SELECT id, usuario_id
        INTO v_caja_devolucion, v_propietario_caja
        FROM public.cajas
        WHERE id = v_caja_venta
          AND estado = 'abierta'
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'No se puede devolver el efectivo: la caja original de la venta está cerrada.';
        END IF;

        -- Para intervenir en la caja abierta de otro usuario
        -- se requiere el permiso de gestión global de cajas.
        IF v_propietario_caja <> v_usuario
           AND NOT public.tiene_permiso('caja.gestionar_todas') THEN
            RAISE EXCEPTION
                'No tienes permiso para gestionar la caja original de esta venta.';
        END IF;
    END IF;

    -- Comprobar los detalles y bloquear inventario por producto.
    SELECT COUNT(*)
    INTO v_productos_solicitados
    FROM (
        SELECT DISTINCT producto_id
        FROM public.venta_detalles
        WHERE venta_id = p_venta_id
    ) AS productos_solicitados;

    IF v_productos_solicitados = 0 THEN
        RAISE EXCEPTION 'La venta no tiene detalles para restituir.';
    END IF;

    SELECT COUNT(*)
    INTO v_productos_encontrados
    FROM (
        SELECT DISTINCT producto_id
        FROM public.venta_detalles
        WHERE venta_id = p_venta_id
    ) AS solicitados
    INNER JOIN public.inventario AS i
        ON i.producto_id = solicitados.producto_id;

    IF v_productos_encontrados <> v_productos_solicitados THEN
        RAISE EXCEPTION
            'No se encontró el inventario de todos los productos de la venta.';
    END IF;

    PERFORM i.producto_id
    FROM public.inventario AS i
    WHERE i.producto_id IN (
        SELECT DISTINCT producto_id
        FROM public.venta_detalles
        WHERE venta_id = p_venta_id
    )
    ORDER BY i.producto_id
    FOR UPDATE;

    -- Restituir existencias y registrar cada movimiento compensatorio.
    FOR v_producto IN
        SELECT
            d.producto_id,
            SUM(d.cantidad)::NUMERIC(12,3) AS cantidad_total
        FROM public.venta_detalles AS d
        WHERE d.venta_id = p_venta_id
        GROUP BY d.producto_id
        ORDER BY d.producto_id
    LOOP
        SELECT existencia
        INTO v_existencia_anterior
        FROM public.inventario
        WHERE producto_id = v_producto.producto_id;

        UPDATE public.inventario
        SET existencia = existencia + v_producto.cantidad_total,
            actualizado_en = NOW()
        WHERE producto_id = v_producto.producto_id;

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
            v_producto.producto_id,
            v_usuario,
            'anulacion',
            v_producto.cantidad_total,
            v_existencia_anterior,
            v_existencia_anterior + v_producto.cantidad_total,
            p_venta_id,
            'Restitución por anulación de venta'
        );
    END LOOP;

    -- Registrar la devolución de efectivo como salida de caja.
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
            v_caja_devolucion,
            v_usuario,
            'devolucion_efectivo',
            v_efectivo,
            'Devolución en efectivo por anulación de venta',
            p_venta_id
        );
    END IF;

    -- Conservar pagos originales y marcar la venta como anulada.
    UPDATE public.ventas
    SET estado = 'anulada',
        anulada_por = v_usuario,
        anulada_en = NOW(),
        motivo_anulacion = pg_catalog.left(
            pg_catalog.btrim(p_motivo),
            500
        )
    WHERE id = p_venta_id;

    INSERT INTO public.auditoria_operaciones (
        actor_id,
        entidad,
        entidad_id,
        accion,
        datos
    )
    VALUES (
        v_usuario,
        'venta',
        p_venta_id,
        'venta_anulada',
        jsonb_build_object(
            'numero', v_venta_numero,
            'motivo', pg_catalog.left(pg_catalog.btrim(p_motivo), 500),
            'efectivo_devuelto', v_efectivo,
            'reembolso_electronico_pendiente', v_no_efectivo,
            'caja_devolucion_id', v_caja_devolucion
        )
    );

    RETURN jsonb_build_object(
        'venta_id', p_venta_id,
        'numero', v_venta_numero,
        'estado', 'anulada',
        'efectivo_devuelto', v_efectivo,
        'reembolso_electronico_pendiente', v_no_efectivo
    );
END;
$$;

REVOKE ALL ON FUNCTION public.pos_anular_venta(UUID, TEXT)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.pos_anular_venta(UUID, TEXT)
TO authenticated;

COMMENT ON TABLE public.auditoria_operaciones IS
'Auditoría inmutable de operaciones financieras y comerciales.';

COMMENT ON FUNCTION public.pos_anular_venta(UUID, TEXT) IS
'Anula una venta una sola vez, restituye inventario, registra devolución de efectivo y deja constancia de reembolsos electrónicos pendientes.';
