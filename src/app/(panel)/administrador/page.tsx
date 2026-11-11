export const instant = false;

import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { PanelDashboard } from "@/components/panel/PanelDashboard";

export default async function PaginaPanel() {
  const perfil = await protegerPanel("administrador");

  return (
    <PanelDashboard
      titulo="Panel de administración"
      descripcion="Gestión comercial, productos, inventario, ventas y operación de la embotelladora."
      nombre={perfil.nombre}
      accesos={[
        { titulo: "Punto de venta", descripcion: "Registro y control de operaciones comerciales." },
        { titulo: "Pedidos pendientes", descripcion: "Seguimiento de solicitudes de entrega." },
        { titulo: "Productos", descripcion: "Administración del catálogo comercial." },
        { titulo: "Inventario", descripcion: "Existencias y movimientos de productos." },
        { titulo: "Ventas y facturas", descripcion: "Consulta y gestión del historial comercial." },
        { titulo: "Reportes y cajeros", descripcion: "Supervisión de actividad y personal." },
      ]}
    />
  );
}
