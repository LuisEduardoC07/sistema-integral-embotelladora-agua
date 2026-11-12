import { connection } from "next/server";
import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { obtenerCatalogoPublico } from "@/services/productos/catalogo-publico.service";
import CotizacionesCliente from "@/components/cliente/CotizacionesCliente";

export const instant = false;

export default async function PaginaCotizaciones() {
  await connection();
  const perfil = await protegerPanel("cliente");
  const catalogo = await obtenerCatalogoPublico();

  return (
    <CotizacionesCliente
      productos={catalogo.productos}
      errorCatalogo={catalogo.error}
      nombreCliente={perfil.nombre}
    />
  );
}
