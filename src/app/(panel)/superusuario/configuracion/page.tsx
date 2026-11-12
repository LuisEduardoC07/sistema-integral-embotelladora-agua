import { connection } from "next/server";
import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { ConfiguracionSistemaPanel } from "@/components/configuracion/ConfiguracionSistemaPanel";

export const instant = false;

export default async function PaginaConfiguracion() {
  await connection();
  await protegerPanel("superusuario");

  return <ConfiguracionSistemaPanel />;
}