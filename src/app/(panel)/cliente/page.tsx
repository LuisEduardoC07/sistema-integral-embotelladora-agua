import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { obtenerCatalogoPublico } from "@/services/productos/catalogo-publico.service";
import TiendaCliente from "@/components/cliente/TiendaCliente";

export const instant = false;

export default async function PaginaCliente() {
  const perfil = await protegerPanel("cliente");
  const catalogo = await obtenerCatalogoPublico();

  return (
    <TiendaCliente
      productos={catalogo.productos}
      errorCatalogo={catalogo.error}
      nombreCliente={perfil.nombre}
    />
  );
}
