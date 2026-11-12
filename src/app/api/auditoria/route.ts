import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ErrorAutorizacion,
  exigirPermiso,
} from "@/lib/seguridad/autorizacion";


function errorRespuesta(mensaje: string, estado: number) {
  return NextResponse.json(
    { error: mensaje },
    {
      status: estado,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function GET() {
  try {
    await exigirPermiso("usuarios.auditoria");
    await exigirPermiso("auditoria.operaciones.consultar");

    const admin = createAdminClient();

    const [usuariosResult, operacionesResult] = await Promise.all([
      admin
        .from("auditoria_usuarios")
        .select(`
          id,
          actor_id,
          usuario_afectado_id,
          accion,
          datos_anteriores,
          datos_nuevos,
          motivo,
          creado_en
        `)
        .order("creado_en", { ascending: false })
        .limit(150),

      admin
        .from("auditoria_operaciones")
        .select(`
          id,
          actor_id,
          entidad,
          entidad_id,
          accion,
          datos,
          creado_en
        `)
        .order("creado_en", { ascending: false })
        .limit(150),
    ]);

    if (usuariosResult.error) {
      console.error("[Auditoría usuarios]", usuariosResult.error.message);
      throw new Error("No fue posible consultar la auditoría de usuarios.");
    }

    if (operacionesResult.error) {
      console.error("[Auditoría operaciones]", operacionesResult.error.message);
      throw new Error("No fue posible consultar la auditoría de operaciones.");
    }

    const registrosUsuarios = usuariosResult.data ?? [];
    const registrosOperaciones = operacionesResult.data ?? [];

    const ids = Array.from(
      new Set([
        ...registrosUsuarios.flatMap((registro) =>
          [registro.actor_id, registro.usuario_afectado_id].filter(
            (id): id is string => Boolean(id)
          )
        ),
        ...registrosOperaciones.map((registro) => registro.actor_id),
      ])
    );

    const perfilesMap = new Map<
      string,
      { nombre: string; rol: string }
    >();

    if (ids.length > 0) {
      const { data: perfiles, error: errorPerfiles } = await admin
        .from("profiles")
        .select(`
          id,
          nombre,
          roles!profiles_rol_id_fkey (
            codigo
          )
        `)
        .in("id", ids);

      if (errorPerfiles) {
        console.error("[Perfiles de auditoría]", errorPerfiles.message);
        throw new Error("No fue posible consultar los responsables.");
      }

      type PerfilConRol = {
        id: string;
        nombre: string;
        roles:
          | { codigo: string }
          | { codigo: string }[]
          | null;
      };

      for (const perfil of (perfiles ?? []) as unknown as PerfilConRol[]) {
        const relacion = perfil.roles;
        const rol = Array.isArray(relacion)
          ? relacion[0]?.codigo
          : relacion?.codigo;

        perfilesMap.set(perfil.id, {
          nombre: perfil.nombre,
          rol: rol ?? "Sin rol",
        });
      }
    }

    const idsSinPerfil = ids.filter((id) => !perfilesMap.has(id));

    if (idsSinPerfil.length > 0) {
      const { data: identidadesArchivadas, error: errorIdentidades } = await admin
        .from("identidades_usuarios_eliminados")
        .select("usuario_id, nombre, rol_codigo")
        .in("usuario_id", idsSinPerfil);

      if (errorIdentidades) {
        console.error("[Identidades históricas de auditoría]", errorIdentidades.message);
        throw new Error("No fue posible consultar las identidades históricas.");
      }

      for (const identidad of identidadesArchivadas ?? []) {
        perfilesMap.set(identidad.usuario_id, {
          nombre: identidad.nombre,
          rol: identidad.rol_codigo ?? "Sin rol",
        });
      }
    }
    const usuarios = registrosUsuarios.map((registro) => ({
      id: registro.id,
      tipo: "usuarios" as const,
      accion: registro.accion,
      fecha: registro.creado_en,
      actorId: registro.actor_id,
      actorNombre: registro.actor_id
        ? perfilesMap.get(registro.actor_id)?.nombre ?? "Usuario no disponible"
        : "Sistema",
      actorRol: registro.actor_id
        ? perfilesMap.get(registro.actor_id)?.rol ?? "Sin rol"
        : "Sistema",
      afectadoId: registro.usuario_afectado_id,
      afectadoNombre: registro.usuario_afectado_id
        ? perfilesMap.get(registro.usuario_afectado_id)?.nombre ?? "Usuario no disponible"
        : null,
      entidad: "Usuarios",
      entidadId: registro.usuario_afectado_id,
      motivo: registro.motivo,
      anteriores: registro.datos_anteriores,
      nuevos: registro.datos_nuevos,
      datos: null,
    }));

    const operaciones = registrosOperaciones.map((registro) => ({
      id: registro.id,
      tipo: "operaciones" as const,
      accion: registro.accion,
      fecha: registro.creado_en,
      actorId: registro.actor_id,
      actorNombre:
        perfilesMap.get(registro.actor_id)?.nombre ?? "Usuario no disponible",
      actorRol: perfilesMap.get(registro.actor_id)?.rol ?? "Sin rol",
      afectadoId: null,
      afectadoNombre: null,
      entidad: registro.entidad,
      entidadId: registro.entidad_id,
      motivo: null,
      anteriores: null,
      nuevos: null,
      datos: registro.datos,
    }));

    const registros = [...usuarios, ...operaciones].sort(
      (a, b) =>
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    return NextResponse.json(
      {
        registros,
        total: registros.length,
        limitePorHistorial: 150,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return errorRespuesta(error.message, error.status);
    }

    console.error("[API auditoría GET]", error);
    return errorRespuesta(
      error instanceof Error
        ? error.message
        : "No fue posible consultar las auditorías.",
      500
    );
  }
}