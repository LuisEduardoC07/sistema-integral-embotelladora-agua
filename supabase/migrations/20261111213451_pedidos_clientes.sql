-- ============================================================
-- AQUACONTROL: PEDIDOS DE CLIENTES
-- Creacion de pedidos, detalles, seguridad y seguimiento.
-- Los pedidos no crean ventas ni descuentan inventario.
-- ============================================================

CREATE TABLE public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
    cliente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    cliente_nombre TEXT NOT NULL,
    cliente_email TEXT NOT NULL,
    cliente_telefono TEXT,
    direccion_entrega TEXT NOT NULL,
    fecha_entrega DATE NOT NULL,
    hora_entrega TIME NOT NULL,
    observaciones TEXT,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    impuesto NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    gestionado_por UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    gestionado_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pedidos_direccion_no_vacia
        CHECK (length(trim(direccion_entrega)) > 0),
    CONSTRAINT pedidos_nombre_no_vacio
        CHECK (length(trim(cliente_nombre)) > 0),
    CONSTRAINT pedidos_email_no_vacio
        CHECK (length(trim(cliente_email)) > 0),

    CONSTRAINT pedidos_importes_no_negativos
        CHECK (subtotal >= 0 AND impuesto >= 0 AND total >= 0),
    CONSTRAINT pedidos_estado_valido
        CHECK (estado IN (
            'pendiente',
            'confirmado',
            'en_preparacion',
            'en_camino',
            'entregado',
            'cancelado'
        ))
);

CREATE TABLE public.pedido_detalles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
    codigo_producto TEXT NOT NULL,
    nombre_producto TEXT NOT NULL,
    unidad TEXT NOT NULL,
    cantidad NUMERIC(12,3) NOT NULL,
    precio_unitario NUMERIC(12,2) NOT NULL,
    tasa_impuesto NUMERIC(5,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12,2) NOT NULL,
    impuesto NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pedido_detalles_cantidad_positiva
        CHECK (cantidad > 0),
    CONSTRAINT pedido_detalles_precio_no_negativo
        CHECK (precio_unitario >= 0),
    CONSTRAINT pedido_detalles_impuesto_valido
        CHECK (tasa_impuesto >= 0 AND tasa_impuesto <= 100),
    CONSTRAINT pedido_detalles_importes_no_negativos
        CHECK (subtotal >= 0 AND impuesto >= 0 AND total >= 0),
    CONSTRAINT pedido_detalles_producto_unico
        UNIQUE (pedido_id, producto_id)
);

CREATE INDEX pedidos_cliente_fecha_idx
    ON public.pedidos (cliente_id, creado_en DESC, id DESC);

CREATE INDEX pedidos_estado_fecha_idx
    ON public.pedidos (estado, creado_en DESC, id DESC);

CREATE INDEX pedido_detalles_pedido_idx
    ON public.pedido_detalles (pedido_id);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_detalles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.pedidos TO authenticated;
GRANT SELECT ON public.pedido_detalles TO authenticated;

CREATE POLICY pedidos_consultar_propios
ON public.pedidos
FOR SELECT
TO authenticated
USING (
    cliente_id = (SELECT auth.uid())
    AND public.tiene_permiso('pedidos.consultar_propios')
);

CREATE POLICY pedidos_consultar_personal
ON public.pedidos
FOR SELECT
TO authenticated
USING (
    public.tiene_permiso('pedidos.consultar')
);

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
              OR public.tiene_permiso('pedidos.consultar')
          )
    )
);

-- ------------------------------------------------------------
-- Crear pedido desde la tienda.
-- Los precios, nombres e impuestos se obtienen de productos.
-- No se consulta ni modifica inventario.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pedidos_crear(
    p_items JSONB,
    p_direccion TEXT,
    p_fecha_entrega DATE,
    p_hora_entrega TIME,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_usuario UUID := auth.uid();
    v_perfil RECORD;
    v_item RECORD;
    v_producto RECORD;
    v_pedido_id UUID;
    v_cantidad NUMERIC(12,3);
    v_subtotal NUMERIC(12,2) := 0;
    v_impuesto NUMERIC(12,2) := 0;
    v_total NUMERIC(12,2) := 0;
    v_linea_subtotal NUMERIC(12,2);
    v_linea_impuesto NUMERIC(12,2);
    v_linea_total NUMERIC(12,2);
    v_cantidad_items BIGINT;
    v_productos_distintos BIGINT;
    v_email TEXT;
BEGIN
    IF v_usuario IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión para realizar un pedido.';
    END IF;

    SELECT
        pr.id,
        pr.nombre,
        pr.telefono,
        pr.estado,
        r.codigo AS rol
    INTO v_perfil
    FROM public.profiles pr
    JOIN public.roles r ON r.id = pr.rol_id
    WHERE pr.id = v_usuario;

    IF NOT FOUND
       OR v_perfil.estado <> 'activo'
       OR v_perfil.rol <> 'cliente' THEN
        RAISE EXCEPTION 'La cuenta no está habilitada para realizar pedidos.';
    END IF;

    IF p_items IS NULL
       OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
       OR jsonb_array_length(p_items) = 0
       OR jsonb_array_length(p_items) > 50 THEN
        RAISE EXCEPTION 'El carrito debe contener entre 1 y 50 productos.';
    END IF;

    IF p_direccion IS NULL OR length(trim(p_direccion)) < 5 THEN
        RAISE EXCEPTION 'Debes indicar una dirección de entrega válida.';
    END IF;

    IF p_fecha_entrega IS NULL
       OR p_fecha_entrega < (now() AT TIME ZONE 'America/Santo_Domingo')::date THEN
        RAISE EXCEPTION 'La fecha de entrega no puede estar en el pasado.';
    END IF;

    IF p_hora_entrega IS NULL THEN
        RAISE EXCEPTION 'Debes indicar la hora solicitada.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_items) AS item(value)
        WHERE jsonb_typeof(item.value) <> 'object'
           OR item.value->>'producto_id' IS NULL
           OR item.value->>'cantidad' IS NULL
           OR (item.value->>'producto_id') !~*
              '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ) THEN
        RAISE EXCEPTION 'El carrito contiene productos o cantidades inválidas.';
    END IF;

    SELECT
        count(*),
        count(DISTINCT value->>'producto_id')
    INTO v_cantidad_items, v_productos_distintos
    FROM jsonb_array_elements(p_items);

    IF v_cantidad_items <> v_productos_distintos THEN
        RAISE EXCEPTION 'El carrito contiene productos repetidos.';
    END IF;

    SELECT u.email
    INTO v_email
    FROM auth.users u
    WHERE u.id = v_usuario;

    IF v_email IS NULL THEN
        RAISE EXCEPTION 'No se pudo verificar el correo de la cuenta.';
    END IF;

    INSERT INTO public.pedidos (
        cliente_id,
        cliente_nombre,
        cliente_email,
        cliente_telefono,
        direccion_entrega,
        fecha_entrega,
        hora_entrega,
        observaciones
    )
    SELECT
        v_usuario,
        pr.nombre,
        v_email,
        pr.telefono,
        trim(p_direccion),
        p_fecha_entrega,
        p_hora_entrega,
        NULLIF(trim(COALESCE(p_observaciones, '')), '')
    FROM public.profiles pr
    JOIN auth.users u ON u.id = pr.id
    WHERE pr.id = v_usuario
    RETURNING id INTO v_pedido_id;

    FOR v_item IN
        SELECT value
        FROM jsonb_array_elements(p_items)
    LOOP
        BEGIN
            v_cantidad := (v_item.value->>'cantidad')::NUMERIC;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE EXCEPTION 'Una cantidad del carrito no es válida.';
        END;

        IF v_cantidad IS NULL OR v_cantidad <= 0 OR v_cantidad > 9999 THEN
            RAISE EXCEPTION 'Las cantidades deben ser mayores que cero y no exceder 9999.';
        END IF;

        SELECT
            pr.id,
            pr.codigo,
            pr.nombre,
            pr.unidad,
            pr.precio,
            pr.tasa_impuesto
        INTO v_producto
        FROM public.productos pr
        WHERE pr.id = (v_item.value->>'producto_id')::UUID
          AND pr.activo IS TRUE
        FOR SHARE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Uno de los productos solicitados ya no está disponible.';
        END IF;

        v_linea_subtotal := round(v_producto.precio * v_cantidad, 2);
        v_linea_impuesto := round(
            v_linea_subtotal * v_producto.tasa_impuesto / 100,
            2
        );
        v_linea_total := v_linea_subtotal + v_linea_impuesto;

        INSERT INTO public.pedido_detalles (
            pedido_id,
            producto_id,
            codigo_producto,
            nombre_producto,
            unidad,
            cantidad,
            precio_unitario,
            tasa_impuesto,
            subtotal,
            impuesto,
            total
        )
        VALUES (
            v_pedido_id,
            v_producto.id,
            v_producto.codigo,
            v_producto.nombre,
            v_producto.unidad,
            v_cantidad,
            v_producto.precio,
            v_producto.tasa_impuesto,
            v_linea_subtotal,
            v_linea_impuesto,
            v_linea_total
        );

        v_subtotal := v_subtotal + v_linea_subtotal;
        v_impuesto := v_impuesto + v_linea_impuesto;
        v_total := v_total + v_linea_total;
    END LOOP;

    UPDATE public.pedidos
    SET
        subtotal = v_subtotal,
        impuesto = v_impuesto,
        total = v_total,
        actualizado_en = now()
    WHERE id = v_pedido_id;

    RETURN v_pedido_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.pedidos_crear(JSONB, TEXT, DATE, TIME, TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.pedidos_crear(JSONB, TEXT, DATE, TIME, TEXT)
TO authenticated;

-- ------------------------------------------------------------
-- Actualizar estado de un pedido por personal autorizado.
-- ------------------------------------------------------------

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
BEGIN
    IF v_usuario IS NULL
       OR NOT public.tiene_permiso('pedidos.gestionar') THEN
        RAISE EXCEPTION 'No tienes permiso para gestionar pedidos.';
    END IF;

    IF p_estado IS NULL OR p_estado NOT IN (
        'pendiente',
        'confirmado',
        'en_preparacion',
        'en_camino',
        'entregado',
        'cancelado'
    ) THEN
        RAISE EXCEPTION 'El estado solicitado no es válido.';
    END IF;

    SELECT estado
    INTO v_estado_actual
    FROM public.pedidos
    WHERE id = p_pedido_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pedido no existe.';
    END IF;

    IF v_estado_actual IN ('entregado', 'cancelado') THEN
        RAISE EXCEPTION 'No se puede modificar un pedido finalizado.';
    END IF;

    UPDATE public.pedidos
    SET
        estado = p_estado,
        gestionado_por = v_usuario,
        gestionado_en = now(),
        actualizado_en = now()
    WHERE id = p_pedido_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.pedidos_actualizar_estado(UUID, TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.pedidos_actualizar_estado(UUID, TEXT)
TO authenticated;