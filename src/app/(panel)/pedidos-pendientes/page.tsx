import { redirect } from "next/navigation";
import { obtenerPerfilActual, comprobarPermiso } from "@/services/usuarios/perfil.service";
import { obtenerPedidosPersonal } from "@/services/pedidos/pedidos-personal.service";
import PedidosPendientes from "@/components/pedidos/PedidosPendientes";

export const instant = false;

const ROLES_PERMITIDOS = ["administrador", "cajero", "superusuario"];

export default async function PaginaPedidosPendientes() {
  const resultadoPerfil = await obtenerPerfilActual();
  const perfil = resultadoPerfil.perfil;

  if (!perfil) {
    redirect("/");
  }

  if (perfil.estado !== "activo") {
    redirect("/acceso-denegado");
  }

  if (!ROLES_PERMITIDOS.includes(perfil.roles.codigo)) {
    redirect("/acceso-denegado");
  }

  const consulta = await comprobarPermiso("pedidos.consultar");
  const puedeGestionar = await comprobarPermiso("pedidos.gestionar");
  const puedeEntregar = await comprobarPermiso("pedidos.entregar");

  if (
    !consulta.autorizado ||
    (!puedeGestionar.autorizado && !puedeEntregar.autorizado)
  ) {
    redirect("/acceso-denegado");
  }

  const resultado = await obtenerPedidosPersonal();

  return (
    <PedidosPendientes
      pedidosIniciales={resultado.pedidos}
      errorInicial={resultado.error}
      puedeGestionar={puedeGestionar.autorizado}
      puedeEntregar={puedeEntregar.autorizado}
    />
  );
}
