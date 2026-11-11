export const instant = false;

import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { ModuloSuperusuario } from "@/components/panel/superusuario/ModuloSuperusuario";

export default async function PaginaModulo() {
  await protegerPanel("superusuario");

  return (
    <ModuloSuperusuario
      titulo="Usuarios y cuentas"
      descripcion="Consulta y administración de las cuentas de usuario del sistema."
    />
  );
}
