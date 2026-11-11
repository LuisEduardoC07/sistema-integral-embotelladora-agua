import "server-only";

import { redirect } from "next/navigation";

import {
  ErrorAutorizacion,
  exigirRol,
} from "@/lib/seguridad/autorizacion";

import type { PerfilUsuario } from "@/types/usuarios/perfil.types";

/**
 * Protege una ruta de panel mediante el rol validado en el servidor.
 */
export async function protegerPanel(
  rolRequerido: PerfilUsuario["roles"]["codigo"]
): Promise<PerfilUsuario> {
  try {
    return await exigirRol(rolRequerido);
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      if (error.status === 401) {
        redirect("/");
      }

      if (error.status === 403) {
        redirect("/acceso-denegado");
      }
    }

    throw error;
  }
}
