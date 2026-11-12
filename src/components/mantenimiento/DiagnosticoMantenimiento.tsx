"use client";

import { useState } from "react";

type Comprobacion = {
  clave: string;
  nombre: string;
  grupo: string;
  estado: "correcto" | "error";
  detalle: string;
  registros: number | null;
};

type Diagnostico = {
  fecha: string;
  estado: "correcto" | "advertencia";
  resumen: {
    total: number;
    correctas: number;
    errores: number;
  };
  comprobaciones: Comprobacion[];
};

const GRUPOS = ["Servicios", "Seguridad", "Operaciones", "Control"];

export function DiagnosticoMantenimiento() {
  const [resultado, setResultado] = useState<Diagnostico | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function ejecutarDiagnostico() {
    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/mantenimiento/diagnostico", {
        method: "GET",
        cache: "no-store",
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No fue posible ejecutar el diagnóstico.");
      }

      setResultado(datos);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al ejecutar el diagnóstico."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="rounded-2xl bg-gradient-to-r from-[#15364a] to-[#176b83] px-7 py-9 text-white shadow-sm sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
          Administración del sistema
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Mantenimiento
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
          Supervisa los servicios, comprueba la disponibilidad de la base de
          datos y revisa el estado de los módulos esenciales de AquaControl.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Diagnóstico del sistema
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Ejecuta comprobaciones de solo lectura sobre los servicios y las
              tablas principales.
            </p>
          </div>

          <button
            type="button"
            onClick={ejecutarDiagnostico}
            disabled={cargando}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#176b83] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12566b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cargando ? "Comprobando..." : "Ejecutar diagnóstico"}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!resultado && !error && (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="font-medium text-slate-700">
              Diagnóstico pendiente
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Ejecuta la comprobación para conocer el estado actual del sistema.
            </p>
          </div>
        )}

        {resultado && (
          <div className="mt-7 space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Comprobaciones</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {resultado.resumen.total}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Correctas</p>
                <p className="mt-1 text-2xl font-bold text-emerald-800">
                  {resultado.resumen.correctas}
                </p>
              </div>
              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-sm text-red-700">Con errores</p>
                <p className="mt-1 text-2xl font-bold text-red-800">
                  {resultado.resumen.errores}
                </p>
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${
              resultado.estado === "correcto"
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}>
              <p className="font-semibold text-slate-800">
                {resultado.estado === "correcto"
                  ? "Todas las comprobaciones finalizaron correctamente."
                  : "Se encontraron servicios o tablas que necesitan revisión."}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Última ejecución: {new Date(resultado.fecha).toLocaleString()}
              </p>
            </div>

            {GRUPOS.map((grupo) => {
              const elementos = resultado.comprobaciones.filter(
                (item) => item.grupo === grupo
              );

              if (elementos.length === 0) return null;

              return (
                <div key={grupo}>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    {grupo}
                  </h3>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {elementos.map((item) => (
                      <div
                        key={item.clave}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-slate-800">
                            {item.nombre}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {item.detalle}
                          </p>
                          {item.registros !== null && (
                            <p className="mt-1 text-xs text-slate-400">
                              Registros existentes: {item.registros}
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                          item.estado === "correcto"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {item.estado === "correcto" ? "Disponible" : "Error"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">
          Alcance de las comprobaciones
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Este diagnóstico consulta la disponibilidad de servicios y tablas.
          No modifica registros, no elimina información y no ejecuta cambios
          en la configuración de Supabase.
        </p>
      </section>
    </div>
  );
}