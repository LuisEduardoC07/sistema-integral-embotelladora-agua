export const instant = false;

import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { ModuloSuperusuario } from "@/components/panel/superusuario/ModuloSuperusuario";

export default async function PaginaModulo() {
  await protegerPanel("superusuario");

  return (
    <ModuloSuperusuario
      titulo="Roles y permisos"
      descripcion="Administración de roles, permisos y autorizaciones de la plataforma."
    />
  );
}
