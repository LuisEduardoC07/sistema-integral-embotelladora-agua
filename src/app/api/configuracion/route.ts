import { NextResponse } from "next/server";
import {
  ErrorAutorizacion,
  exigirPermiso,
  exigirRol,
} from "@/lib/seguridad/autorizacion";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DatosConfiguracion } from "@/types/configuracion/configuracion.types";

function responderError(mensaje: string, estado: number) {
  return NextResponse.json(
    { error: mensaje },
    { status: estado, headers: { "Cache-Control": "no-store" } }
  );
}

function validarDatos(datos: unknown): DatosConfiguracion | null {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return null;

  const entrada = datos as Record<string, unknown>;
  const camposTexto = [
    "nombre_comercial", "telefono_contacto", "whatsapp",
    "correo_contacto", "direccion", "horario_atencion",
    "zona_horaria", "moneda",
  ] as const;

  for (const campo of camposTexto) {
    const valor = entrada[campo];
    if (
      valor !== null &&
      valor !== undefined &&
      (typeof valor !== "string" || valor.length > 500)
    ) return null;
  }

  if (
    typeof entrada.zona_horaria !== "string" ||
    !entrada.zona_horaria.trim() ||
    typeof entrada.moneda !== "string" ||
    !/^[A-Z]{3}$/.test(entrada.moneda)
  ) return null;

  if (
    typeof entrada.entregas_habilitadas !== "boolean" ||
    typeof entrada.costo_entrega !== "number" ||
    !Number.isFinite(entrada.costo_entrega) ||
    entrada.costo_entrega < 0 ||
    typeof entrada.pedido_minimo !== "number" ||
    !Number.isFinite(entrada.pedido_minimo) ||
    entrada.pedido_minimo < 0
  ) return null;

  if (
    typeof entrada.correo_contacto === "string" &&
    entrada.correo_contacto.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entrada.correo_contacto.trim())
  ) return null;

  const texto = (valor: unknown): string | null =>
    typeof valor === "string" ? valor.trim() || null : null;

  return {
    nombre_comercial: texto(entrada.nombre_comercial),
    telefono_contacto: texto(entrada.telefono_contacto),
    whatsapp: texto(entrada.whatsapp),
    correo_contacto: texto(entrada.correo_contacto),
    direccion: texto(entrada.direccion),
    horario_atencion: texto(entrada.horario_atencion),
    zona_horaria: entrada.zona_horaria.trim(),
    moneda: entrada.moneda,
    entregas_habilitadas: entrada.entregas_habilitadas,
    costo_entrega: entrada.costo_entrega,
    pedido_minimo: entrada.pedido_minimo,
  };
}

export async function GET() {
  try {
    await exigirRol("superusuario");
    await exigirPermiso("sistema.configuracion");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("configuracion_sistema")
      .select("*")
      .eq("clave", 1)
      .single();

    if (error || !data) {
      console.error("[Configuración] Consulta:", error);
      return responderError("No fue posible consultar la configuración.", 500);
    }

    return NextResponse.json(
      { configuracion: data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return responderError(error.message, error.status);
    }

    console.error("[Configuración] GET:", error);
    return responderError("Ocurrió un error al consultar la configuración.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    await exigirRol("superusuario");
    const perfil = await exigirPermiso("sistema.configuracion");

    let entrada: unknown;
    try {
      entrada = await request.json();
    } catch {
      return responderError("El contenido enviado no es válido.", 400);
    }

    const datos = validarDatos(entrada);
    if (!datos) {
      return responderError("Revisa los datos. Hay campos inválidos.", 400);
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc(
      "actualizar_configuracion_sistema",
      {
        p_datos: datos,
        p_actor_id: perfil.id,
      }
    );

    if (error || !data) {
      console.error("[Configuración] Transacción:", error);
      return responderError(
        "No fue posible guardar la configuración y registrar su auditoría.",
        500
      );
    }

    return NextResponse.json(
      { configuracion: data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return responderError(error.message, error.status);
    }

    console.error("[Configuración] PATCH:", error);
    return responderError("Ocurrió un error al guardar la configuración.", 500);
  }
}