import { NextResponse } from "next/server";
import {
  ErrorAutorizacion,
  exigirPermiso,
  exigirRol,
} from "@/lib/seguridad/autorizacion";
import { createAdminClient } from "@/lib/supabase/admin";

const TABLAS = [
  { tabla: "profiles", nombre: "Perfiles de usuario", grupo: "Seguridad" },
  { tabla: "roles", nombre: "Roles", grupo: "Seguridad" },
  { tabla: "permisos", nombre: "Permisos", grupo: "Seguridad" },
  { tabla: "rol_permisos", nombre: "Asignaciones de permisos", grupo: "Seguridad" },
  { tabla: "productos", nombre: "Productos", grupo: "Operaciones" },
  { tabla: "pedidos", nombre: "Pedidos", grupo: "Operaciones" },
  { tabla: "ventas", nombre: "Ventas", grupo: "Operaciones" },
  { tabla: "cajas", nombre: "Cajas", grupo: "Operaciones" },
  { tabla: "inventario", nombre: "Inventario", grupo: "Operaciones" },
  { tabla: "auditoria_usuarios", nombre: "Auditoría de usuarios", grupo: "Control" },
  { tabla: "auditoria_operaciones", nombre: "Auditoría de operaciones", grupo: "Control" },
] as const;

function responderError(mensaje: string, estado: number) {
  return NextResponse.json(
    { error: mensaje },
    { status: estado, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET() {
  try {
    await exigirRol("superusuario");
    await exigirPermiso("sistema.mantenimiento");

    const admin = createAdminClient();

    const [comprobacionesTablas, comprobacionAuth] = await Promise.all([
      Promise.all(
        TABLAS.map(async (item) => {
          const { count, error } = await admin
            .from(item.tabla)
            .select("id", { count: "exact", head: true });

          return {
            clave: item.tabla,
            nombre: item.nombre,
            grupo: item.grupo,
            estado: error ? "error" : "correcto",
            detalle: error
              ? "No fue posible consultar esta tabla."
              : "Tabla disponible.",
            registros: error ? null : count,
          };
        })
      ),
      admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
    ]);

    const comprobaciones = [
      {
        clave: "supabase_auth",
        nombre: "Servicio de autenticación",
        grupo: "Servicios",
        estado: comprobacionAuth.error ? "error" : "correcto",
        detalle: comprobacionAuth.error
          ? "El servicio de autenticación no respondió correctamente."
          : "API administrativa de autenticación disponible.",
        registros: null,
      },
      ...comprobacionesTablas,
    ];

    const errores = comprobaciones.filter(
      (comprobacion) => comprobacion.estado === "error"
    ).length;

    return NextResponse.json(
      {
        fecha: new Date().toISOString(),
        estado: errores === 0 ? "correcto" : "advertencia",
        resumen: {
          total: comprobaciones.length,
          correctas: comprobaciones.length - errores,
          errores,
        },
        comprobaciones,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return responderError(error.message, error.status);
    }

    console.error("[Mantenimiento diagnóstico]", error);
    return responderError(
      "No fue posible ejecutar el diagnóstico del sistema.",
      500
    );
  }
}