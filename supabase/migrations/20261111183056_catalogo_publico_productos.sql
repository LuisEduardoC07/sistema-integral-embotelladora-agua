CREATE OR REPLACE FUNCTION public.catalogo_publico_productos()
RETURNS TABLE (
    id UUID,
    nombre TEXT,
    descripcion TEXT,
    unidad TEXT,
    precio NUMERIC,
    imagen_path TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
    SELECT
        p.id,
        p.nombre,
        p.descripcion,
        p.unidad,
        p.precio,
        p.imagen_path
    FROM public.productos AS p
    WHERE p.activo IS TRUE
    ORDER BY p.nombre ASC, p.id ASC;
$function$;

REVOKE ALL ON FUNCTION public.catalogo_publico_productos()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.catalogo_publico_productos()
TO anon, authenticated;

GRANT SELECT (id, nombre, descripcion, unidad, precio, imagen_path, activo)
ON TABLE public.productos
TO anon;

CREATE POLICY productos_catalogo_publico_activos
ON public.productos
FOR SELECT
TO anon
USING (activo IS TRUE);