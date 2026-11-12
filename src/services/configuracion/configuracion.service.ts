import type {
  ConfiguracionSistema,
  DatosConfiguracion,
} from "@/types/configuracion/configuracion.types";

export async function obtenerConfiguracion(): Promise<ConfiguracionSistema> {
  const respuesta = await fetch("/api/configuracion", {
    method: "GET",
    cache: "no-store",
  });

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(resultado.error || "No fue posible consultar la configuración.");
  }

  return resultado.configuracion;
}

export async function guardarConfiguracion(
  datos: DatosConfiguracion
): Promise<ConfiguracionSistema> {
  const respuesta = await fetch("/api/configuracion", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(resultado.error || "No fue posible guardar la configuración.");
  }

  return resultado.configuracion;
}