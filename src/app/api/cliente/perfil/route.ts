import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface DatosActualizacion {
  nombre?: unknown;
  telefono?: unknown;
  avatar_path?: unknown;
}

function respuestaError(mensaje: string, estado: number) {
  return NextResponse.json(
    { error: mensaje },
    { status: estado }
  );
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: errorAuth,
    } = await supabase.auth.getUser();

    if (errorAuth || !user) {
      return respuestaError("Debes iniciar sesión para actualizar tu perfil.", 401);
    }

    const { data: perfil, error: errorPerfil } = await supabase
      .from("profiles")
      .select(`
        id,
        estado,
        roles!profiles_rol_id_fkey (
          codigo
        )
      `)
      .eq("id", user.id)
      .maybeSingle();

    if (errorPerfil || !perfil) {
      return respuestaError("No fue posible verificar tu perfil.", 403);
    }

    const datosRol = perfil.roles as unknown as { codigo: string } | null;

    if (perfil.estado !== "activo" || datosRol?.codigo !== "cliente") {
      return respuestaError("No tienes autorización para modificar este perfil.", 403);
    }

    let body: DatosActualizacion;

    try {
      const contenido: unknown = await request.json();

      if (
        !contenido ||
        typeof contenido !== "object" ||
        Array.isArray(contenido)
      ) {
        return respuestaError("Los datos enviados no son válidos.", 400);
      }

      body = contenido as DatosActualizacion;
    } catch {
      return respuestaError("La solicitud no contiene JSON válido.", 400);
    }

    if (typeof body.nombre !== "string") {
      return respuestaError("El nombre es obligatorio.", 400);
    }

    const nombre = body.nombre.trim();

    if (nombre.length < 2 || nombre.length > 100) {
      return respuestaError("El nombre debe tener entre 2 y 100 caracteres.", 400);
    }

    if (
      body.telefono !== null &&
      body.telefono !== undefined &&
      typeof body.telefono !== "string"
    ) {
      return respuestaError("El teléfono no es válido.", 400);
    }

    const telefono =
      typeof body.telefono === "string"
        ? body.telefono.trim()
        : null;

    if (telefono && (
      telefono.length > 25 ||
      !/^[0-9+().\-\s]+$/.test(telefono)
    )) {
      return respuestaError("Revisa el formato del teléfono.", 400);
    }

    let avatarPath: string | null | undefined;

    if (Object.prototype.hasOwnProperty.call(body, "avatar_path")) {
      if (body.avatar_path === null) {
        avatarPath = null;
      } else if (typeof body.avatar_path === "string") {
        avatarPath = body.avatar_path;

        const patron = new RegExp(
          "^" + user.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          "/[a-f0-9-]{36}\\.(jpg|png|webp)$",
          "i"
        );

        if (!patron.test(avatarPath)) {
          return respuestaError("La fotografía seleccionada no es válida.", 400);
        }
      } else {
        return respuestaError("La ruta de la fotografía no es válida.", 400);
      }
    }

    const actualizacion: {
      nombre: string;
      telefono: string | null;
      avatar_path?: string | null;
    } = {
      nombre,
      telefono,
    };

    if (avatarPath !== undefined) {
      actualizacion.avatar_path = avatarPath;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(actualizacion)
      .eq("id", user.id)
      .select("id, nombre, telefono, avatar_path, actualizado_en")
      .maybeSingle();

    if (error || !data) {
      console.error("Error al actualizar el perfil:", error?.code);
      return respuestaError("No fue posible guardar los cambios del perfil.", 400);
    }

    return NextResponse.json({
      mensaje: "Tu perfil se actualizó correctamente.",
      perfil: data,
    });
  } catch (error) {
    console.error("Error inesperado al actualizar perfil:", error);
    return respuestaError("Ocurrió un error al procesar la actualización.", 500);
  }
}
