import { connection } from "next/server";
export const instant = false;

import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { GestionUsuarios } from "@/components/usuarios/GestionUsuarios";

export default async function PaginaUsuariosAdministrador() {
  await connection();
  await protegerPanel("administrador");

  return <GestionUsuarios rolActual="administrador" />;
}