"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function ConfirmarInvitacion() {
  const router = useRouter();
  const [mensaje, setMensaje] = useState("Validando tu invitación...");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function confirmar() {
      try {
        const supabase = createClient();
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");

        if (code) {
          const { error: errorCodigo } =
            await supabase.auth.exchangeCodeForSession(code);

          if (errorCodigo) throw errorCodigo;
        } else if (tokenHash && type === "invite") {
          const { error: errorToken } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "invite",
          });

          if (errorToken) throw errorToken;
        }

        const { data, error: errorSesion } =
          await supabase.auth.getSession();

        if (errorSesion) throw errorSesion;

        if (!data.session) {
          throw new Error("La invitación no generó una sesión válida.");
        }

        if (!cancelado) {
          setMensaje("Invitación confirmada. Preparando tu contraseña...");
          router.replace("/establecer-contrasena");
          router.refresh();
        }
      } catch (errorConfirmacion) {
        console.error("[Confirmación de invitación]", errorConfirmacion);

        if (!cancelado) {
          setError(true);
          setMensaje(
            "No fue posible validar la invitación. El enlace puede haber caducado o ya haber sido utilizado. Solicita una nueva invitación al administrador."
          );
        }
      }
    }

    void confirmar();

    return () => {
      cancelado = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Confirmación de invitación
        </h1>

        <p
          role={error ? "alert" : "status"}
          className={`mt-4 text-sm leading-7 ${
            error ? "text-rose-700" : "text-slate-600"
          }`}
        >
          {mensaje}
        </p>

        {error && (
          <a
            href="/iniciar-sesion"
            className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Ir a iniciar sesión
          </a>
        )}
      </section>
    </main>
  );
}