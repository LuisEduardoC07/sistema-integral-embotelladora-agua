import { createClient } from "@/lib/supabase/browser";
import type {
  ItemVentaPOS,
  PagoVentaPOS,
  ResultadoVentaPOS,
} from "@/types/pos/pos.types";

export async function confirmarVentaPOS(datos: {
  cajaId: string;
  items: ItemVentaPOS[];
  pagos: PagoVentaPOS[];
  clienteNombre: string | null;
  observaciones: string | null;
}): Promise<ResultadoVentaPOS> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("pos_confirmar_venta", {
    p_caja_id: datos.cajaId,
    p_items: datos.items,
    p_pagos: datos.pagos,
    p_cliente_nombre: datos.clienteNombre,
    p_observaciones: datos.observaciones,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as ResultadoVentaPOS;
}
