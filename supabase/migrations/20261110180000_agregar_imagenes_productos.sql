-- ============================================================
-- MODULO PRODUCTOS: IMAGENES Y ALMACENAMIENTO
-- ============================================================

ALTER TABLE public.productos
ADD COLUMN imagen_path TEXT;

COMMENT ON COLUMN public.productos.imagen_path IS
'Ruta de la imagen del producto en el bucket imagenes-productos.';

-- Bucket público para visualizar fotografías del catálogo.
INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'imagenes-productos',
    'imagenes-productos',
    TRUE,
    5242880,
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif'
    ]
)
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Carga: solo administradores y superusuarios.
DROP POLICY IF EXISTS productos_imagenes_insertar
ON storage.objects;

CREATE POLICY productos_imagenes_insertar
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'imagenes-productos'
    AND (
        public.tiene_permiso('productos.crear')
        OR public.tiene_permiso('productos.editar')
    )
    AND EXISTS (
        SELECT 1
        FROM public.productos AS p
        WHERE p.id::TEXT = (storage.foldername(name))[1]
    )
);

-- Eliminación: solo usuarios con permiso de edición.
DROP POLICY IF EXISTS productos_imagenes_eliminar
ON storage.objects;

CREATE POLICY productos_imagenes_eliminar
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'imagenes-productos'
    AND public.tiene_permiso('productos.editar')
    AND EXISTS (
        SELECT 1
        FROM public.productos AS p
        WHERE p.id::TEXT = (storage.foldername(name))[1]
    )
);

-- Asociar o retirar la imagen de un producto.
CREATE OR REPLACE FUNCTION public.productos_actualizar_imagen(
    p_producto_id UUID,
    p_imagen_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_usuario_id UUID;
BEGIN
    v_usuario_id := auth.uid();

    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Se requiere autenticación.';
    END IF;

    IF NOT public.tiene_permiso('productos.editar') THEN
        RAISE EXCEPTION 'No tienes permiso para modificar imágenes de productos.';
    END IF;

    IF p_imagen_path IS NOT NULL
       AND p_imagen_path !~* (
           '^' || p_producto_id::TEXT ||
           '/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|avif)$'
       ) THEN
        RAISE EXCEPTION 'La ruta de la imagen no es válida.';
    END IF;

    UPDATE public.productos
    SET
        imagen_path = p_imagen_path,
        actualizado_en = pg_catalog.now()
    WHERE id = p_producto_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El producto indicado no existe.';
    END IF;

    INSERT INTO public.auditoria_operaciones (
        actor_id,
        entidad,
        entidad_id,
        accion,
        datos
    )
    VALUES (
        v_usuario_id,
        'productos',
        p_producto_id,
        'actualizar_imagen',
        pg_catalog.jsonb_build_object(
            'imagen_path',
            p_imagen_path
        )
    );

    RETURN pg_catalog.jsonb_build_object(
        'producto_id', p_producto_id,
        'imagen_path', p_imagen_path,
        'actualizado', TRUE
    );
END;
$$;

REVOKE ALL
ON FUNCTION public.productos_actualizar_imagen(UUID, TEXT)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.productos_actualizar_imagen(UUID, TEXT)
TO authenticated;

COMMENT ON FUNCTION public.productos_actualizar_imagen(UUID, TEXT) IS
'Actualiza la ruta de imagen de un producto y registra la operación en auditoría, exigiendo el permiso productos.editar.';
