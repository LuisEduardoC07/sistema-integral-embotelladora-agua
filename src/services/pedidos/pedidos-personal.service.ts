import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  DetallePedidoCliente,
  PedidoCliente,
} from "@/types/pedidos/pedidos.types";

export interface ResultadoPedidosPersonal {
  pedidos: PedidoCliente[];
  error: string | null;
}

export async function obtenerPedidosPersonal(): Promise<ResultadoPedidosPersonal> {
  try {
    const supabase = await createClient();

    const { data: filas, error } = await supabase
      .from("pedidos")
      .select(`
        id,
        numero,
        cliente_nombre,
        cliente_email,
        cliente_telefono,
        direccion_entrega,
        fecha_entrega,
        hora_entrega,
        observaciones,
        subtotal,
        impuesto,
        total,
        estado,
        creado_en
      `)
      .order("creado_en", { ascending: false });

    if (error) {
      console.error("[Pedidos personal] Error consultando pedidos:", error.message);
      return {
        pedidos: [],
        error: "No fue posible cargar los pedidos. Inténtalo nuevamente.",
      };
    }

    if (!filas || filas.length === 0) {
      return { pedidos: [], error: null };
    }

    const ids = filas.map((pedido) => pedido.id);

    const { data: detalles, error: errorDetalles } = await supabase
      .from("pedido_detalles")
      .select(`
        id,
        pedido_id,
        producto_id,
        codigo_producto,
        nombre_producto,
        unidad,
        cantidad,
        precio_unitario,
        tasa_impuesto,
        subtotal,
        impuesto,
        total
      `)
      .in("pedido_id", ids)
      .order("creado_en", { ascending: true });

    if (errorDetalles) {
      console.error("[Pedidos personal] Error consultando detalles:", errorDetalles.message);
      return {
        pedidos: [],
        error: "No fue posible cargar los detalles de los pedidos.",
      };
    }

    const detallesPorPedido = new Map<string, DetallePedidoCliente[]>();

    for (const detalle of (detalles ?? []) as DetallePedidoCliente[]) {
      const lista = detallesPorPedido.get(detalle.pedido_id) ?? [];
      lista.push(detalle);
      detallesPorPedido.set(detalle.pedido_id, lista);
    }

    const pedidos = filas.map((pedido) => ({
      ...pedido,
      detalles: detallesPorPedido.get(pedido.id) ?? [],
    })) as PedidoCliente[];

    return { pedidos, error: null };
  } catch (error) {
    console.error("[Pedidos personal] Error inesperado:", error);
    return {
      pedidos: [],
      error: "Ocurrió un error inesperado al consultar los pedidos.",
    };
  }
}
