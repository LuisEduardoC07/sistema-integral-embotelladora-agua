"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { iniciarSesion } from "@/services/autenticacion/autenticacion.service";

const DESTINOS_PERMITIDOS = [
  "/superusuario",
  "/administrador",
  "/cajero",
  "/cliente",
] as const;

type DestinoPermitido = (typeof DESTINOS_PERMITIDOS)[number];

interface RespuestaDestino {
  exitoso: boolean;
  mensaje: string;
  destino: string | null;
}

export default function FormularioInicioSesion() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function manejarInicioSesion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    setCargando(true);
    setError("");

    try {
      const resultado = await iniciarSesion({
        email: email.trim().toLowerCase(),
        password,
      });

      if (!resultado.exitoso) {
        setError(resultado.error ?? resultado.mensaje);
        return;
      }

      const respuesta = await fetch("/api/autenticacion/destino", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const datos: RespuestaDestino = await respuesta.json();

      if (
        !respuesta.ok ||
        !datos.exitoso ||
        !datos.destino ||
        !DESTINOS_PERMITIDOS.includes(
          datos.destino as DestinoPermitido
        )
      ) {
        setError(
          datos.mensaje || "No fue posible validar el acceso a tu cuenta."
        );
        return;
      }

      router.replace(datos.destino);
      router.refresh();
    } catch {
      setError(
        "No fue posible validar tu cuenta. Inténtalo nuevamente."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={manejarInicioSesion} className="w-full space-y-5">
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
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          placeholder="Introduce tu contraseña"
        />
      </div>

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
        {cargando ? "Validando acceso..." : "Iniciar sesión"}
      </button>

      <p className="text-center text-sm text-gray-600">
        ¿No tienes una cuenta?{" "}
        <Link
          href="/registro"
          className="font-semibold text-blue-700 hover:text-blue-800"
        >
          Regístrate
        </Link>
      </p>
    </form>
  );
}
