import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { comprobarPermiso } from "@/services/usuarios/perfil.service";
import { obtenerPedidosPersonal } from "@/services/pedidos/pedidos-personal.service";
import type { EstadoPedido } from "@/types/pedidos/pedidos.types";

const ESTADOS_VALIDOS: EstadoPedido[] = [
  "pendiente",
  "confirmado",
  "en_preparacion",
  "en_camino",
  "entregado",
  "cancelado",
];

export async function GET() {
  try {
    const consulta = await comprobarPermiso("pedidos.consultar");
    const puedeGestionar = await comprobarPermiso("pedidos.gestionar");
    const puedeEntregar = await comprobarPermiso("pedidos.entregar");

    if (!consulta.autorizado || (!puedeGestionar.autorizado && !puedeEntregar.autorizado)) {
      return NextResponse.json(
        { error: "No tienes permiso para consultar los pedidos del personal." },
        { status: 403 }
      );
    }

    const resultado = await obtenerPedidosPersonal();

    if (resultado.error) {
      return NextResponse.json({ error: resultado.error }, { status: 500 });
    }

    return NextResponse.json({
      pedidos: resultado.pedidos,
      puedeGestionar: puedeGestionar.autorizado,
      puedeEntregar: puedeEntregar.autorizado,
    });
  } catch (error) {
    console.error("[API pedidos pendientes GET]", error);
    return NextResponse.json(
      { error: "No fue posible consultar los pedidos." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const puedeGestionar = await comprobarPermiso("pedidos.gestionar");
    const puedeEntregar = await comprobarPermiso("pedidos.entregar");

    if (!puedeGestionar.autorizado && !puedeEntregar.autorizado) {
      return NextResponse.json(
        { error: "No tienes permiso para modificar pedidos." },
        { status: 403 }
      );
    }

    let cuerpo: unknown;

    try {
      cuerpo = await request.json();
    } catch {
      return NextResponse.json(
        { error: "La solicitud no contiene datos válidos." },
        { status: 400 }
      );
    }

    if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
      return NextResponse.json(
        { error: "Los datos enviados no tienen un formato válido." },
        { status: 400 }
      );
    }

    const datos = cuerpo as Record<string, unknown>;

    if (
      typeof datos.pedido_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(datos.pedido_id) ||
      typeof datos.estado !== "string" ||
      !ESTADOS_VALIDOS.includes(datos.estado as EstadoPedido)
    ) {
      return NextResponse.json(
        { error: "El pedido o el estado solicitado no son válidos." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("pedidos_actualizar_estado", {
      p_pedido_id: datos.pedido_id,
      p_estado: datos.estado,
    });

    if (error) {
      console.error("[API pedidos pendientes PATCH]", error.message);
      return NextResponse.json(
        { error: "No fue posible actualizar el pedido. Verifica sus permisos y estado actual." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      mensaje: "El pedido se actualizó correctamente.",
    });
  } catch (error) {
    console.error("[API pedidos pendientes PATCH] Error inesperado:", error);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al actualizar el pedido." },
      { status: 500 }
    );
  }
}
