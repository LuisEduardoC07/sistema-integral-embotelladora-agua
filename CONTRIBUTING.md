# Guía de contribución

## Objetivo

Mantener una base de código profesional, segura, documentada y fácil de
mantener por cualquier desarrollador que se incorpore al proyecto.

## Convenciones de nombres

- Carpetas y archivos generales: kebab-case.
- Componentes React: PascalCase.
- Variables y funciones: camelCase.
- Clases y tipos: PascalCase.
- Constantes: UPPER_SNAKE_CASE.
- Tablas y columnas SQL: snake_case.
- Funciones SQL: snake_case.

## Idioma

Utilizar español para los conceptos del dominio, nombres de módulos,
variables, funciones y documentación. Conservar los nombres técnicos
propios de los frameworks y bibliotecas.

## Separación de responsabilidades

- app: rutas, páginas y controladores de entrada.
- components: presentación e interacción visual.
- services: reglas de negocio y coordinación de operaciones.
- lib: infraestructura compartida, seguridad y utilidades.
- types: contratos y modelos de TypeScript.
- supabase: estructura y evolución de la base de datos.
- tests: pruebas automatizadas.

## Documentación del código

Documentar responsabilidades, parámetros, retornos, permisos,
validaciones, dependencias y reglas de negocio no evidentes.

No agregar comentarios redundantes que simplemente repitan el código.

## Seguridad

- Validar y autorizar toda operación sensible en el servidor.
- Aplicar políticas RLS en las tablas expuestas mediante Supabase.
- No confiar en permisos implementados exclusivamente en la interfaz.
- No exponer secretos en componentes cliente.
- No registrar contraseñas, tokens ni datos completos de tarjetas.
- Mantener trazabilidad de las operaciones financieras.

## Verificación antes de integrar cambios

Ejecutar:

    npm run lint
    npm run build
    npm audit

No integrar cambios que introduzcan errores de compilación o
vulnerabilidades sin analizar y documentar previamente su aceptación.
