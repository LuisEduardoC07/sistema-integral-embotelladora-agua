import "server-only";

import { createClient } from "@/lib/supabase/server";
import { consultarHistorialVentas } from "@/services/ventas/historial-ventas.service";
import type { ProductoGestion } from "@/types/productos/productos.types";

export interface ResumenDashboard {
  pedidosPendientes: number;
  productosActivos: number;
  ventasCompletadas: number;
  ingresosTotales: number;
  productosStockBajo: number;
  totalProductos: number;
}

export async function obtenerResumenDashboard(): Promise<ResumenDashboard> {
  const supabase = await createClient();

  const [productosResult, pedidosResult, ventasResult] = await Promise.all([
    supabase.rpc("productos_listar_gestion"),

    supabase
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente"),

    consultarHistorialVentas({ limite: 1 }),
  ]);

  if (productosResult.error) {
    throw new Error(
      `No se pudieron consultar los productos: ${productosResult.error.message}`
    );
  }

  if (pedidosResult.error) {
    throw new Error(
      `No se pudieron consultar los pedidos: ${pedidosResult.error.message}`
    );
  }

  const productos = (productosResult.data ?? []) as ProductoGestion[];
  const estadisticas = ventasResult.estadisticas;

  return {
    pedidosPendientes: pedidosResult.count ?? 0,
    productosActivos: productos.filter((producto) => producto.activo).length,
    ventasCompletadas: Number(estadisticas.cantidad_ventas ?? 0),
    ingresosTotales: Number(estadisticas.total_ventas ?? 0),
    productosStockBajo: productos.filter(
      (producto) =>
        producto.activo &&
        Number(producto.existencia ?? 0) <=
          Number(producto.existencia_minima ?? 0)
    ).length,
    totalProductos: productos.length,
  };
}
