# Base de datos Supabase

## Organización

- `migrations`: cambios versionados del esquema.
- `functions`: funciones SQL y lógica ejecutable en base de datos.
- `policies`: documentación y scripts de políticas RLS.
- `seeds`: datos iniciales controlados para desarrollo y pruebas.

## Reglas

- Utilizar UUID para identificadores cuando corresponda.
- Utilizar timestamptz para fechas y horas.
- Utilizar numeric para importes monetarios.
- Crear índices para consultas frecuentes.
- Aplicar restricciones de integridad referencial.
- Proteger las tablas mediante RLS cuando estén expuestas.
- Usar transacciones para operaciones financieras y de inventario.
- Mantener migraciones pequeñas, ordenadas y documentadas.

Las migraciones deben poder revisarse y aplicarse de forma reproducible.
