-- ============================================================
-- MODULO 001: USUARIOS, ROLES Y PERMISOS
-- MIGRACION 002: PERFILES Y AUDITORIA
-- ============================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE RESTRICT,

    rol_id UUID NOT NULL
        REFERENCES public.roles(id)
        ON DELETE RESTRICT,

    nombre TEXT NOT NULL,
    telefono TEXT,

    estado TEXT NOT NULL DEFAULT 'pendiente',

    creado_por UUID
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT profiles_estado_valido CHECK (
        estado IN ('pendiente', 'activo', 'suspendido')
    ),

    CONSTRAINT profiles_nombre_no_vacio CHECK (
        length(trim(nombre)) > 0
    )
);

CREATE INDEX idx_profiles_rol_id
    ON public.profiles (rol_id);

CREATE INDEX idx_profiles_estado
    ON public.profiles (estado);

CREATE INDEX idx_profiles_creado_por
    ON public.profiles (creado_por);

CREATE TABLE public.auditoria_usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    actor_id UUID
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    usuario_afectado_id UUID
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    accion TEXT NOT NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    motivo TEXT,
    direccion_ip INET,

    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT auditoria_accion_no_vacia CHECK (
        length(trim(accion)) > 0
    )
);

CREATE INDEX idx_auditoria_usuarios_actor
    ON public.auditoria_usuarios (actor_id);

CREATE INDEX idx_auditoria_usuarios_afectado
    ON public.auditoria_usuarios (usuario_afectado_id);

CREATE INDEX idx_auditoria_usuarios_fecha
    ON public.auditoria_usuarios (creado_en DESC);

COMMENT ON TABLE public.profiles IS
    'Perfil operativo y estado de cada usuario autenticado';

COMMENT ON TABLE public.auditoria_usuarios IS
    'Registro historico de acciones administrativas sobre usuarios';
