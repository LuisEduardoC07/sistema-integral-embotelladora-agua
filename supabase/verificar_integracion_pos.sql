SELECT jsonb_build_object(
  'columnas', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'tabla', table_name,
        'columna', column_name,
        'tipo', data_type,
        'nullable', is_nullable
      ) ORDER BY table_name, ordinal_position
    ), '[]'::jsonb)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'categorias_producto', 'productos', 'inventario',
        'cajas', 'caja_movimientos', 'ventas',
        'venta_detalles', 'venta_pagos',
        'inventario_movimientos', 'auditoria_operaciones'
      )
  ),
  'funciones', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'nombre', p.proname,
        'argumentos', pg_get_function_arguments(p.oid),
        'retorno', pg_get_function_result(p.oid)
      ) ORDER BY p.proname
    ), '[]'::jsonb)
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'pos_%'
  ),
  'permisos_pos', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'codigo', codigo,
        'descripcion', descripcion
      ) ORDER BY codigo
    ), '[]'::jsonb)
    FROM public.permisos
    WHERE codigo LIKE 'caja.%'
       OR codigo LIKE 'ventas.%'
       OR codigo LIKE 'productos.%'
       OR codigo LIKE 'inventario.%'
  )
) AS diagnostico;
