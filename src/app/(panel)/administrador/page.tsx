import { connection } from "next/server";
import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { PanelDashboard } from "@/components/panel/PanelDashboard";
import { obtenerResumenDashboard } from "@/services/panel/dashboard.service";

export default async function PaginaPanel() {
  await connection();

  const perfil = await protegerPanel("administrador");
  const resumen = await obtenerResumenDashboard();

  return (
    <PanelDashboard
      titulo="Panel de administración"
      descripcion="Resumen de la gestión comercial, productos, inventario y operación de la embotelladora."
      nombre={perfil.nombre}
      resumen={resumen}
      accesos={[
        {
          titulo: "Punto de venta",
          descripcion: "Registro y control de operaciones comerciales.",
          href: "/pos",
        },
        {
          titulo: "Pedidos pendientes",
          descripcion: "Seguimiento de solicitudes de entrega.",
          href: "/pedidos-pendientes",
        },
        {
          titulo: "Productos",
          descripcion: "Administración del catálogo comercial y existencias.",
          href: "/productos",
        },
        {
          titulo: "Historial de ventas",
          descripcion: "Consulta de operaciones, facturas e ingresos.",
          href: "/historial-ventas",
        },
        {
          titulo: "Usuarios",
          descripcion: "Gestión de las cuentas autorizadas.",
          href: "/administrador/usuarios",
        },
      ]}
    />
  );
}
