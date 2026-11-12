import EstablecerContrasena from "@/components/autenticacion/EstablecerContrasena";

export const instant = false;

export default async function PaginaEstablecerContrasena({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const parametros = await searchParams;

  return (
    <EstablecerContrasena
      errorInvitacion={parametros.error === "invitacion"}
    />
  );
}