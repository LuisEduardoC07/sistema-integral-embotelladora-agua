import "server-only";

import {
  ErrorAutorizacion,
  exigirPerfilActivo,
  exigirPermiso,
} from "@/lib/seguridad/autorizacion";
import { createClient } from "@/lib/supabase/server";
import type { CajeroHistorialOption } from "@/types/ventas/historial-ventas.types";

/**
 * Obtiene los cajeros activos que pueden utilizarse como filtro.
 * El acceso se valida en el servidor y la consulta respeta RLS.
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

  const { data, error } = await supabase
    .from("profiles")
    .select("id,nombre,roles!profiles_rol_id_fkey!inner(codigo)")
    .eq("estado", "activo")
    .eq("roles.codigo", "cajero")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("[Historial ventas] Error al consultar cajeros:", error);
    throw new Error("No fue posible cargar la lista de cajeros.");
  }

  return (data ?? []).map((cajero) => ({
    id: cajero.id,
    nombre: cajero.nombre,
  }));
}