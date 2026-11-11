export const instant = false;

import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { ModuloSuperusuario } from "@/components/panel/superusuario/ModuloSuperusuario";

export default async function PaginaModulo() {
  await protegerPanel("superusuario");

  return (
    <ModuloSuperusuario
      titulo="Auditoría"
      descripcion="Consulta y supervisión del registro de actividades administrativas."
    />
  );
}
