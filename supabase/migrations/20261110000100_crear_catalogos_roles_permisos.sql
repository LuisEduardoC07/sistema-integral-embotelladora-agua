-- ============================================================
-- MODULO 001: USUARIOS, ROLES Y PERMISOS
-- MIGRACION 001: CATALOGOS RBAC
-- ============================================================

CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    es_sistema BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT roles_codigo_valido CHECK (
        codigo IN (
            'superusuario',
            'administrador',
            'cajero',
            'cliente'
        )
    )
);

CREATE TABLE public.permisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    modulo TEXT NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT permisos_codigo_no_vacio
        CHECK (length(trim(codigo)) > 0),

    CONSTRAINT permisos_modulo_no_vacio
        CHECK (length(trim(modulo)) > 0)
);

CREATE TABLE public.rol_permisos (
    rol_id UUID NOT NULL,
    permiso_id UUID NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT rol_permisos_pk
        PRIMARY KEY (rol_id, permiso_id),

    CONSTRAINT rol_permisos_rol_fk
        FOREIGN KEY (rol_id)
        REFERENCES public.roles(id)
        ON DELETE RESTRICT,

    CONSTRAINT rol_permisos_permiso_fk
        FOREIGN KEY (permiso_id)
        REFERENCES public.permisos(id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_rol_permisos_permiso_id
    ON public.rol_permisos (permiso_id);

COMMENT ON TABLE public.roles IS
    'Catalogo central de roles del sistema';

COMMENT ON TABLE public.permisos IS
    'Catalogo central de permisos por modulo y operacion';

COMMENT ON TABLE public.rol_permisos IS
    'Relacion de permisos asignados a cada rol';
