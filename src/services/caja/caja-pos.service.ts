import { createClient } from "@/lib/supabase/browser";
import type {
  CajaAbiertaPOS,
  ResultadoCajaAbiertaPOS,
  ResultadoOperacionPOS,
} from "@/types/pos/pos.types";

export async function obtenerCajaAbiertaPOS(): Promise<CajaAbiertaPOS | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("pos_obtener_caja_abierta");

  if (error) {
    throw new Error(error.message);
  }

  const resultado = data as unknown as ResultadoCajaAbiertaPOS;

  return resultado?.caja ?? null;
}

export async function abrirCajaPOS(
  montoApertura: number,
): Promise<ResultadoOperacionPOS> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("pos_abrir_caja", {
    p_monto_apertura: montoApertura,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as ResultadoOperacionPOS;
}

export async function cerrarCajaPOS(
  cajaId: string,
  montoCierre: number,
  observaciones: string | null,
): Promise<ResultadoOperacionPOS> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("pos_cerrar_caja", {
    p_caja_id: cajaId,
    p_monto_cierre: montoCierre,
    p_observaciones: observaciones,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as ResultadoOperacionPOS;
}
