DROP POLICY IF EXISTS productos_imagenes_consultar_gestion
ON storage.objects;

CREATE POLICY productos_imagenes_consultar_gestion
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'imagenes-productos'
    AND public.tiene_permiso('productos.editar')
);
