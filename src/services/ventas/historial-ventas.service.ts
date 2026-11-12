import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  FiltrosHistorialVentas,
  RespuestaHistorialVentas,
} from "@/types/ventas/historial-ventas.types";

export async function consultarHistorialVentas(
  filtros: FiltrosHistorialVentas = {}
): Promise<RespuestaHistorialVentas> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("consultar_historial_ventas", {
    p_limite: filtros.limite ?? 25,
    p_cursor_fecha: filtros.cursorFecha?.trim() || null,
    p_cursor_id: filtros.cursorId?.trim() || null,
    p_fecha_desde: filtros.fechaDesde || null,
    p_fecha_hasta: filtros.fechaHasta || null,
    p_cajero_id: filtros.cajeroId || null,
    p_metodo_pago: filtros.metodoPago || null,
    p_estado: filtros.estado || null,
    p_busqueda: filtros.busqueda?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as RespuestaHistorialVentas;
}
