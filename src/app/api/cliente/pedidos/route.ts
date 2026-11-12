import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ItemCarritoPedido } from "@/types/pedidos/pedidos.types";

interface SolicitudCrearPedido {
  items: ItemCarritoPedido[];
  direccion: string;
  fecha_entrega: string;
  hora_entrega: string;
  observaciones?: string;
}

function esFechaValida(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function esHoraValida(valor: unknown): valor is string {
  return typeof valor === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: errorAuth,
    } = await supabase.auth.getUser();

    if (errorAuth || !user) {
      return NextResponse.json(
        { error: "Tu sesión expiró. Inicia sesión nuevamente." },
        { status: 401 }
      );
    }

    const { data: perfil, error: errorPerfil } = await supabase
      .from("profiles")
      .select(`
        estado,
        roles!profiles_rol_id_fkey (
          codigo
        )
      `)
      .eq("id", user.id)
      .maybeSingle();

    if (errorPerfil || !perfil) {
      return NextResponse.json(
        { error: "No se pudo validar tu perfil." },
        { status: 403 }
      );
    }

    const rol = (perfil as unknown as {
      estado: string;
      roles: { codigo: string } | { codigo: string }[];
    }).roles;

    const codigoRol = Array.isArray(rol) ? rol[0]?.codigo : rol?.codigo;

    if (perfil.estado !== "activo" || codigoRol !== "cliente") {
      return NextResponse.json(
        { error: "Esta cuenta no está habilitada para realizar pedidos de cliente." },
        { status: 403 }
      );
    }

    let cuerpo: SolicitudCrearPedido;
    try {
      cuerpo = await request.json() as SolicitudCrearPedido;
    } catch {
      return NextResponse.json(
        { error: "La solicitud no contiene datos válidos." },
        { status: 400 }
      );
    }

    if (
      !cuerpo ||
      typeof cuerpo !== "object" ||
      Array.isArray(cuerpo)
    ) {
      return NextResponse.json(
        { error: "Los datos enviados no tienen un formato válido." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(cuerpo.items) ||
      cuerpo.items.length < 1 ||
      cuerpo.items.length > 50 ||
      cuerpo.items.some((item) =>
        !item ||
        typeof item.producto_id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.producto_id) ||
        typeof item.cantidad !== "number" ||
        !Number.isFinite(item.cantidad) ||
        item.cantidad <= 0 ||
        item.cantidad > 9999
      )
    ) {
      return NextResponse.json(
        { error: "El carrito contiene productos o cantidades inválidas." },
        { status: 400 }
      );
    }

    if (
      typeof cuerpo.direccion !== "string" ||
      cuerpo.direccion.trim().length < 5 ||
      cuerpo.direccion.trim().length > 500
    ) {
      return NextResponse.json(
        { error: "Escribe una dirección de entrega válida." },
        { status: 400 }
      );
    }

    if (!esFechaValida(cuerpo.fecha_entrega) || !esHoraValida(cuerpo.hora_entrega)) {
      return NextResponse.json(
        { error: "Selecciona una fecha y una hora de entrega válidas." },
        { status: 400 }
      );
    }

    const observaciones =
      typeof cuerpo.observaciones === "string"
        ? cuerpo.observaciones.trim().slice(0, 1000)
        : null;

    const { data: pedidoId, error } = await supabase.rpc("pedidos_crear", {
      p_items: cuerpo.items.map((item) => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
      })),
      p_direccion: cuerpo.direccion.trim(),
      p_fecha_entrega: cuerpo.fecha_entrega,
      p_hora_entrega: cuerpo.hora_entrega,
      p_observaciones: observaciones,
    });

    if (error) {
      console.error("[Crear pedido] Supabase:", error.message);
      return NextResponse.json(
        { error: "No fue posible registrar el pedido. Verifica los datos e inténtalo nuevamente." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { pedido_id: pedidoId, mensaje: "Tu solicitud de pedido fue registrada." },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Crear pedido] Error inesperado:", error);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al registrar tu pedido." },
      { status: 500 }
    );
  }
}
