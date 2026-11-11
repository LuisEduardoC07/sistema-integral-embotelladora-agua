import { createClient } from "@/lib/supabase/browser";
import type {
  DatosEdicionProducto,
  DatosProducto,
  ProductoGestion,
  ResultadoGuardadoProducto,
} from "@/types/productos/productos.types";

const BUCKET = "imagenes-productos";
const TAMANO_MAXIMO = 5 * 1024 * 1024;

const TIPOS_IMAGEN: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function mensajeError(error: { message?: string } | null, fallback: string) {
  const mensaje = error?.message ?? fallback;

  if (mensaje.includes("productos_codigo_key")) {
    return "Ya existe un producto con ese código.";
  }

  if (mensaje.includes("duplicate key")) {
    return "Ya existe un registro con esos datos.";
  }

  if (mensaje.includes("42501") || mensaje.toLowerCase().includes("permission")) {
    return "No tienes permisos para realizar esta operación.";
  }

  return mensaje;
}

function validarImagen(archivo: File) {
  if (!TIPOS_IMAGEN[archivo.type]) {
    throw new Error("Formato no permitido. Utiliza JPG, PNG, WEBP o AVIF.");
  }

  if (archivo.size > TAMANO_MAXIMO) {
    throw new Error("La imagen supera el límite permitido de 5 MB.");
  }
}

function obtenerUrlImagen(path: string | null) {
  if (!path) return null;

  const supabase = createClient();
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function subirImagen(productoId: string, archivo: File) {
  validarImagen(archivo);

  const supabase = createClient();
  const extension = TIPOS_IMAGEN[archivo.type];
  const nombre = `${crypto.randomUUID()}.${extension}`;
  const path = `${productoId}/${nombre}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, archivo, {
      contentType: archivo.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(mensajeError(error, "No se pudo cargar la imagen."));
  }

  return path;
}

async function asociarImagen(productoId: string, path: string | null) {
  const supabase = createClient();

  const { error } = await supabase.rpc("productos_actualizar_imagen", {
    p_producto_id: productoId,
    p_imagen_path: path,
  });

  if (error) {
    throw new Error(mensajeError(error, "No se pudo guardar la imagen."));
  }
}

async function eliminarArchivo(path: string | null) {
  if (!path) return;

  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    console.error("No se pudo eliminar una imagen anterior:", error.message);
  }
}

export async function listarProductosGestion(): Promise<ProductoGestion[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("productos_listar_gestion");

  if (error) {
    throw new Error(mensajeError(error, "No se pudieron consultar los productos."));
  }

  return ((data ?? []) as Omit<ProductoGestion, "imagen_url">[]).map((producto) => ({
    ...producto,
    precio: Number(producto.precio),
    costo: Number(producto.costo),
    tasa_impuesto: Number(producto.tasa_impuesto),
    existencia: Number(producto.existencia),
    existencia_minima: Number(producto.existencia_minima),
    imagen_url: obtenerUrlImagen(producto.imagen_path),
  }));
}

export async function crearProducto(
  datos: DatosProducto,
  archivo: File | null
): Promise<ResultadoGuardadoProducto> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("productos_crear", {
    p_codigo: datos.codigo.trim(),
    p_nombre: datos.nombre.trim(),
    p_descripcion: datos.descripcion.trim() || null,
    p_unidad: datos.unidad,
    p_precio: datos.precio,
    p_costo: datos.costo,
    p_tasa_impuesto: datos.tasa_impuesto,
    p_existencia_inicial: datos.existencia_inicial,
    p_existencia_minima: datos.existencia_minima,
  });

  if (error) {
    throw new Error(mensajeError(error, "No se pudo registrar el producto."));
  }

  const id = data as string;

  if (!archivo) {
    return { id, advertencia: null };
  }

  let path: string | null = null;

  try {
    path = await subirImagen(id, archivo);
    await asociarImagen(id, path);
    return { id, advertencia: null };
  } catch (imagenError) {
    if (path) await eliminarArchivo(path);

    return {
      id,
      advertencia:
        imagenError instanceof Error
          ? `El producto se creó, pero la imagen no se guardó: ${imagenError.message}`
          : "El producto se creó, pero no se pudo guardar la imagen.",
    };
  }
}

export async function actualizarProducto(
  datos: DatosEdicionProducto,
  archivo: File | null,
  quitarImagen: boolean,
  imagenAnterior: string | null
): Promise<ResultadoGuardadoProducto> {
  const supabase = createClient();

  const { error } = await supabase.rpc("productos_actualizar", {
    p_producto_id: datos.id,
    p_codigo: datos.codigo.trim(),
    p_nombre: datos.nombre.trim(),
    p_descripcion: datos.descripcion.trim() || null,
    p_unidad: datos.unidad,
    p_precio: datos.precio,
    p_costo: datos.costo,
    p_tasa_impuesto: datos.tasa_impuesto,
    p_existencia_minima: datos.existencia_minima,
  });

  if (error) {
    throw new Error(mensajeError(error, "No se pudo actualizar el producto."));
  }

  if (!archivo && !quitarImagen) {
    return { id: datos.id, advertencia: null };
  }

  let nuevoPath: string | null = null;

  try {
    if (archivo) {
      nuevoPath = await subirImagen(datos.id, archivo);
    }

    await asociarImagen(datos.id, nuevoPath);

    if (imagenAnterior) {
      await eliminarArchivo(imagenAnterior);
    }

    return { id: datos.id, advertencia: null };
  } catch (imagenError) {
    if (nuevoPath) await eliminarArchivo(nuevoPath);

    return {
      id: datos.id,
      advertencia:
        imagenError instanceof Error
          ? `Los datos se actualizaron, pero la imagen no pudo modificarse: ${imagenError.message}`
          : "Los datos se actualizaron, pero hubo un problema con la imagen.",
    };
  }
}

export async function ajustarExistencia(
  productoId: string,
  nuevaExistencia: number,
  motivo: string
) {
  const supabase = createClient();

  const { error } = await supabase.rpc("productos_ajustar_existencia", {
    p_producto_id: productoId,
    p_nueva_existencia: nuevaExistencia,
    p_motivo: motivo.trim(),
  });

  if (error) {
    throw new Error(mensajeError(error, "No se pudo ajustar la existencia."));
  }
}

export async function cambiarEstadoProducto(
  productoId: string,
  activo: boolean
) {
  const supabase = createClient();

  const { error } = await supabase.rpc("productos_cambiar_estado", {
    p_producto_id: productoId,
    p_activo: activo,
  });

  if (error) {
    throw new Error(mensajeError(error, "No se pudo cambiar el estado."));
  }
}
