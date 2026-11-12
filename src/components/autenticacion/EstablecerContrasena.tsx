"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function EstablecerContrasena({
  errorInvitacion,
}: {
  errorInvitacion: boolean;
}) {
  const router = useRouter();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [sesionValida, setSesionValida] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function verificarSesion() {
      try {
        const supabase = createClient();
        const { data, error: errorSesion } =
          await supabase.auth.getUser();

        if (errorSesion || !data.user) {
          if (!cancelado) setSesionValida(false);
        } else {
          if (!cancelado) setSesionValida(true);
        }
      } catch {
        if (!cancelado) setSesionValida(false);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void verificarSesion();

    return () => {
      cancelado = true;
    };
  }, []);

  async function guardarContrasena(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setExito("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setGuardando(true);

    try {
      const supabase = createClient();

      const { error: errorActualizacion } =
        await supabase.auth.updateUser({ password });

      if (errorActualizacion) {
        throw new Error(errorActualizacion.message);
      }

      setExito("Tu contraseña fue creada correctamente. Redirigiendo al inicio de sesión...");

      await supabase.auth.signOut();

      router.replace("/iniciar-sesion?activacion=correcta");
      router.refresh();
    } catch (errorGuardado) {
      setError(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "No fue posible guardar la contraseña."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">
            Activación de cuenta
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Establecer contraseña
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Crea una contraseña personal para acceder a AquaControl.
          </p>
        </header>

        {cargando ? (
          <p className="text-center text-sm text-slate-500">
            Verificando tu sesión...
          </p>
        ) : !sesionValida ? (
          <div className="space-y-4 text-center">
            <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              {errorInvitacion
                ? "La invitación no pudo validarse o ha caducado."
                : "No encontramos una invitación activa. Abre el enlace recibido en tu correo electrónico."}
            </p>
            <a
              href="/iniciar-sesion"
              className="inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Ir a iniciar sesión
            </a>
          </div>
        ) : (
          <form onSubmit={guardarContrasena} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Nueva contraseña
              </span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                placeholder="Mínimo 8 caracteres"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Confirmar contraseña
              </span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmacion}
                onChange={(evento) => setConfirmacion(evento.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                placeholder="Repite tu contraseña"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </p>
            )}

            {exito && (
              <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                {exito}
              </p>
            )}

            <button
              type="submit"
              disabled={guardando}
              className="w-full rounded-xl bg-[#0c637b] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#084e63] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? "Guardando contraseña..." : "Guardar contraseña"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}