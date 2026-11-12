import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { createClient } from "@/lib/supabase/server";
import PerfilCliente from "@/components/cliente/PerfilCliente";

export const instant = false;

export default async function PaginaPerfilCliente() {
  const perfil = await protegerPanel("cliente");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  const avatarUrl = data?.avatar_path
    ? supabase.storage
        .from("avatars")
        .getPublicUrl(data.avatar_path).data.publicUrl
    : null;

  return (
    <PerfilCliente
      usuarioId={user.id}
      nombreInicial={perfil.nombre}
      telefonoInicial={perfil.telefono ?? ""}
      correo={user.email ?? ""}
      avatarInicial={avatarUrl}
      avatarPathInicial={data?.avatar_path ?? null}
    />
  );
}
