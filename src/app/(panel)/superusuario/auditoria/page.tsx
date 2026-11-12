import { connection } from "next/server";
import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { GestionAuditoria } from "@/components/auditoria/GestionAuditoria";


export default async function PaginaAuditoria() {
  await connection();
  await protegerPanel("superusuario");

  return <GestionAuditoria />;
}