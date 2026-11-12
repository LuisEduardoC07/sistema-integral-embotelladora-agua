import { connection } from "next/server";
export const instant = false;

import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { PanelDashboard } from "@/components/panel/PanelDashboard";

export default async function PaginaPanel() {
  await connection();
  const perfil = await protegerPanel("cajero");

  return (
    <PanelDashboard
      titulo="Panel de operaciones"
      descripcion="Punto de venta, atención al cliente y seguimiento de pedidos."
      nombre={perfil.nombre}
      accesos={[
        { titulo: "Punto de venta", descripcion: "Atención y registro de ventas." },
        { titulo: "Pedidos pendientes", descripcion: "Consulta y despacho de solicitudes." },
        { titulo: "Mi caja", descripcion: "Apertura, movimientos y cierre de caja propia." },
        { titulo: "Productos", descripcion: "Consulta de catálogo y precios." },
        { titulo: "Inventario", descripcion: "Consulta de existencias disponibles." },
        { titulo: "Ventas y facturas", descripcion: "Consulta del historial comercial." },
      ]}
    />
  );
}
