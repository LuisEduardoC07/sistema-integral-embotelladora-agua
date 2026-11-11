import { createClient } from "@/lib/supabase/server";
import type {
  PerfilUsuario,
  ResultadoPerfil,
  ResultadoPermiso,
} from "@/types/usuarios/perfil.types";

/**
 * Obtiene el perfil correspondiente al usuario autenticado.
 * La consulta respeta las políticas RLS de Supabase.
 */
export async function obtenerPerfilActual(): Promise<ResultadoPerfil> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: errorAuth,
    } = await supabase.auth.getUser();

    if (errorAuth || !user) {
      return {
        perfil: null,
        error: "No existe una sesión autenticada.",
      };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        rol_id,
        nombre,
        telefono,
        estado,
        creado_en,
        actualizado_en,
        roles!profiles_rol_id_fkey (
          codigo,
          nombre
        )
      `)
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return {
        perfil: null,
        error: "No fue posible consultar el perfil.",
      };
    }

    if (!data) {
      return {
        perfil: null,
        error: "El usuario todavía no tiene un perfil registrado.",
      };
    }

    const perfil = data as unknown as PerfilUsuario;

    return {
      perfil,
      error: null,
    };
  } catch {
    return {
      perfil: null,
      error: "Ocurrió un error al obtener el perfil.",
    };
  }
}

/**
 * Comprueba un permiso mediante la función SQL central.
 * La base de datos valida identidad, estado y permisos del usuario.
 */
export async function comprobarPermiso(
  codigoPermiso: string
): Promise<ResultadoPermiso> {
  if (!codigoPermiso.trim()) {
    return {
      autorizado: false,
      error: "El código del permiso es obligatorio.",
    };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: errorAuth,
    } = await supabase.auth.getUser();

    if (errorAuth || !user) {
      return {
        autorizado: false,
        error: "No existe una sesión autenticada.",
      };
    }

    const { data, error } = await supabase.rpc("tiene_permiso", {
      p_codigo_permiso: codigoPermiso,
    });

    if (error) {
      return {
        autorizado: false,
        error: "No fue posible comprobar el permiso.",
      };
    }

    return {
      autorizado: data === true,
      error: null,
    };
  } catch {
    return {
      autorizado: false,
      error: "Ocurrió un error al comprobar el permiso.",
    };
  }
}
