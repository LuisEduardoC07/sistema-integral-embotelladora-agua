# Arquitectura general

## Descripción

Sistema Integral de Gestión para Embotelladora de Agua.

Aplicación web modular construida con Next.js, React, TypeScript,
Tailwind CSS y Supabase.

## Capas de la aplicación

### Presentación
Ubicación: `src/app` y `src/components`.

Responsabilidad: rutas, páginas, formularios, tablas y componentes
reutilizables. No debe contener reglas críticas de negocio.

### Servicios de aplicación
Ubicación: `src/services`.

Responsabilidad: coordinar operaciones, aplicar reglas de negocio y
comunicarse con la infraestructura necesaria.

### Infraestructura compartida
Ubicación: `src/lib`.

Responsabilidad: clientes Supabase, seguridad, validaciones y utilidades.

### Contratos y modelos
Ubicación: `src/types`.

Responsabilidad: definir tipos y contratos compartidos de TypeScript.

### Persistencia
Ubicación: `supabase`.

Responsabilidad: migraciones SQL, funciones, políticas de seguridad,
configuración y datos iniciales.

## Principios obligatorios

1. Separación de responsabilidades.
2. Validación en servidor.
3. Autorización por rol y política de acceso.
4. Integridad transaccional de ventas e inventario.
5. Trazabilidad de operaciones financieras.
6. Conservación del historial de transacciones.
7. Pruebas para reglas críticas.
8. Documentación de decisiones técnicas.

## Integraciones externas

Las integraciones con proveedores de correo, pagos y facturación
electrónica se implementarán mediante adaptadores desacoplados.

Ninguna integración se considerará operativa hasta disponer de
credenciales válidas, pruebas y confirmación del proveedor.
