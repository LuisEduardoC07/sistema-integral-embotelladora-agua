import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { GestionUsuarios } from "@/components/usuarios/GestionUsuarios";


export default async function PaginaCajeros() {
  await protegerPanel("superusuario");

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">
          Personal operativo
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Gestión de cajeros</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Administración de cuentas de cajero, estados de acceso y datos del personal.
          La creación y los cambios se procesan mediante el módulo seguro de usuarios.
        </p>
      </section>
      <GestionUsuarios rolActual="superusuario" soloCajeros />
    </div>
  );
}