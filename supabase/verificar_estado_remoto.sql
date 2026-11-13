SELECT jsonb_build_object(
  'tablas_comerciales', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'tabla', t.tablename,
        'rls', c.relrowsecurity
      ) ORDER BY t.tablename
    ), '[]'::jsonb)
    FROM pg_catalog.pg_tables t
    JOIN pg_catalog.pg_class c ON c.relname = t.tablename
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      AND n.nspname = 'public'
    WHERE t.schemaname = 'public'
      AND t.tablename IN (
        'categorias_producto', 'productos', 'inventario',
        'cajas', 'caja_movimientos', 'ventas',
        'venta_detalles', 'venta_pagos',
        'inventario_movimientos', 'auditoria_operaciones'
      )
  ),
  'funciones_pos', (
    SELECT COALESCE(jsonb_agg(p.proname ORDER BY p.proname), '[]'::jsonb)
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'pos_abrir_caja',
        'pos_registrar_movimiento_caja',
        'pos_confirmar_venta',
        'pos_cerrar_caja',
        'pos_anular_venta',
        'proteger_registro_historico'
      )
  ),
  'politicas_comerciales', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'tabla', tablename,
        'politica', policyname,
        'comando', cmd
      ) ORDER BY tablename, policyname
    ), '[]'::jsonb)
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'categorias_producto', 'productos', 'inventario',
        'cajas', 'caja_movimientos', 'ventas',
        'venta_detalles', 'venta_pagos',
        'inventario_movimientos', 'auditoria_operaciones'
      )
  ),
  'triggers_comerciales', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'tabla', c.relname,
        'trigger', t.tgname,
        'funcion', p.proname
      ) ORDER BY c.relname, t.tgname
    ), '[]'::jsonb)
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
      AND c.relname IN (
        'categorias_producto', 'productos', 'inventario',
        'cajas', 'caja_movimientos', 'ventas',
        'venta_detalles', 'venta_pagos',
        'inventario_movimientos', 'auditoria_operaciones'
      )
  ),
  'secuencia_ventas', (
    SELECT to_regclass('public.ventas_numero_seq') IS NOT NULL
  )
) AS verificacion;
