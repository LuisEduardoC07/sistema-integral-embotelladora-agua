import { connection } from "next/server";
import { exigirPermiso } from "@/lib/seguridad/autorizacion";
import { obtenerCajerosHistorial } from "@/services/ventas/cajeros-historial.service";
import { HistorialVentas } from "@/components/ventas/HistorialVentas";

export const instant = false;

export default async function HistorialVentasPage() {
  await connection();

  const perfil = await exigirPermiso("ventas.consultar");

  const puedeFiltrarCajero =
    perfil.roles.codigo === "administrador" ||
    perfil.roles.codigo === "superusuario";

  const cajeros = puedeFiltrarCajero
    ? await obtenerCajerosHistorial()
    : [];

  return (
    <HistorialVentas
      cajeros={cajeros}
      puedeFiltrarCajero={puedeFiltrarCajero}
    />
  );
}