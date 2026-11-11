"use client";

import { useState, type FormEvent } from "react";
import { verificarCorreo } from "@/services/autenticacion/autenticacion.service";

interface VerificacionEmailProps {
  email: string;
}

export default function VerificacionEmail({
  email,
}: VerificacionEmailProps) {
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [verificado, setVerificado] = useState(false);

  async function manejarVerificacion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    setMensaje("");
    setError("");

    if (!/^\d{8}$/.test(codigo)) {
      setError("El código debe contener exactamente 8 dígitos.");
      return;
    }

    setCargando(true);

    try {
      const resultado = await verificarCorreo({
        email,
        token: codigo,
      });

      setMensaje(resultado.mensaje);
      setError(resultado.error ?? "");
      setVerificado(resultado.exitoso && resultado.verificado);
    } catch {
      setError("Ocurrió un error al verificar el código.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Verificación de correo
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Introduce el código de 8 dígitos que enviamos a tu correo electrónico.
        </p>

        <p className="mt-2 break-all text-sm font-medium text-gray-900">
          {email}
        </p>
      </div>

      {verificado ? (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4"
        >
          <h3 className="font-semibold text-green-800">
            Correo verificado correctamente
          </h3>
          <p className="mt-1 text-sm text-green-700">{mensaje}</p>
        </div>
      ) : (
        <form onSubmit={manejarVerificacion} className="space-y-5">
          <div>
            <label
              htmlFor="codigo-otp"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Código de verificación
            </label>

            <input
              id="codigo-otp"
              name="codigo"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{8}"
              maxLength={8}
              minLength={8}
              required
              value={codigo}
              onChange={(evento) =>
                setCodigo(evento.target.value.replace(/\D/g, "").slice(0, 8))
              }
              placeholder="00000000"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.35em] text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {mensaje && (
            <p role="status" className="text-sm text-green-700">
              {mensaje}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando || codigo.length !== 8}
            className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cargando ? "Verificando..." : "Verificar correo"}
          </button>
        </form>
      )}
    </section>
  );
}
