import { NextResponse, type NextRequest } from "next/server";
import {
  ErrorAutorizacion,
  exigirPermiso,
} from "@/lib/seguridad/autorizacion";
import { consultarHistorialVentas } from "@/services/ventas/historial-ventas.service";
import type {
  EstadoVentaHistorial,
  FiltrosHistorialVentas,
} from "@/types/ventas/historial-ventas.types";
import type { MetodoPagoPOS } from "@/types/pos/pos.types";

const METODOS_VALIDOS: MetodoPagoPOS[] = [
  "efectivo",
  "tarjeta",
  "transferencia",
  "otro",
];

const ESTADOS_VALIDOS: EstadoVentaHistorial[] = [
  "completada",
  "anulada",
];

const UUID_VALIDO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TIMESTAMP_ISO_VALIDO =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/i;

function respuestaError(mensaje: string, estado: number) {
  return NextResponse.json(
    { error: mensaje },
    {
      status: estado,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function fechaCalendarioValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const [anio, mes, dia] = valor.split("-").map(Number);

  if (anio < 1000 || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    return false;
  }

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

function timestampValido(valor: string): boolean {
  return (
    TIMESTAMP_ISO_VALIDO.test(valor) &&
    Number.isFinite(Date.parse(valor))
  );
}

export async function GET(request: NextRequest) {
  try {
    await exigirPermiso("ventas.consultar");

    const params = request.nextUrl.searchParams;

    const metodo = (params.get("metodoPago") ?? "").trim();
    const estado = (params.get("estado") ?? "").trim();
    const busqueda = (params.get("busqueda") ?? "").trim();
    const fechaDesde = (params.get("fechaDesde") ?? "").trim();
    const fechaHasta = (params.get("fechaHasta") ?? "").trim();
    const cajeroId = (params.get("cajeroId") ?? "").trim();
    const cursorFecha = (params.get("cursorFecha") ?? "").trim();
    const cursorId = (params.get("cursorId") ?? "").trim();

    if (metodo && !METODOS_VALIDOS.includes(metodo as MetodoPagoPOS)) {
      return respuestaError("El método de pago no es válido.", 400);
    }

    if (estado && !ESTADOS_VALIDOS.includes(estado as EstadoVentaHistorial)) {
      return respuestaError("El estado de venta no es válido.", 400);
    }

    if (busqueda.length > 100) {
      return respuestaError(
        "La búsqueda admite máximo 100 caracteres.",
        400
      );
    }

    if (
      (fechaDesde && !fechaCalendarioValida(fechaDesde)) ||
      (fechaHasta && !fechaCalendarioValida(fechaHasta))
    ) {
      return respuestaError("Una de las fechas no es válida.", 400);
    }

    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      return respuestaError(
        "La fecha inicial no puede superar la fecha final.",
        400
      );
    }

    if (cajeroId && !UUID_VALIDO.test(cajeroId)) {
      return respuestaError("El identificador del cajero no es válido.", 400);
    }

    if (
      (cursorFecha && !cursorId) ||
      (!cursorFecha && cursorId)
    ) {
      return respuestaError(
        "El cursor de paginación está incompleto.",
        400
      );
    }

    if (
      cursorId &&
      (!UUID_VALIDO.test(cursorId) || !timestampValido(cursorFecha))
    ) {
      return respuestaError(
        "El cursor de paginación no es válido.",
        400
      );
    }

    const filtros: FiltrosHistorialVentas = {
      limite: 25,
      fechaDesde,
      fechaHasta,
      cajeroId,
      metodoPago: metodo as MetodoPagoPOS | "",
      estado: estado as EstadoVentaHistorial | "",
      busqueda,
      cursorFecha,
      cursorId,
    };

    const datos = await consultarHistorialVentas(filtros);

    return NextResponse.json(
      { datos },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return respuestaError(error.message, error.status);
    }

    console.error("[API ventas/historial] Error interno:", error);

    return respuestaError(
      "No fue posible consultar el historial de ventas. Inténtalo nuevamente.",
      500
    );
  }
}