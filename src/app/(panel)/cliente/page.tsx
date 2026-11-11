export const instant = false;

import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { PanelDashboard } from "@/components/panel/PanelDashboard";

export default async function PaginaPanel() {
  const perfil = await protegerPanel("cliente");

  return (
    <PanelDashboard
      titulo="Bienvenido a nuestra tienda"
      descripcion="Consulta nuestros productos, prepara tus pedidos y organiza tus entregas de agua."
      nombre={perfil.nombre}
      accesos={[
        { titulo: "Catálogo de productos", descripcion: "Explora los productos disponibles." },
        { titulo: "Mis pedidos", descripcion: "Consulta tus solicitudes y entregas." },
        { titulo: "Cotizaciones", descripcion: "Solicita y consulta cotizaciones." },
        { titulo: "Mi perfil", descripcion: "Consulta tus datos de contacto." },
      ]}
    />
  );
}
