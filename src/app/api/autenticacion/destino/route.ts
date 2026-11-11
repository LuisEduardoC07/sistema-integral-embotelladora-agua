import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const RUTAS_POR_ROL: Record<string, string> = {
  superusuario: "/superusuario",
  administrador: "/administrador",
  cajero: "/cajero",
  cliente: "/cliente",
};

function responder(
  mensaje: string,
  estado: number,
  destino?: string
) {
  return NextResponse.json(
    { exitoso: estado === 200, mensaje, destino: destino ?? null },
    {
      status: estado,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: errorAuth,
    } = await supabase.auth.getUser();

    if (errorAuth || !user) {
      return responder("La sesión no es válida.", 401);
    }

    const { data: perfil, error: errorPerfil } = await supabase
      .from("profiles")
      .select("estado, rol_id")
      .eq("id", user.id)
      .maybeSingle();

    if (errorPerfil) {
      return responder("No fue posible validar tu perfil.", 503);
    }

    if (!perfil || perfil.estado !== "activo") {
      await supabase.auth.signOut();

      return responder(
        "Tu cuenta no está habilitada para acceder al sistema.",
        403
      );
    }

    const { data: rol, error: errorRol } = await supabase
      .from("roles")
      .select("codigo")
      .eq("id", perfil.rol_id)
      .maybeSingle();

    if (errorRol) {
      return responder("No fue posible validar el rol de tu cuenta.", 503);
    }

    const destino = rol?.codigo
      ? RUTAS_POR_ROL[rol.codigo]
      : undefined;

    if (!destino) {
      await supabase.auth.signOut();

      return responder("El rol de tu cuenta no es válido.", 403);
    }

    return responder("Perfil validado correctamente.", 200, destino);
  } catch {
    return responder("No fue posible validar el acceso.", 503);
  }
}
