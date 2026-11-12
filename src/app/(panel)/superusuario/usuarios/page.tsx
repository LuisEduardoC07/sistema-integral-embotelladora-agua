export const instant = false;

import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { GestionUsuarios } from "@/components/usuarios/GestionUsuarios";

export default async function PaginaUsuariosSuperusuario() {
  await protegerPanel("superusuario");

  return <GestionUsuarios rolActual="superusuario" />;
}