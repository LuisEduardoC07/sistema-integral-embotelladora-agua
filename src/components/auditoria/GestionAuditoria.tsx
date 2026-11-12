"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type RegistroAuditoria = {
  id: string;
  tipo: "usuarios" | "operaciones";
  accion: string;
  fecha: string;
  actorId: string | null;
  actorNombre: string;
  actorRol: string;
  afectadoId: string | null;
  afectadoNombre: string | null;
  entidad: string;
  entidadId: string | null;
  motivo: string | null;
  anteriores: Record<string, unknown> | null;
  nuevos: Record<string, unknown> | null;
  datos: Record<string, unknown> | null;
};

type RespuestaAuditoria = {
  registros: RegistroAuditoria[];
  total: number;
  limitePorHistorial: number;
};

function fechaLegible(fecha: string) {
  return new Date(fecha).toLocaleString("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function etiquetaAccion(accion: string) {
  return accion
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function fechaLocal(fecha: string) {
  const date = new Date(fecha);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function GestionAuditoria() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [accion, setAccion] = useState("todas");
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");

  const cargarRegistros = useCallback(async (silencioso = false) => {
    if (silencioso) {
      setActualizando(true);
    } else {
      setCargando(true);
    }

    setError("");

    try {
      const respuesta = await fetch("/api/auditoria", {
        method: "GET",
        cache: "no-store",
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No fue posible cargar las auditorías.");
      }

      const datos = resultado as RespuestaAuditoria;
      setRegistros(datos.registros ?? []);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Ocurrió un error al consultar las auditorías."
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    void cargarRegistros();
  }, [cargarRegistros]);

  const acciones = useMemo(
    () =>
      Array.from(new Set(registros.map((registro) => registro.accion))).sort(),
    [registros]
  );

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase();

    return registros.filter((registro) => {
      if (tipo !== "todos" && registro.tipo !== tipo) return false;
      if (accion !== "todas" && registro.accion !== accion) return false;

      const fecha = fechaLocal(registro.fecha);
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;

      if (termino) {
        const contenido = [
          registro.accion,
          registro.actorNombre,
          registro.actorRol,
          registro.afectadoNombre ?? "",
          registro.entidad,
          registro.entidadId ?? "",
          registro.motivo ?? "",
          JSON.stringify(registro.anteriores ?? {}),
          JSON.stringify(registro.nuevos ?? {}),
          JSON.stringify(registro.datos ?? {}),
        ]
          .join(" ")
          .toLocaleLowerCase();

        if (!contenido.includes(termino)) return false;
      }

      return true;
    });
  }, [registros, busqueda, tipo, accion, desde, hasta]);

  const totalUsuarios = registros.filter(
    (registro) => registro.tipo === "usuarios"
  ).length;

  const totalOperaciones = registros.filter(
    (registro) => registro.tipo === "operaciones"
  ).length;

  return (
    <div className="space-y-7">
      <section className="rounded-2xl bg-gradient-to-r from-[#15364a] to-[#176b83] px-7 py-9 text-white shadow-sm sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
          Administración del sistema
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Auditorías</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
          Consulta el historial de acciones administrativas y operaciones
          registradas en el sistema. Los registros son permanentes y no
          pueden modificarse ni eliminarse.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Registros consultados</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{registros.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Auditoría de usuarios</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalUsuarios}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Auditoría de operaciones</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalOperaciones}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Historial de actividades</h2>
            <p className="mt-1 text-sm text-slate-500">
              Consulta y filtra los movimientos registrados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void cargarRegistros(true)}
            disabled={cargando || actualizando}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actualizando ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">
            Buscar
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Responsable, acción, entidad..."
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Tipo de auditoría
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-cyan-600"
            >
              <option value="todos">Todos los historiales</option>
              <option value="usuarios">Usuarios</option>
              <option value="operaciones">Operaciones</option>
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Acción
            <select
              value={accion}
              onChange={(e) => setAccion(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-cyan-600"
            >
              <option value="todas">Todas las acciones</option>
              {acciones.map((item) => (
                <option key={item} value={item}>
                  {etiquetaAccion(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Desde
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-cyan-600"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Hasta
            <input
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => setHasta(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-cyan-600"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setTipo("todos");
                setAccion("todas");
                setDesde("");
                setHasta("");
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500">
            Resultados: <strong className="text-slate-800">{filtrados.length}</strong>
          </p>
          <p className="text-xs text-slate-400">
            Hasta 150 registros por historial
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {cargando ? (
          <div className="py-14 text-center text-sm text-slate-500">
            Cargando registros de auditoría...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="py-14 text-center">
            <p className="font-semibold text-slate-700">
              No se encontraron registros
            </p>
            <p className="mt-1 text-sm text-slate-500">
              No hay actividades que coincidan con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filtrados.map((registro) => {
              const abierto = seleccionado === `${registro.tipo}-${registro.id}`;

              return (
                <article
                  key={`${registro.tipo}-${registro.id}`}
                  className="rounded-xl border border-slate-200 bg-white"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSeleccionado(
                        abierto ? null : `${registro.tipo}-${registro.id}`
                      )
                    }
                    aria-expanded={abierto}
                    className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          registro.tipo === "usuarios"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-cyan-50 text-cyan-700"
                        }`}>
                          {registro.tipo === "usuarios" ? "Usuarios" : "Operaciones"}
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {etiquetaAccion(registro.accion)}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-sm text-slate-600">
                        Responsable: {registro.actorNombre} · {registro.actorRol}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {registro.entidad}
                        {registro.afectadoNombre
                          ? ` · Usuario afectado: ${registro.afectadoNombre}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <span className="text-xs text-slate-500">
                        {fechaLegible(registro.fecha)}
                      </span>
                      <span className="text-sm font-semibold text-cyan-700">
                        {abierto ? "Cerrar detalle −" : "Ver detalle +"}
                      </span>
                    </div>
                  </button>

                  {abierto && (
                    <div className="space-y-4 border-t border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Responsable
                          </p>
                          <p className="mt-1 text-sm text-slate-800">
                            {registro.actorNombre}
                          </p>
                          <p className="text-xs text-slate-500">
                            {registro.actorRol}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Fecha y hora
                          </p>
                          <p className="mt-1 text-sm text-slate-800">
                            {fechaLegible(registro.fecha)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Entidad
                          </p>
                          <p className="mt-1 text-sm text-slate-800">
                            {registro.entidad}
                          </p>
                          {registro.entidadId && (
                            <p className="break-all text-xs text-slate-500">
                              ID: {registro.entidadId}
                            </p>
                          )}
                        </div>
                        {registro.afectadoNombre && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Usuario afectado
                            </p>
                            <p className="mt-1 text-sm text-slate-800">
                              {registro.afectadoNombre}
                            </p>
                          </div>
                        )}
                      </div>

                      {registro.motivo && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Motivo
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                            {registro.motivo}
                          </p>
                        </div>
                      )}

                      {registro.anteriores && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Datos anteriores
                          </p>
                          <pre className="overflow-x-auto rounded-lg bg-white p-3 text-xs text-slate-700">
                            {JSON.stringify(registro.anteriores, null, 2)}
                          </pre>
                        </div>
                      )}

                      {registro.nuevos && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Datos nuevos
                          </p>
                          <pre className="overflow-x-auto rounded-lg bg-white p-3 text-xs text-slate-700">
                            {JSON.stringify(registro.nuevos, null, 2)}
                          </pre>
                        </div>
                      )}

                      {registro.datos && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Detalle de la operación
                          </p>
                          <pre className="overflow-x-auto rounded-lg bg-white p-3 text-xs text-slate-700">
                            {JSON.stringify(registro.datos, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}