import { connection } from "next/server";
import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { DiagnosticoMantenimiento } from "@/components/mantenimiento/DiagnosticoMantenimiento";

export const instant = false;

export default async function PaginaModulo() {
  await connection();
  await protegerPanel("superusuario");

  return <DiagnosticoMantenimiento />;
}