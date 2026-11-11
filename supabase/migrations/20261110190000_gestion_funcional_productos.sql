-- ============================================================
-- AQUACONTROL
-- MIGRACION: GESTION FUNCIONAL DE PRODUCTOS
-- ============================================================

-- ------------------------------------------------------------
-- 1. LISTAR PRODUCTOS PARA ADMINISTRACION
-- Incluye activos e inactivos. No expone SELECT directo.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.productos_listar_gestion()
RETURNS TABLE (
    id UUID,
    codigo TEXT,
    nombre TEXT,
    descripcion TEXT,
    unidad TEXT,
    precio NUMERIC,
    costo NUMERIC,
    tasa_impuesto NUMERIC,
    activo BOOLEAN,
    imagen_path TEXT,
    existencia NUMERIC,
    existencia_minima NUMERIC,
    creado_en TIMESTAMPTZ,
    actualizado_en TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL
       OR NOT public.tiene_permiso('productos.consultar') THEN
        RAISE EXCEPTION 'No tienes permiso para consultar productos'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.codigo,
        p.nombre,
        p.descripcion,
        p.unidad,
        p.precio,
        p.costo,
        p.tasa_impuesto,
        p.activo,
        p.imagen_path,
        COALESCE(i.existencia, 0::NUMERIC),
        COALESCE(i.existencia_minima, 0::NUMERIC),
        p.creado_en,
        p.actualizado_en
    FROM public.productos AS p
    LEFT JOIN public.inventario AS i
        ON i.producto_id = p.id
    ORDER BY p.creado_en DESC, p.nombre ASC;
END;
$$;


-- ------------------------------------------------------------
-- 2. CREAR PRODUCTO + INVENTARIO + MOVIMIENTO INICIAL
-- Todo se ejecuta dentro de una sola transaccion.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.productos_crear(
    p_codigo TEXT,
    p_nombre TEXT,
    p_descripcion TEXT,
    p_unidad TEXT,
    p_precio NUMERIC,
    p_costo NUMERIC,
    p_tasa_impuesto NUMERIC,
    p_existencia_inicial NUMERIC,
    p_existencia_minima NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_usuario UUID;
    v_categoria UUID;
    v_producto UUID;
BEGIN
    v_usuario := auth.uid();

    IF v_usuario IS NULL
       OR NOT public.tiene_permiso('productos.crear') THEN
        RAISE EXCEPTION 'No tienes permiso para crear productos'
            USING ERRCODE = '42501';
    END IF;

    IF p_codigo IS NULL OR pg_catalog.btrim(p_codigo) = ''
       OR p_nombre IS NULL OR pg_catalog.btrim(p_nombre) = ''
       OR p_unidad IS NULL OR pg_catalog.btrim(p_unidad) = '' THEN
        RAISE EXCEPTION 'Código, nombre y unidad son obligatorios';
    END IF;

    IF p_precio IS NULL OR p_precio < 0
       OR p_costo IS NULL OR p_costo < 0
       OR p_tasa_impuesto IS NULL
       OR p_tasa_impuesto < 0 OR p_tasa_impuesto > 100 THEN
        RAISE EXCEPTION 'Los valores comerciales no son válidos';
    END IF;

    IF p_existencia_inicial IS NULL OR p_existencia_inicial < 0
       OR p_existencia_minima IS NULL OR p_existencia_minima < 0 THEN
        RAISE EXCEPTION 'Las existencias no pueden ser negativas';
    END IF;

    -- Categoría fija interna. No se ofrece un CRUD de categorías.
    INSERT INTO public.categorias_producto (
        nombre,
        descripcion,
        activa
    )
    VALUES (
        'Agua',
        'Categoría interna de productos de agua',
        TRUE
    )
    ON CONFLICT (nombre)
    DO UPDATE SET
        activa = TRUE,
        actualizado_en = pg_catalog.now()
    RETURNING id INTO v_categoria;

    INSERT INTO public.productos (
        categoria_id,
        codigo,
        nombre,
        descripcion,
        unidad,
        precio,
        costo,
        tasa_impuesto,
        activo
    )
    VALUES (
        v_categoria,
        pg_catalog.btrim(p_codigo),
        pg_catalog.btrim(p_nombre),
        NULLIF(pg_catalog.btrim(COALESCE(p_descripcion, '')), ''),
        pg_catalog.btrim(p_unidad),
        p_precio,
        p_costo,
        p_tasa_impuesto,
        TRUE
    )
    RETURNING id INTO v_producto;

    INSERT INTO public.inventario (
        producto_id,
        existencia,
        existencia_minima
    )
    VALUES (
        v_producto,
        p_existencia_inicial,
        p_existencia_minima
    );

    IF p_existencia_inicial > 0 THEN
        INSERT INTO public.inventario_movimientos (
            producto_id,
            usuario_id,
            tipo,
            cantidad,
            existencia_anterior,
            existencia_nueva,
            motivo
        )
        VALUES (
            v_producto,
            v_usuario,
            'entrada',
            p_existencia_inicial,
            0,
            p_existencia_inicial,
            'Existencia inicial al crear el producto'
        );
    END IF;

    INSERT INTO public.auditoria_operaciones (
        actor_id,
        entidad,
        entidad_id,
        accion,
        datos
    )
    VALUES (
        v_usuario,
        'productos',
        v_producto,
        'crear',
        pg_catalog.jsonb_build_object(
            'codigo', pg_catalog.btrim(p_codigo),
            'nombre', pg_catalog.btrim(p_nombre),
            'precio', p_precio,
            'existencia_inicial', p_existencia_inicial,
            'existencia_minima', p_existencia_minima
        )
    );

    RETURN v_producto;
END;
$$;


-- ------------------------------------------------------------
-- 3. ACTUALIZAR DATOS COMERCIALES Y EXISTENCIA MINIMA
-- No modifica la existencia actual.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.productos_actualizar(
    p_producto_id UUID,
    p_codigo TEXT,
    p_nombre TEXT,
    p_descripcion TEXT,
    p_unidad TEXT,
    p_precio NUMERIC,
    p_costo NUMERIC,
    p_tasa_impuesto NUMERIC,
    p_existencia_minima NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_usuario UUID;
    v_precio_anterior NUMERIC;
BEGIN
    v_usuario := auth.uid();

    IF v_usuario IS NULL
       OR NOT public.tiene_permiso('productos.editar') THEN
        RAISE EXCEPTION 'No tienes permiso para editar productos'
            USING ERRCODE = '42501';
    END IF;

    IF p_producto_id IS NULL
       OR p_codigo IS NULL OR pg_catalog.btrim(p_codigo) = ''
       OR p_nombre IS NULL OR pg_catalog.btrim(p_nombre) = ''
       OR p_unidad IS NULL OR pg_catalog.btrim(p_unidad) = '' THEN
        RAISE EXCEPTION 'Los datos obligatorios no son válidos';
    END IF;

    IF p_precio IS NULL OR p_precio < 0
       OR p_costo IS NULL OR p_costo < 0
       OR p_tasa_impuesto IS NULL
       OR p_tasa_impuesto < 0 OR p_tasa_impuesto > 100
       OR p_existencia_minima IS NULL OR p_existencia_minima < 0 THEN
        RAISE EXCEPTION 'Los valores numéricos no son válidos';
    END IF;

    IF NOT public.tiene_permiso('inventario.ajustar') THEN
        RAISE EXCEPTION 'No tienes permiso para modificar la existencia mínima'
            USING ERRCODE = '42501';
    END IF;

    SELECT p.precio
    INTO v_precio_anterior
    FROM public.productos AS p
    WHERE p.id = p_producto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El producto no existe';
    END IF;

    UPDATE public.productos
    SET
        codigo = pg_catalog.btrim(p_codigo),
        nombre = pg_catalog.btrim(p_nombre),
        descripcion = NULLIF(pg_catalog.btrim(COALESCE(p_descripcion, '')), ''),
        unidad = pg_catalog.btrim(p_unidad),
        precio = p_precio,
        costo = p_costo,
        tasa_impuesto = p_tasa_impuesto,
        actualizado_en = pg_catalog.now()
    WHERE id = p_producto_id;

    UPDATE public.inventario
    SET
        existencia_minima = p_existencia_minima,
        actualizado_en = pg_catalog.now()
    WHERE producto_id = p_producto_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró el registro de inventario del producto';
    END IF;

    INSERT INTO public.auditoria_operaciones (
        actor_id,
        entidad,
        entidad_id,
        accion,
        datos
    )
    VALUES (
        v_usuario,
        'productos',
        p_producto_id,
        'actualizar',
        pg_catalog.jsonb_build_object(
            'precio_anterior', v_precio_anterior,
            'precio_nuevo', p_precio,
            'existencia_minima_nueva', p_existencia_minima
        )
    );
END;
$$;


-- ------------------------------------------------------------
-- 4. AJUSTAR EXISTENCIA CON MOVIMIENTO INMUTABLE
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.productos_ajustar_existencia(
    p_producto_id UUID,
    p_nueva_existencia NUMERIC,
    p_motivo TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_usuario UUID;
    v_existencia_anterior NUMERIC;
    v_diferencia NUMERIC;
BEGIN
    v_usuario := auth.uid();

    IF v_usuario IS NULL
       OR NOT public.tiene_permiso('inventario.ajustar') THEN
        RAISE EXCEPTION 'No tienes permiso para ajustar existencias'
            USING ERRCODE = '42501';
    END IF;

    IF p_producto_id IS NULL
       OR p_nueva_existencia IS NULL
       OR p_nueva_existencia < 0 THEN
        RAISE EXCEPTION 'La existencia indicada no es válida';
    END IF;

    IF p_motivo IS NULL OR pg_catalog.btrim(p_motivo) = '' THEN
        RAISE EXCEPTION 'Debes indicar el motivo del ajuste';
    END IF;

    SELECT i.existencia
    INTO v_existencia_anterior
    FROM public.inventario AS i
    WHERE i.producto_id = p_producto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe inventario para este producto';
    END IF;

    v_diferencia := p_nueva_existencia - v_existencia_anterior;

    IF v_diferencia = 0 THEN
        RAISE EXCEPTION 'La nueva existencia es igual a la actual';
    END IF;

    UPDATE public.inventario
    SET
        existencia = p_nueva_existencia,
        actualizado_en = pg_catalog.now()
    WHERE producto_id = p_producto_id;

    INSERT INTO public.inventario_movimientos (
        producto_id,
        usuario_id,
        tipo,
        cantidad,
        existencia_anterior,
        existencia_nueva,
        motivo
    )
    VALUES (
        p_producto_id,
        v_usuario,
        'ajuste',
        pg_catalog.abs(v_diferencia),
        v_existencia_anterior,
        p_nueva_existencia,
        pg_catalog.btrim(p_motivo)
    );

    INSERT INTO public.auditoria_operaciones (
        actor_id,
        entidad,
        entidad_id,
        accion,
        datos
    )
    VALUES (
        v_usuario,
        'inventario',
        p_producto_id,
        'ajustar_existencia',
        pg_catalog.jsonb_build_object(
            'existencia_anterior', v_existencia_anterior,
            'existencia_nueva', p_nueva_existencia,
            'motivo', pg_catalog.btrim(p_motivo)
        )
    );
END;
$$;


-- ------------------------------------------------------------
-- 5. ACTIVAR / DESACTIVAR SIN BORRAR HISTORIAL
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.productos_cambiar_estado(
    p_producto_id UUID,
    p_activo BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_usuario UUID;
BEGIN
    v_usuario := auth.uid();

    IF v_usuario IS NULL OR p_activo IS NULL THEN
        RAISE EXCEPTION 'Solicitud no válida';
    END IF;

    IF p_activo = FALSE
       AND NOT public.tiene_permiso('productos.desactivar') THEN
        RAISE EXCEPTION 'No tienes permiso para desactivar productos'
            USING ERRCODE = '42501';
    END IF;

    IF p_activo = TRUE
       AND NOT public.tiene_permiso('productos.editar') THEN
        RAISE EXCEPTION 'No tienes permiso para activar productos'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.productos
    SET
        activo = p_activo,
        actualizado_en = pg_catalog.now()
    WHERE id = p_producto_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El producto no existe';
    END IF;

    INSERT INTO public.auditoria_operaciones (
        actor_id,
        entidad,
        entidad_id,
        accion,
        datos
    )
    VALUES (
        v_usuario,
        'productos',
        p_producto_id,
        CASE WHEN p_activo THEN 'activar' ELSE 'desactivar' END,
        pg_catalog.jsonb_build_object('activo', p_activo)
    );
END;
$$;


-- ------------------------------------------------------------
-- 6. PERMISOS DE EJECUCION
-- ------------------------------------------------------------

REVOKE ALL ON FUNCTION public.productos_listar_gestion() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.productos_crear(TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.productos_actualizar(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.productos_ajustar_existencia(UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.productos_cambiar_estado(UUID, BOOLEAN) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.productos_listar_gestion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.productos_crear(TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.productos_actualizar(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.productos_ajustar_existencia(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.productos_cambiar_estado(UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.productos_listar_gestion() IS
'Lista productos activos e inactivos para usuarios autorizados, incluyendo existencias.';

COMMENT ON FUNCTION public.productos_crear(TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC) IS
'Crea producto, inventario y movimiento inicial de forma atomica.';

COMMENT ON FUNCTION public.productos_ajustar_existencia(UUID, NUMERIC, TEXT) IS
'Ajusta existencias con bloqueo de fila, movimiento inmutable y auditoria.';
