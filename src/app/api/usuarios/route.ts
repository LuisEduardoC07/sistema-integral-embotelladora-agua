import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ErrorAutorizacion,
  exigirPermiso,
} from "@/lib/seguridad/autorizacion";


type RolGestionable = "cliente" | "administrador" | "cajero";
type EstadoPerfil = "pendiente" | "activo" | "suspendido";

interface PerfilGestion {
  id: string;
  nombre: string;
  telefono: string | null;
  estado: EstadoPerfil;
  creado_en: string;
  actualizado_en: string;
  rol_id: string;
  roles:
    | { codigo: string; nombre: string }
    | { codigo: string; nombre: string }[];
}

function responderError(mensaje: string, estado: number) {
  return NextResponse.json(
    { error: mensaje },
    {
      status: estado,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function normalizarRol(
  relacion: PerfilGestion["roles"]
): { codigo: string; nombre: string } | null {
  return Array.isArray(relacion) ? relacion[0] ?? null : relacion;
}

function puedeGestionar(
  rolActor: string,
  rolObjetivo: string
): boolean {
  if (rolActor === "superusuario") {
    return rolObjetivo === "cliente" || rolObjetivo === "administrador" || rolObjetivo === "cajero";
  }

  return rolActor === "administrador" && rolObjetivo === "cajero";
}

function validarCorreo(valor: unknown): valor is string {
  return (
    typeof valor === "string" &&
    valor.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim())
  );
}

async function registrarAuditoria(
  admin: ReturnType<typeof createAdminClient>,
  datos: {
    actorId: string;
    usuarioId: string;
    accion: string;
    anteriores?: Record<string, unknown> | null;
    nuevos?: Record<string, unknown> | null;
    motivo?: string | null;
  }
) {
  const { error } = await admin.from("auditoria_usuarios").insert({
    actor_id: datos.actorId,
    usuario_afectado_id: datos.usuarioId,
    accion: datos.accion,
    datos_anteriores: datos.anteriores ?? null,
    datos_nuevos: datos.nuevos ?? null,
    motivo: datos.motivo ?? null,
  });

  if (error) {
    console.error("[AuditorÃƒÆ’Ã‚Â­a de usuarios]", error.message);
    throw new Error("No fue posible registrar la auditorÃƒÆ’Ã‚Â­a.");
  }
}

export async function GET() {
  try {
    const actor = await exigirPermiso("usuarios.consultar");
    const admin = createAdminClient();

    const rolesPermitidos: RolGestionable[] =
      actor.roles.codigo === "superusuario"
        ? ["cliente", "administrador", "cajero"]
        : actor.roles.codigo === "administrador"
          ? ["cajero"]
          : [];

    if (rolesPermitidos.length === 0) {
      return responderError("No tienes autorizaciÃƒÆ’Ã‚Â³n para consultar usuarios.", 403);
    }

    const { data: roles, error: errorRoles } = await admin
      .from("roles")
      .select("id,codigo,nombre")
      .in("codigo", rolesPermitidos);

    if (errorRoles || !roles?.length) {
      throw new Error("No fue posible consultar los roles.");
    }

    const idsRoles = roles.map((rol) => rol.id);

    const { data: perfiles, error: errorPerfiles } = await admin
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
      .in("rol_id", idsRoles)
      .order("creado_en", { ascending: false });

    if (errorPerfiles) {
      throw new Error("No fue posible consultar los perfiles.");
    }

    const usuariosAuth: Array<{
      id: string;
      email?: string;
    }> = [];

    for (let pagina = 1; pagina <= 20; pagina++) {
      const { data, error } = await admin.auth.admin.listUsers({
        page: pagina,
        perPage: 1000,
      });

      if (error) {
        throw new Error("No fue posible consultar los correos de usuario.");
      }

      usuariosAuth.push(
        ...data.users.map((usuario) => ({
          id: usuario.id,
          email: usuario.email,
        }))
      );

      if (data.users.length < 1000) break;
    }

    const correos = new Map(
      usuariosAuth.map((usuario) => [
        usuario.id,
        usuario.email ?? "",
      ])
    );

    const usuarios = ((perfiles ?? []) as unknown as PerfilGestion[])
      .map((perfil) => {
        const rol = normalizarRol(perfil.roles);

        return {
          id: perfil.id,
          nombre: perfil.nombre,
          email: correos.get(perfil.id) ?? "",
          telefono: perfil.telefono,
          estado: perfil.estado,
          creado_en: perfil.creado_en,
          actualizado_en: perfil.actualizado_en,
          rol: rol?.codigo ?? "",
          rol_nombre: rol?.nombre ?? "",
        };
      });

    let auditoria: Array<Record<string, unknown>> = [];

    if (actor.roles.codigo === "superusuario") {
      const { data, error } = await admin
        .from("auditoria_usuarios")
        .select(`
          id,
          accion,
          motivo,
          creado_en,
          datos_anteriores,
          datos_nuevos,
          usuario_afectado_id
        `)
        .order("creado_en", { ascending: false })
        .limit(25);

      if (error) {
        console.error("[Consulta de auditorÃƒÆ’Ã‚Â­a]", error.message);
      } else {
        auditoria = data ?? [];
      }
    }

    return NextResponse.json(
      { usuarios, auditoria },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return responderError(error.message, error.status);
    }

    console.error("[API usuarios GET]", error);
    return responderError("No fue posible consultar los usuarios.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await exigirPermiso("usuarios.consultar");

    let cuerpo: {
      nombre?: unknown;
      email?: unknown;
      telefono?: unknown;
      rol?: unknown;
      password?: unknown;
    };

    try {
      cuerpo = await request.json();
    } catch {
      return responderError("Los datos enviados no son vÃƒÆ’Ã‚Â¡lidos.", 400);
    }

    const nombre =
      typeof cuerpo.nombre === "string" ? cuerpo.nombre.trim() : "";

    const email =
      typeof cuerpo.email === "string" ? cuerpo.email.trim().toLowerCase() : "";

    const telefono =
      typeof cuerpo.telefono === "string" ? cuerpo.telefono.trim() : "";

    const password =
      typeof cuerpo.password === "string" ? cuerpo.password : "";

    const rol = cuerpo.rol;

    if (nombre.length < 2 || nombre.length > 100) {
      return responderError("El nombre debe tener entre 2 y 100 caracteres.", 400);
    }

    if (!validarCorreo(email)) {
      return responderError("Introduce un correo electrÃƒÆ’Ã‚Â³nico vÃƒÆ’Ã‚Â¡lido.", 400);
    }

    if (telefono.length > 30) {
      return responderError("El telÃƒÆ’Ã‚Â©fono no puede superar 30 caracteres.", 400);
    }

    if (password.length < 8 || password.length > 72) {
      return responderError(
        "La contraseÃƒÆ’Ã‚Â±a debe tener entre 8 y 72 caracteres.",
        400
      );
    }

    if (rol !== "cliente" && rol !== "cajero" && rol !== "administrador") {
      return responderError("El rol seleccionado no es vÃƒÆ’Ã‚Â¡lido.", 400);
    }

    if (!puedeGestionar(actor.roles.codigo, rol)) {
      return responderError(
        "No tienes autorizaciÃƒÆ’Ã‚Â³n para crear usuarios con ese rol.",
        403
      );
    }

    if (rol === "cliente") {
      if (actor.roles.codigo !== "superusuario") {
        return responderError("Solo el superusuario puede crear cuentas de cliente desde este mÃ³dulo.", 403);
      }
    } else {
      const permiso =
        rol === "administrador"
          ? "usuarios.crear_administrador"
          : "usuarios.crear_cajero";

      await exigirPermiso(permiso);
    }

    const admin = createAdminClient();

    const { data: rolDB, error: errorRol } = await admin
      .from("roles")
      .select("id,codigo,nombre")
      .eq("codigo", rol)
      .single();

    if (errorRol || !rolDB) {
      throw new Error("No se encontrÃƒÆ’Ã‚Â³ el rol solicitado.");
    }

    const { data: creado, error: errorCreacion } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre },
      });

    if (errorCreacion || !creado.user) {
      const mensaje = errorCreacion?.message ?? "";

      if (/already|registered|exists/i.test(mensaje)) {
        return responderError(
          "Ya existe una cuenta registrada con ese correo electrÃƒÆ’Ã‚Â³nico.",
          409
        );
      }

      console.error("[CreaciÃƒÆ’Ã‚Â³n de usuario]", errorCreacion);
      return responderError(
        "No fue posible crear la cuenta. Verifica los datos e intÃƒÆ’Ã‚Â©ntalo nuevamente.",
        400
      );
    }

    const usuarioId = creado.user.id;

    const { error: errorPerfil } = await admin
      .from("profiles")
      .update({
        rol_id: rolDB.id,
        nombre,
        telefono: telefono || null,
        estado: "activo",
        creado_por: actor.id,
      })
      .eq("id", usuarioId);

    if (errorPerfil) {
      console.error("[AsignaciÃƒÆ’Ã‚Â³n de rol]", errorPerfil.message);

      return responderError(
        "La cuenta fue creada, pero no se pudo completar su perfil. Debe revisarse antes de habilitar su acceso.",
        500
      );
    }

    try {
      await registrarAuditoria(admin, {
        actorId: actor.id,
        usuarioId,
        accion: `crear_${rol}`,
        nuevos: {
          nombre,
          email,
          telefono: telefono || null,
          rol,
          estado: "activo",
        },
        motivo: "Cuenta creada desde el mÃƒÆ’Ã‚Â³dulo de usuarios.",
      });
    } catch {
      await admin
        .from("profiles")
        .update({ estado: "suspendido" })
        .eq("id", usuarioId);

      return responderError(
        "La cuenta quedÃƒÆ’Ã‚Â³ desactivada porque no se pudo completar su auditorÃƒÆ’Ã‚Â­a.",
        500
      );
    }

    return NextResponse.json(
      {
        mensaje: "Cuenta creada correctamente. El usuario ya puede iniciar sesiÃƒÆ’Ã‚Â³n con el correo y la contraseÃƒÆ’Ã‚Â±a establecidos.",
        usuario: {
          id: usuarioId,
          nombre,
          email,
          rol,
          estado: "activo",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return responderError(error.message, error.status);
    }

    console.error("[API usuarios POST]", error);
    return responderError("No fue posible crear la cuenta.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await exigirPermiso("usuarios.consultar");

    let cuerpo: {
      usuarioId?: unknown;
      accion?: unknown;
      motivo?: unknown;
    };

    try {
      cuerpo = await request.json();
    } catch {
      return responderError("Los datos enviados no son vÃƒÆ’Ã‚Â¡lidos.", 400);
    }

    const usuarioId =
      typeof cuerpo.usuarioId === "string" ? cuerpo.usuarioId : "";

    const accion = cuerpo.accion;

    const motivo =
      typeof cuerpo.motivo === "string"
        ? cuerpo.motivo.trim().slice(0, 500)
        : "";

    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuid.test(usuarioId)) {
      return responderError("El identificador del usuario no es vÃƒÆ’Ã‚Â¡lido.", 400);
    }

    if (usuarioId === actor.id) {
      return responderError("No puedes desactivar ni modificar tu propia cuenta desde este mÃƒÆ’Ã‚Â³dulo.", 400);
    }

    if (accion !== "desactivar" && accion !== "reactivar") {
      return responderError("La operaciÃƒÆ’Ã‚Â³n solicitada no es vÃƒÆ’Ã‚Â¡lida.", 400);
    }

    const admin = createAdminClient();

    const { data: perfil, error: errorPerfil } = await admin
      .from("profiles")
      .select(`
        id,
        nombre,
        telefono,
        estado,
        rol_id,
        roles!profiles_rol_id_fkey (
          codigo,
          nombre
        )
      `)
      .eq("id", usuarioId)
      .maybeSingle();

    if (errorPerfil || !perfil) {
      return responderError("No se encontrÃƒÆ’Ã‚Â³ el usuario solicitado.", 404);
    }

    const perfilGestion = perfil as unknown as PerfilGestion;
    const rolObjetivo = normalizarRol(perfilGestion.roles);

    if (!rolObjetivo || !puedeGestionar(actor.roles.codigo, rolObjetivo.codigo)) {
      return responderError("No puedes gestionar una cuenta con ese rol.", 403);
    }

    const permiso = accion === "desactivar"
      ? `usuarios.suspender_${rolObjetivo.codigo}`
      : `usuarios.reactivar_${rolObjetivo.codigo}`;

    await exigirPermiso(permiso);


    const estadoAnterior = perfilGestion.estado;

    if (accion === "desactivar" && estadoAnterior === "suspendido") {
      return responderError("La cuenta ya estÃƒÆ’Ã‚Â¡ desactivada.", 409);
    }

    if (accion === "reactivar" && estadoAnterior !== "suspendido") {
      return responderError("Solo se pueden reactivar cuentas desactivadas.", 409);
    }

    let nuevoEstado: EstadoPerfil;

    if (accion === "desactivar") {
      nuevoEstado = "suspendido";
    } else {
      const { data: usuarioAuth, error: errorAuth } =
        await admin.auth.admin.getUserById(usuarioId);

      if (errorAuth || !usuarioAuth.user) {
        console.error("[ValidaciÃƒÆ’Ã‚Â³n de correo al reactivar]", errorAuth);
        return responderError(
          "No fue posible verificar la confirmaciÃƒÆ’Ã‚Â³n del correo del usuario.",
          500
        );
      }

      nuevoEstado = usuarioAuth.user.email_confirmed_at
        ? "activo"
        : "pendiente";
    }

    const { error: errorActualizacion } = await admin
      .from("profiles")
      .update({ estado: nuevoEstado })
      .eq("id", usuarioId);

    if (errorActualizacion) {
      console.error("[ActualizaciÃƒÆ’Ã‚Â³n de usuario]", errorActualizacion.message);
      return responderError("No fue posible actualizar el estado de la cuenta.", 500);
    }

    try {
      await registrarAuditoria(admin, {
        actorId: actor.id,
        usuarioId,
        accion: `${accion === "desactivar" ? "suspender" : "reactivar"}_${rolObjetivo.codigo}`,
        anteriores: {
          estado: estadoAnterior,
          rol: rolObjetivo.codigo,
        },
        nuevos: {
          estado: nuevoEstado,
          rol: rolObjetivo.codigo,
        },
        motivo: motivo || null,
      });
    } catch {
      await admin
        .from("profiles")
        .update({ estado: estadoAnterior })
        .eq("id", usuarioId);

      return responderError(
        "No se pudo registrar la auditorÃƒÆ’Ã‚Â­a. Se revirtiÃƒÆ’Ã‚Â³ el cambio.",
        500
      );
    }

    return NextResponse.json({
      mensaje: accion === "desactivar"
        ? "La cuenta fue desactivada. Su historial se conserva."
        : "La cuenta fue reactivada correctamente.",
      estado: nuevoEstado,
    });
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return responderError(error.message, error.status);
    }

    console.error("[API usuarios PATCH]", error);
    return responderError("No fue posible modificar la cuenta.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await exigirPermiso("usuarios.consultar");
    const admin = createAdminClient();

    let cuerpo: { usuarioId?: unknown; motivo?: unknown };

    try {
      cuerpo = await request.json();
    } catch {
      return responderError("La solicitud no contiene datos vÃƒÆ’Ã‚Â¡lidos.", 400);
    }

    const usuarioId =
      typeof cuerpo.usuarioId === "string" ? cuerpo.usuarioId.trim() : "";

    const motivo =
      typeof cuerpo.motivo === "string"
        ? cuerpo.motivo.trim().slice(0, 500)
        : null;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        usuarioId
      )
    ) {
      return responderError("El identificador del usuario no es vÃƒÆ’Ã‚Â¡lido.", 400);
    }

    if (actor.id === usuarioId) {
      return responderError("No puedes eliminar tu propia cuenta.", 403);
    }

    const { data: identidad, error: errorIdentidad } = await admin
      .from("identidades_usuarios_eliminados")
      .select("usuario_id, rol_codigo")
      .eq("usuario_id", usuarioId)
      .maybeSingle();

    if (errorIdentidad) {
      console.error("[Usuarios] Error consultando identidad archivada:", errorIdentidad.message);
      return responderError("No fue posible comprobar el historial de la cuenta.", 500);
    }

    let rolObjetivo: string;

    if (identidad) {
      rolObjetivo = identidad.rol_codigo;
    } else {
      const { data: resultado, error: errorEliminacion } = await admin.rpc(
        "eliminar_usuario_gestionado",
        {
          p_actor_id: actor.id,
          p_usuario_id: usuarioId,
          p_motivo: motivo,
        }
      );

      if (errorEliminacion) {
        console.error("[Usuarios] Error al archivar y eliminar perfil:", errorEliminacion.message);
        return responderError(
          errorEliminacion.message || "No fue posible eliminar el perfil.",
          409
        );
      }

      rolObjetivo =
        resultado && typeof resultado === "object" && "rol" in resultado
          ? String(resultado.rol)
          : "";
    }

    const puedeEliminar =
      actor.roles.codigo === "superusuario"
        ? ["cliente", "administrador", "cajero"].includes(rolObjetivo)
        : actor.roles.codigo === "administrador" && rolObjetivo === "cajero";

    if (!puedeEliminar) {
      return responderError("No tienes autorizaciÃƒÆ’Ã‚Â³n para eliminar esta cuenta.", 403);
    }

    const { error: errorAuth } = await admin.auth.admin.deleteUser(usuarioId);

    if (errorAuth) {
      const codigoError = String(errorAuth.code ?? "").toLowerCase();
      const usuarioYaNoExiste =
        errorAuth.status === 404 ||
        codigoError === "user_not_found";

      if (!usuarioYaNoExiste) {
        console.error("[Usuarios] Perfil archivado, pero Auth no pudo eliminarse:", errorAuth.message);
        return NextResponse.json(
          {
            error: "La identidad histÃƒÆ’Ã‚Â³rica y el perfil fueron procesados, pero no se pudo completar la eliminaciÃƒÆ’Ã‚Â³n de autenticaciÃƒÆ’Ã‚Â³n.",
            authPendiente: true,
            usuarioId,
          },
          {
            status: 502,
            headers: { "Cache-Control": "no-store" },
          }
        );
      }
    }

    return NextResponse.json(
      {
        mensaje: "La cuenta fue eliminada y su identidad histÃƒÆ’Ã‚Â³rica quedÃƒÆ’Ã‚Â³ preservada.",
        usuarioId,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return responderError(error.message, error.status);
    }

    console.error("[Usuarios] Error inesperado al eliminar cuenta:", error);
    return responderError("OcurriÃƒÆ’Ã‚Â³ un error al eliminar la cuenta.", 500);
  }
}


export async function PUT(request: NextRequest) {
  try {
    const actor = await exigirPermiso("usuarios.consultar");
    const admin = createAdminClient();

    let cuerpo: {
      usuarioId?: unknown;
      accion?: unknown;
      nombre?: unknown;
      email?: unknown;
      telefono?: unknown;
      password?: unknown;
      motivo?: unknown;
    };

    try {
      cuerpo = await request.json();
    } catch {
      return responderError("Los datos enviados no son vÃƒÂ¡lidos.", 400);
    }

    const usuarioId =
      typeof cuerpo.usuarioId === "string" ? cuerpo.usuarioId.trim() : "";

    const accion = cuerpo.accion;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usuarioId)) {
      return responderError("El identificador del usuario no es vÃƒÂ¡lido.", 400);
    }

    if (usuarioId === actor.id) {
      return responderError("No puedes modificar tu propia cuenta desde este mÃƒÂ³dulo.", 403);
    }

    if (accion !== "editar" && accion !== "password") {
      return responderError("La operaciÃƒÂ³n solicitada no es vÃƒÂ¡lida.", 400);
    }

    const { data: perfil, error: errorPerfil } = await admin
      .from("profiles")
      .select(`
        id,
        nombre,
        telefono,
        estado,
        roles!profiles_rol_id_fkey (
          codigo,
          nombre
        )
      `)
      .eq("id", usuarioId)
      .maybeSingle();

    if (errorPerfil || !perfil) {
      return responderError("No se encontrÃƒÂ³ el usuario solicitado.", 404);
    }

    const perfilGestion = perfil as unknown as PerfilGestion;
    const rolObjetivo = normalizarRol(perfilGestion.roles);

    if (!rolObjetivo || !puedeGestionar(actor.roles.codigo, rolObjetivo.codigo)) {
      return responderError("No puedes gestionar una cuenta con ese rol.", 403);
    }

    const nombre =
      typeof cuerpo.nombre === "string" ? cuerpo.nombre.trim() : "";

    const email =
      typeof cuerpo.email === "string" ? cuerpo.email.trim().toLowerCase() : "";

    const telefono =
      typeof cuerpo.telefono === "string" ? cuerpo.telefono.trim() : "";

    const password =
      typeof cuerpo.password === "string" ? cuerpo.password : "";

    const motivo =
      typeof cuerpo.motivo === "string" ? cuerpo.motivo.trim().slice(0, 500) : null;

    if (accion === "editar") {
      if (nombre.length < 2 || nombre.length > 100) {
        return responderError("El nombre debe tener entre 2 y 100 caracteres.", 400);
      }
      if (!validarCorreo(email)) {
        return responderError("Introduce un correo electrÃƒÂ³nico vÃƒÂ¡lido.", 400);
      }
      if (telefono.length > 30) {
        return responderError("El telÃƒÂ©fono no puede superar 30 caracteres.", 400);
      }
    } else if (password.length < 8 || password.length > 72) {
      return responderError("La contraseÃƒÂ±a debe tener entre 8 y 72 caracteres.", 400);
    }

    const { data: usuarioAuth, error: errorAuthActual } =
      await admin.auth.admin.getUserById(usuarioId);

    if (errorAuthActual || !usuarioAuth.user) {
      return responderError("No fue posible verificar la cuenta de autenticaciÃƒÂ³n.", 500);
    }

    const emailAnterior = usuarioAuth.user.email ?? "";
    const nombreAnterior = perfilGestion.nombre;
    const telefonoAnterior = perfilGestion.telefono;

    const cambiosAuth: {
      email?: string;
      email_confirm?: boolean;
      password?: string;
      user_metadata?: Record<string, unknown>;
    } = {};

    if (accion === "editar") {
      cambiosAuth.email = email;
      cambiosAuth.email_confirm = true;
      cambiosAuth.user_metadata = {
        ...usuarioAuth.user.user_metadata,
        nombre,
      };
    } else {
      cambiosAuth.password = password;
    }

    const { error: errorActualizacionAuth } =
      await admin.auth.admin.updateUserById(usuarioId, cambiosAuth);

    if (errorActualizacionAuth) {
      console.error("[Usuarios PUT Auth]", errorActualizacionAuth.message);
      return responderError(
        "No fue posible actualizar los datos de autenticaciÃƒÂ³n. Verifica el correo o la contraseÃƒÂ±a.",
        400
      );
    }

    if (accion === "editar") {
      const { error: errorActualizacionPerfil } = await admin
        .from("profiles")
        .update({ nombre, telefono: telefono || null })
        .eq("id", usuarioId);

      if (errorActualizacionPerfil) {
        await admin.auth.admin.updateUserById(usuarioId, {
          email: emailAnterior,
          email_confirm: true,
          user_metadata: usuarioAuth.user.user_metadata,
        });

        console.error("[Usuarios PUT perfil]", errorActualizacionPerfil.message);
        return responderError("No fue posible actualizar el perfil. Se intentÃƒÂ³ restaurar el correo anterior.", 500);
      }
    }

    try {
      await registrarAuditoria(admin, {
        actorId: actor.id,
        usuarioId,
        accion: accion === "editar"
          ? `editar_${rolObjetivo.codigo}`
          : `cambiar_password_${rolObjetivo.codigo}`,
        anteriores: accion === "editar"
          ? {
              nombre: nombreAnterior,
              email: emailAnterior,
              telefono: telefonoAnterior,
              rol: rolObjetivo.codigo,
            }
          : { password_actualizada: false },
        nuevos: accion === "editar"
          ? {
              nombre,
              email,
              telefono: telefono || null,
              rol: rolObjetivo.codigo,
            }
          : { password_actualizada: true },
        motivo,
      });
    } catch {
      if (accion === "editar") {
        await admin.from("profiles").update({
          nombre: nombreAnterior,
          telefono: telefonoAnterior,
        }).eq("id", usuarioId);

        await admin.auth.admin.updateUserById(usuarioId, {
          email: emailAnterior,
          email_confirm: true,
          user_metadata: usuarioAuth.user.user_metadata,
        });
      }

      return responderError(
        accion === "editar"
          ? "No se pudo registrar la auditorÃƒÂ­a. Se intentÃƒÂ³ revertir la ediciÃƒÂ³n."
          : "La contraseÃƒÂ±a se actualizÃƒÂ³, pero no se pudo registrar la auditorÃƒÂ­a. Se requiere revisiÃƒÂ³n.",
        500
      );
    }

    return NextResponse.json({
      mensaje: accion === "editar"
        ? "Los datos de la cuenta fueron actualizados."
        : "La contraseÃƒÂ±a fue actualizada correctamente.",
    });
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return responderError(error.message, error.status);
    }

    console.error("[API usuarios PUT]", error);
    return responderError("No fue posible actualizar la cuenta.", 500);
  }
}
