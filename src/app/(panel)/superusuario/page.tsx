import { connection } from "next/server";
export const instant = false;

import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { PanelDashboard } from "@/components/panel/PanelDashboard";
import { obtenerResumenDashboard } from "@/services/panel/dashboard.service";

export default async function PaginaPanel() {
  await connection();

  const perfil = await protegerPanel("superusuario");
  const resumen = await obtenerResumenDashboard();

  return (
    <PanelDashboard
      titulo="Panel de superusuario"
      descripcion="Resumen general y supervisión integral de la operación de la embotelladora."
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
          descripcion: "Catálogo comercial y control de existencias.",
          href: "/productos",
        },
        {
          titulo: "Historial de ventas",
          descripcion: "Ventas, facturas e indicadores comerciales.",
          href: "/historial-ventas",
        },
        {
          titulo: "Usuarios y cuentas",
          descripcion: "Administración de las cuentas del sistema.",
          href: "/superusuario/usuarios",
        },
        {
          titulo: "Roles y permisos",
          descripcion: "Control de perfiles y autorizaciones.",
          href: "/superusuario/roles-permisos",
        },
        {
          titulo: "Auditoría",
          descripcion: "Seguimiento de acciones administrativas.",
          href: "/superusuario/auditoria",
        },
        {
          titulo: "Cajas",
          descripcion: "Supervisión de cajas y operaciones.",
          href: "/superusuario/cajas",
        },
        {
          titulo: "Configuración",
          descripcion: "Parámetros generales de la plataforma.",
          href: "/superusuario/configuracion",
        },
        {
          titulo: "Mantenimiento",
          descripcion: "Herramientas de supervisión técnica.",
          href: "/superusuario/mantenimiento",
        },
      ]}
    />
  );
}
