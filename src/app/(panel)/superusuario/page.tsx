export const instant = false;

import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { PanelDashboard } from "@/components/panel/PanelDashboard";

export default async function PaginaPanel() {
  const perfil = await protegerPanel("superusuario");

  return (
    <PanelDashboard
      titulo="Panel de superusuario"
      descripcion="Administración general, supervisión y control integral de la plataforma."
      nombre={perfil.nombre}
      accesos={[
        { titulo: "Usuarios y cuentas", descripcion: "Administración de cuentas y estados de usuario." },
        { titulo: "Roles y permisos", descripcion: "Control de perfiles y autorizaciones del sistema." },
        { titulo: "Auditoría", descripcion: "Seguimiento de acciones administrativas." },
        { titulo: "Mantenimiento", descripcion: "Supervisión técnica y operativa." },
        { titulo: "Configuración", descripcion: "Parámetros generales de la plataforma." },
      ]}
    />
  );
}
