import "server-only";

import {
  ErrorAutorizacion,
  exigirPerfilActivo,
  exigirPermiso,
} from "@/lib/seguridad/autorizacion";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CajeroHistorialOption } from "@/types/ventas/historial-ventas.types";

/**
 * Obtiene cajeros activos y las identidades de cajeros eliminados
 * para conservar los filtros del historial de ventas.
 */
export async function obtenerCajerosHistorial(): Promise<CajeroHistorialOption[]> {
  const perfil = await exigirPerfilActivo();

  if (perfil.roles.codigo === "administrador") {
    await exigirPermiso("usuarios.consultar");
  } else if (perfil.roles.codigo === "superusuario") {
    await exigirPermiso("usuarios.gestionar_roles");
  } else {
    throw new ErrorAutorizacion(
      "No tienes autorización para consultar la lista de cajeros.",
      403
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const [
    { data: cajerosActivos, error: errorActivos },
    { data: cajerosEliminados, error: errorEliminados },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,nombre,roles!profiles_rol_id_fkey!inner(codigo)")
      .eq("estado", "activo")
      .eq("roles.codigo", "cajero")
      .order("nombre", { ascending: true }),

    admin
      .from("identidades_usuarios_eliminados")
      .select("usuario_id,nombre")
      .eq("rol_codigo", "cajero")
      .order("nombre", { ascending: true }),
  ]);

  if (errorActivos) {
    console.error(
      "[Historial ventas] Error al consultar cajeros activos:",
      errorActivos
    );
    throw new Error("No fue posible cargar la lista de cajeros.");
  }

  if (errorEliminados) {
    console.error(
      "[Historial ventas] Error al consultar cajeros eliminados:",
      errorEliminados
    );
    throw new Error("No fue posible cargar las identidades históricas de cajeros.");
  }

  const activos: CajeroHistorialOption[] = (cajerosActivos ?? []).map(
    (cajero) => ({
      id: cajero.id,
      nombre: cajero.nombre,
      eliminado: false,
    })
  );

  const eliminados: CajeroHistorialOption[] = (cajerosEliminados ?? []).map(
    (cajero) => ({
      id: cajero.usuario_id,
      nombre: cajero.nombre,
      eliminado: true,
    })
  );

  return [...activos, ...eliminados].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es")
  );
}
