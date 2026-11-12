import { connection } from "next/server";
import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { GestionRolesPermisos } from "@/components/roles-permisos/GestionRolesPermisos";

export default async function PaginaRolesPermisos() {
  await connection();
  await protegerPanel("superusuario");

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">
          Administración de seguridad
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Roles y permisos
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Consulta los roles del sistema, administra sus datos y configura
          las autorizaciones disponibles para cada tipo de cuenta.
        </p>
      </section>

      <GestionRolesPermisos />
    </div>
  );
}