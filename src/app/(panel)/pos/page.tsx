import { connection } from "next/server";
import { exigirPermiso } from "@/lib/seguridad/autorizacion";
import { PuntoVenta } from "@/components/pos/PuntoVenta";

export const instant = false;

export default async function PuntoVentaPage() {
  await connection();

  await exigirPermiso("ventas.crear");

  return <PuntoVenta />;
}
