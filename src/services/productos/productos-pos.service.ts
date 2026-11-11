import { createClient } from "@/lib/supabase/browser";
import type { ProductoPOS } from "@/types/pos/pos.types";

interface ProductoBD {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  unidad: string;
  precio: number | string;
  tasa_impuesto: number | string;
  imagen_path: string | null;
}

interface InventarioBD {
  producto_id: string;
  existencia: number | string;
  existencia_minima: number | string;
}

export async function listarProductosPOS(): Promise<ProductoPOS[]> {
  const supabase = createClient();

  const [productosResultado, inventarioResultado] = await Promise.all([
    supabase
      .from("productos")
      .select(
        "id,codigo,nombre,descripcion,unidad,precio,tasa_impuesto,imagen_path",
      )
      .eq("activo", true)
      .order("nombre", { ascending: true }),

    supabase
      .from("inventario")
      .select("producto_id,existencia,existencia_minima"),
  ]);

  if (productosResultado.error) {
    throw new Error(productosResultado.error.message);
  }

  if (inventarioResultado.error) {
    throw new Error(inventarioResultado.error.message);
  }

  const productos = (productosResultado.data ?? []) as unknown as ProductoBD[];
  const inventarios = (inventarioResultado.data ?? []) as unknown as InventarioBD[];

  const inventarioPorProducto = new Map(
    inventarios.map((item) => [
      item.producto_id,
      {
        existencia: Number(item.existencia),
        existencia_minima: Number(item.existencia_minima),
      },
    ]),
  );

  return productos.map((producto) => {
    const inventario = inventarioPorProducto.get(producto.id);

    const imagenUrl = producto.imagen_path
      ? supabase.storage
          .from("imagenes-productos")
          .getPublicUrl(producto.imagen_path).data.publicUrl
      : null;

    return {
      id: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      unidad: producto.unidad,
      precio: Number(producto.precio),
      tasa_impuesto: Number(producto.tasa_impuesto),
      existencia: inventario?.existencia ?? 0,
      existencia_minima: inventario?.existencia_minima ?? 0,
      imagen_url: imagenUrl,
    };
  });
}