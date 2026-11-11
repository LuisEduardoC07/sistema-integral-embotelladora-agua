import "server-only";

import {
  comprobarPermiso,
  obtenerPerfilActual,
} from "@/services/usuarios/perfil.service";

import type { PerfilUsuario } from "@/types/usuarios/perfil.types";

export class ErrorAutorizacion extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 | 503
  ) {
    super(message);
    this.name = "ErrorAutorizacion";
  }
}

/**
 * Exige que exista un usuario autenticado con perfil activo.
 */
export async function exigirPerfilActivo(): Promise<PerfilUsuario> {
  const resultado = await obtenerPerfilActual();

  if (!resultado.perfil) {
    if (resultado.error === "No existe una sesión autenticada.") {
      throw new ErrorAutorizacion(
        "Debes iniciar sesión para continuar.",
        401
      );
    }

    throw new ErrorAutorizacion(
      "No fue posible validar el perfil del usuario.",
      503
    );
  }

  if (resultado.perfil.estado !== "activo") {
    throw new ErrorAutorizacion(
      "Tu cuenta no está habilitada para realizar esta operación.",
      403
    );
  }

  return resultado.perfil;
}

/**
 * Exige un perfil activo y el permiso indicado.
 */
export async function exigirPermiso(
  codigoPermiso: string
): Promise<PerfilUsuario> {
  const perfil = await exigirPerfilActivo();

  const resultado = await comprobarPermiso(codigoPermiso);

  if (resultado.error) {
    throw new ErrorAutorizacion(
      "No fue posible verificar los permisos del usuario.",
      503
    );
  }

  if (!resultado.autorizado) {
    throw new ErrorAutorizacion(
      "No tienes autorización para realizar esta operación.",
      403
    );
  }

  return perfil;
}


/**
 * Exige que el usuario tenga un perfil activo y el rol exacto requerido.
 * La identidad y el rol se consultan en el servidor mediante Supabase.
 */
export async function exigirRol(
  rolRequerido: PerfilUsuario["roles"]["codigo"]
): Promise<PerfilUsuario> {
  const perfil = await exigirPerfilActivo();

  if (perfil.roles.codigo !== rolRequerido) {
    throw new ErrorAutorizacion(
      "No tienes autorización para acceder a este panel.",
      403
    );
  }

  return perfil;
}
