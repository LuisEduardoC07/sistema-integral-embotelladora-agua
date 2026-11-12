import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ErrorAutorizacion,
  exigirPermiso,
} from "@/lib/seguridad/autorizacion";

type Rol = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  es_sistema: boolean;
};

type Permiso = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  modulo: string;
};

type RelacionRolPermiso = {
  rol_id: string;
  permiso_id: string;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PERMISOS_EXCLUSIVOS_SUPERUSUARIO = new Set([
  "usuarios.gestionar_roles",
  "usuarios.gestionar_permisos",
  "usuarios.crear_administrador",
  "usuarios.auditoria",
  "usuarios.suspender_administrador",
  "usuarios.reactivar_administrador",
]);

const PERMISOS_CLIENTE = new Set([
  "perfil.consultar",
  "productos.consultar",
  "pedidos.consultar_propios",
  "pedidos.crear",
  "cotizaciones.crear",
]);

const PERMISOS_RESTRINGIDOS_CAJERO = new Set([
  "productos.crear",
  "productos.editar",
  "productos.desactivar",
  "categorias.gestionar",
  "inventario.ajustar",
  "ventas.anular",
  "pedidos.consultar_todos",
  "pedidos.gestionar",
  "caja.consultar_todas",
  "caja.gestionar_todas",
  "sistema.mantenimiento",
]);

function responderError(mensaje: string, estado: number) {
  return NextResponse.json(
    { error: mensaje },
    {
      status: estado,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function respuestaCorrecta(datos: Record<string, unknown>) {
  return NextResponse.json(datos, {
    headers: { "Cache-Control": "no-store" },
  });
}

function validarPermisosDelRol(
  codigoRol: string,
  permisos: Permiso[]
): string | null {
  if (codigoRol === "superusuario") {
    return "Los permisos del superusuario no se pueden modificar.";
  }

  for (const permiso of permisos) {
    if (PERMISOS_EXCLUSIVOS_SUPERUSUARIO.has(permiso.codigo)) {
      return `El permiso "${permiso.nombre}" está reservado al superusuario.`;
    }

    if (
      codigoRol === "cliente" &&
      !PERMISOS_CLIENTE.has(permiso.codigo)
    ) {
      return `El rol cliente no puede recibir el permiso "${permiso.nombre}".`;
    }

    if (
      codigoRol === "cajero" &&
      (
        permiso.codigo.startsWith("usuarios.") ||
        permiso.codigo.startsWith("sistema.") ||
        permiso.codigo.startsWith("auditoria.") ||
        PERMISOS_RESTRINGIDOS_CAJERO.has(permiso.codigo)
      )
    ) {
      return `El permiso "${permiso.nombre}" no puede asignarse al rol cajero.`;
    }
  }

  return null;
}

async function registrarAuditoria(
  admin: ReturnType<typeof createAdminClient>,
  actorId: string,
  rolId: string,
  accion: string,
  datos: Record<string, unknown>
) {
  const { error } = await admin.from("auditoria_operaciones").insert({
    actor_id: actorId,
    entidad: "rol",
    entidad_id: rolId,
    accion,
    datos,
  });

  if (error) {
    console.error("[Auditoría de roles]", error.message);
    throw new Error("No fue posible registrar el cambio en la auditoría.");
  }
}

export async function GET() {
  try {
    await exigirPermiso("usuarios.gestionar_roles");

    const admin = createAdminClient();

    const [
      { data: roles, error: errorRoles },
      { data: permisos, error: errorPermisos },
      { data: relaciones, error: errorRelaciones },
    ] = await Promise.all([
      admin
        .from("roles")
        .select("id,codigo,nombre,descripcion,es_sistema")
        .order("nombre", { ascending: true }),

      admin
        .from("permisos")
        .select("id,codigo,nombre,descripcion,modulo")
        .order("modulo", { ascending: true })
        .order("nombre", { ascending: true }),

      admin
        .from("rol_permisos")
        .select("rol_id,permiso_id"),
    ]);

    if (errorRoles || errorPermisos || errorRelaciones) {
      console.error("[Roles y permisos]", {
        roles: errorRoles?.message,
        permisos: errorPermisos?.message,
        relaciones: errorRelaciones?.message,
      });

      throw new Error("No fue posible consultar el catálogo de roles y permisos.");
    }

    const relacionesPorRol = new Map<string, string[]>();

    for (const relacion of (relaciones ?? []) as RelacionRolPermiso[]) {
      const actuales = relacionesPorRol.get(relacion.rol_id) ?? [];
      actuales.push(relacion.permiso_id);
      relacionesPorRol.set(relacion.rol_id, actuales);
    }

    const resultado = ((roles ?? []) as Rol[]).map((rol) => ({
      ...rol,
      permisosIds: relacionesPorRol.get(rol.id) ?? [],
    }));

    return respuestaCorrecta({
      roles: resultado,
      permisos: (permisos ?? []) as Permiso[],
    });
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return responderError(error.message, error.status);
    }

    console.error("[GET roles y permisos]", error);
    return responderError(
      error instanceof Error
        ? error.message
        : "No fue posible cargar los roles y permisos.",
      500
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cuerpo: unknown = await request.json();

    if (
      !cuerpo ||
      typeof cuerpo !== "object" ||
      Array.isArray(cuerpo)
    ) {
      return responderError("La solicitud no contiene datos válidos.", 400);
    }

    const datos = cuerpo as Record<string, unknown>;
    const rolId = datos.rolId;

    if (typeof rolId !== "string" || !UUID.test(rolId)) {
      return responderError("El identificador del rol no es válido.", 400);
    }

    const admin = createAdminClient();

    const { data: rol, error: errorRol } = await admin
      .from("roles")
      .select("id,codigo,nombre,descripcion,es_sistema")
      .eq("id", rolId)
      .maybeSingle();

    if (errorRol) {
      throw new Error("No fue posible consultar el rol seleccionado.");
    }

    if (!rol) {
      return responderError("El rol solicitado no existe.", 404);
    }

    if (datos.accion === "actualizar_datos") {
      const actor = await exigirPermiso("usuarios.gestionar_roles");

      const nombre =
        typeof datos.nombre === "string" ? datos.nombre.trim() : "";

      const descripcion =
        typeof datos.descripcion === "string"
          ? datos.descripcion.trim()
          : "";

      if (!nombre || nombre.length > 60) {
        return responderError(
          "El nombre debe tener entre 1 y 60 caracteres.",
          400
        );
      }

      if (descripcion.length > 240) {
        return responderError(
          "La descripción no puede superar los 240 caracteres.",
          400
        );
      }

      const { error: errorActualizacion } = await admin
        .from("roles")
        .update({
          nombre,
          descripcion: descripcion || null,
        })
        .eq("id", rolId);

      if (errorActualizacion) {
        throw new Error("No fue posible actualizar los datos del rol.");
      }

      try {
        await registrarAuditoria(
          admin,
          actor.id,
          rolId,
          "actualizar_datos_rol",
          {
            codigo: rol.codigo,
            anteriores: {
              nombre: rol.nombre,
              descripcion: rol.descripcion,
            },
            nuevos: {
              nombre,
              descripcion: descripcion || null,
            },
          }
        );
      } catch (errorAuditoria) {
        const { error: errorReversion } = await admin
          .from("roles")
          .update({
            nombre: rol.nombre,
            descripcion: rol.descripcion,
          })
          .eq("id", rolId);

        if (errorReversion) {
          console.error("[Reversión de datos del rol]", errorReversion.message);
        }

        throw errorAuditoria;
      }

      return respuestaCorrecta({
        mensaje: "Los datos del rol se actualizaron correctamente.",
      });
    }

    if (datos.accion === "actualizar_permisos") {
      const actor = await exigirPermiso("usuarios.gestionar_permisos");

      if (rol.codigo === "superusuario") {
        return responderError(
          "El superusuario conserva todos los permisos y no puede modificarse.",
          403
        );
      }

      const permisosIds = datos.permisosIds;

      if (
        !Array.isArray(permisosIds) ||
        permisosIds.length > 500 ||
        !permisosIds.every(
          (id): id is string => typeof id === "string" && UUID.test(id)
        )
      ) {
        return responderError("La lista de permisos no es válida.", 400);
      }

      const permisosUnicos = [...new Set(permisosIds)];

      if (permisosUnicos.length !== permisosIds.length) {
        return responderError(
          "La lista contiene permisos duplicados.",
          400
        );
      }

      const { data: catalogo, error: errorCatalogo } = await admin
        .from("permisos")
        .select("id,codigo,nombre,descripcion,modulo")
        .in("id", permisosUnicos.length ? permisosUnicos : [
          "00000000-0000-4000-8000-000000000000",
        ]);

      if (errorCatalogo) {
        throw new Error("No fue posible validar los permisos seleccionados.");
      }

      const permisosValidados = (catalogo ?? []) as Permiso[];

      if (permisosValidados.length !== permisosUnicos.length) {
        return responderError(
          "Uno o más permisos seleccionados no existen.",
          400
        );
      }

      const errorRestriccion = validarPermisosDelRol(
        rol.codigo,
        permisosValidados
      );

      if (errorRestriccion) {
        return responderError(errorRestriccion, 403);
      }

      const { data: actuales, error: errorActuales } = await admin
        .from("rol_permisos")
        .select("permiso_id")
        .eq("rol_id", rolId);

      if (errorActuales) {
        throw new Error("No fue posible consultar las asignaciones actuales.");
      }

      const idsActuales = (actuales ?? []).map(
        (relacion: { permiso_id: string }) => relacion.permiso_id
      );

      const conjuntoActual = new Set(idsActuales);
      const conjuntoNuevo = new Set(permisosUnicos);

      const agregar = permisosUnicos.filter((id) => !conjuntoActual.has(id));
      const retirar = idsActuales.filter((id) => !conjuntoNuevo.has(id));

      if (agregar.length === 0 && retirar.length === 0) {
        return respuestaCorrecta({
          mensaje: "El rol ya tiene exactamente esos permisos.",
        });
      }

      if (agregar.length > 0) {
        const { error: errorAgregar } = await admin
          .from("rol_permisos")
          .insert(
            agregar.map((permisoId) => ({
              rol_id: rolId,
              permiso_id: permisoId,
            }))
          );

        if (errorAgregar) {
          throw new Error("No fue posible agregar los nuevos permisos.");
        }
      }

      if (retirar.length > 0) {
        const { error: errorRetirar } = await admin
          .from("rol_permisos")
          .delete()
          .eq("rol_id", rolId)
          .in("permiso_id", retirar);

        if (errorRetirar) {
          if (agregar.length > 0) {
            const { error: errorReversion } = await admin
              .from("rol_permisos")
              .delete()
              .eq("rol_id", rolId)
              .in("permiso_id", agregar);

            if (errorReversion) {
              console.error("[Reversión de permisos]", errorReversion.message);
            }
          }

          throw new Error("No fue posible actualizar las asignaciones del rol.");
        }
      }

      try {
        await registrarAuditoria(
          admin,
          actor.id,
          rolId,
          "actualizar_permisos_rol",
          {
            codigo: rol.codigo,
            permisos_agregados: agregar,
            permisos_retirados: retirar,
            total_anterior: idsActuales.length,
            total_nuevo: permisosUnicos.length,
          }
        );
      } catch (errorAuditoria) {
        if (retirar.length > 0) {
          const { error: errorRestaurar } = await admin
            .from("rol_permisos")
            .insert(
              retirar.map((permisoId) => ({
                rol_id: rolId,
                permiso_id: permisoId,
              }))
            );

          if (errorRestaurar) {
            console.error("[Restauración de permisos retirados]", errorRestaurar.message);
          }
        }

        if (agregar.length > 0) {
          const { error: errorQuitar } = await admin
            .from("rol_permisos")
            .delete()
            .eq("rol_id", rolId)
            .in("permiso_id", agregar);

          if (errorQuitar) {
            console.error("[Reversión de permisos agregados]", errorQuitar.message);
          }
        }

        throw errorAuditoria;
      }

      return respuestaCorrecta({
        mensaje: "Los permisos del rol se actualizaron correctamente.",
      });
    }

    return responderError("La operación solicitada no es válida.", 400);
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return responderError(error.message, error.status);
    }

    console.error("[PATCH roles y permisos]", error);
    return responderError(
      error instanceof Error
        ? error.message
        : "No fue posible guardar los cambios.",
      500
    );
  }
}