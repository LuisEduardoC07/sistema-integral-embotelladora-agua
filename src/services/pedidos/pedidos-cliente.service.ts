import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  DetallePedidoCliente,
  PedidoCliente,
} from "@/types/pedidos/pedidos.types";

export interface ResultadoPedidosCliente {
  pedidos: PedidoCliente[];
  error: string | null;
}

export async function obtenerPedidosDelCliente(): Promise<ResultadoPedidosCliente> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: errorAuth,
    } = await supabase.auth.getUser();

    if (errorAuth || !user) {
      return {
        pedidos: [],
        error: "No se pudo validar la sesión del cliente.",
      };
    }

    // El filtro identifica al usuario actual; RLS vuelve a imponer
    // esta restricción en la base de datos.
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
      .eq("cliente_id", user.id)
      .order("creado_en", { ascending: false });

    if (error) {
      console.error("[Pedidos cliente] Error consultando pedidos:", error.message);
      return {
        pedidos: [],
        error: "No fue posible cargar tus pedidos. Inténtalo nuevamente.",
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
      console.error("[Pedidos cliente] Error consultando detalles:", errorDetalles.message);
      return {
        pedidos: [],
        error: "No fue posible cargar el detalle de tus pedidos.",
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
    console.error("[Pedidos cliente] Error inesperado:", error);
    return {
      pedidos: [],
      error: "Ocurrió un error inesperado al consultar tus pedidos.",
    };
  }
}
