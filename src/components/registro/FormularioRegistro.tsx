"use client";

import { useState, type FormEvent } from "react";
import { registrarUsuario } from "@/services/autenticacion/autenticacion.service";
import VerificacionEmail from "./VerificacionEmail";
import type { DatosRegistro } from "@/types/autenticacion/autenticacion.types";

export default function FormularioRegistro() {
  const [datos, setDatos] = useState<DatosRegistro>({
    nombre: "",
    telefono: "",
    email: "",
    password: "",
  });

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [requiereVerificacion, setRequiereVerificacion] = useState(false);

  function actualizarCampo(campo: keyof DatosRegistro, valor: string) {
    setDatos((actuales) => ({
      ...actuales,
      [campo]: valor,
    }));
  }

  async function manejarRegistro(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    setCargando(true);
    setMensaje("");
    setError("");
    setRequiereVerificacion(false);

    const resultado = await registrarUsuario(datos);

    setCargando(false);
    setMensaje(resultado.mensaje);
    setError(resultado.error ?? "");
    setRequiereVerificacion(
      resultado.exitoso && resultado.requiereVerificacion,
    );
  }

  if (requiereVerificacion) {
    return <VerificacionEmail email={datos.email.trim().toLowerCase()} />;
  }
  return (
    <form onSubmit={manejarRegistro} className="w-full space-y-5">
      <div>
        <label
          htmlFor="nombre"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Nombre completo
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          value={datos.nombre}
          onChange={(evento) => actualizarCampo("nombre", evento.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          placeholder="Introduce tu nombre"
        />
      </div>

      <div>
        <label
          htmlFor="telefono"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Teléfono
        </label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          autoComplete="tel"
          maxLength={30}
          value={datos.telefono}
          onChange={(evento) => actualizarCampo("telefono", evento.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          placeholder="Introduce tu teléfono"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={datos.email}
          onChange={(evento) => actualizarCampo("email", evento.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          placeholder="ejemplo@correo.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={datos.password}
          onChange={(evento) => actualizarCampo("password", evento.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      {mensaje && !requiereVerificacion && (
        <p
          role="status"
          className="rounded-lg bg-green-50 p-3 text-sm text-green-800"
        >
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
        disabled={cargando}
        className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {cargando ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <p className="text-center text-xs leading-5 text-gray-500">
        Al registrarte se creará una cuenta de cliente. La verificación se
        realizará mediante tu correo electrónico.
      </p>
    </form>
  );
}
