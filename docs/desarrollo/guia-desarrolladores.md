# Guía para desarrolladores

## Requisitos

- Node.js.
- npm.
- Git.
- Acceso autorizado al proyecto Supabase.

## Instalación

1. Clonar el repositorio.
2. Ejecutar `npm install`.
3. Copiar `.env.example` a `.env.local`.
4. Configurar las variables de entorno localmente.
5. Ejecutar `npm run dev`.

## Comandos de validación

- `npm run lint`: análisis estático.
- `npm run build`: compilación de producción.
- `npm audit`: auditoría de dependencias.

## Base de datos

Las migraciones se almacenan en `supabase/migrations`.

Cada migración debe ser numerada, tener un propósito concreto y
documentar sus dependencias y cambios.

No modificar manualmente una base de datos de producción sin una
migración revisada y un procedimiento de recuperación.

## Desarrollo de módulos

Antes de implementar un módulo:

1. Revisar la especificación funcional.
2. Identificar roles y permisos.
3. Definir el modelo de datos.
4. Diseñar las validaciones y reglas de negocio.
5. Implementar servicios y componentes separados.
6. Agregar pruebas.
7. Actualizar la documentación.
8. Ejecutar las verificaciones antes de integrar.
