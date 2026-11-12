import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { GestionCaja } from "@/components/caja/GestionCaja";


export default async function PaginaCajaSuperusuario() {
  await protegerPanel("superusuario");
  return <GestionCaja />;
}