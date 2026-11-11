export const ROLES_SISTEMA = [
  "superusuario",
  "administrador",
  "cajero",
  "cliente",
] as const;

export type RolSistema = (typeof ROLES_SISTEMA)[number];

export const ESTADOS_PERFIL = [
  "pendiente",
  "activo",
  "suspendido",
] as const;

export type EstadoPerfil = (typeof ESTADOS_PERFIL)[number];

export interface RolPerfil {
  codigo: RolSistema;
  nombre: string;
}

export interface PerfilUsuario {
  id: string;
  rol_id: string;
  nombre: string;
  telefono: string | null;
  estado: EstadoPerfil;
  creado_en: string;
  actualizado_en: string;
  roles: RolPerfil;
}

export interface ResultadoPerfil {
  perfil: PerfilUsuario | null;
  error: string | null;
}

export interface ResultadoPermiso {
  autorizado: boolean;
  error: string | null;
}
