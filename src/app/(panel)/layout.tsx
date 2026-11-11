import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { NavegacionPanel } from "@/components/panel/navegacion/NavegacionPanel";
import { obtenerPerfilActual } from "@/services/usuarios/perfil.service";

export const instant = false;

export default async function LayoutPanel({
  children,
}: {
  children: ReactNode;
}) {
  await connection();
  const resultado = await obtenerPerfilActual();
  const perfil = resultado.perfil;

  if (!perfil) {
    redirect("/");
  }

  if (perfil.estado !== "activo") {
    redirect("/acceso-denegado");
  }

  return (
    <NavegacionPanel
      nombre={perfil.nombre}
      rol={perfil.roles.codigo}
    >
      {children}
    </NavegacionPanel>
  );
}
