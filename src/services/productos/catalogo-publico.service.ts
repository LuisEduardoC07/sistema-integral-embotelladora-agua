import { createClient } from "@/lib/supabase/server";

export interface ProductoCatalogoPublico {
  id: string;
  nombre: string;
  descripcion: string | null;
  unidad: string;
  precio: number;
  imagen_url: string | null;
}

interface FilaCatalogoPublico {
  id: string;
  nombre: string;
  descripcion: string | null;
  unidad: string;
  precio: number | string;
  imagen_path: string | null;
}

export async function obtenerCatalogoPublico(): Promise<{
  productos: ProductoCatalogoPublico[];
  error: boolean;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "catalogo_publico_productos"
  );

  if (error) {
    console.error(
      "[Catalogo publico] No se pudieron consultar los productos:",
      error.message
    );

    return {
      productos: [],
      error: true,
    };
  }

  const filas = (data ?? []) as unknown as FilaCatalogoPublico[];

  const productos = filas.map((producto) => {
    const imagenUrl = producto.imagen_path
      ? supabase.storage
          .from("imagenes-productos")
          .getPublicUrl(producto.imagen_path).data.publicUrl
      : null;

    return {
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      unidad: producto.unidad,
      precio: Number(producto.precio),
      imagen_url: imagenUrl,
    };
  });

  return {
    productos,
    error: false,
  };
}