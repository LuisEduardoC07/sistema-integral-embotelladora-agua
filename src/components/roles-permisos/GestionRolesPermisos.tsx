"use client";

import { useEffect, useMemo, useState } from "react";

type Permiso = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  modulo: string;
};

type Rol = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  es_sistema: boolean;
  permisosIds: string[];
};

const PERMISOS_SUPERUSUARIO = new Set([
  "usuarios.gestionar_roles",
  "usuarios.gestionar_permisos",
  "usuarios.crear_administrador",
  "usuarios.auditoria",
  "usuarios.suspender_administrador",
  "usuarios.reactivar_administrador",
]);

const PERMISOS_CLIENTE = new Set([
  "perfil.consultar",
  "productos.consultar",
  "pedidos.consultar_propios",
  "pedidos.crear",
  "cotizaciones.crear",
]);

const PERMISOS_CAJERO_RESTRINGIDOS = new Set([
  "productos.crear",
  "productos.editar",
  "productos.desactivar",
  "categorias.gestionar",
  "inventario.ajustar",
  "ventas.anular",
  "pedidos.consultar_todos",
  "pedidos.gestionar",
  "caja.consultar_todas",
  "caja.gestionar_todas",
  "sistema.mantenimiento",
]);

function permisoBloqueado(codigoRol: string, codigoPermiso: string) {
  if (codigoRol === "superusuario") {
    return true;
  }

  if (PERMISOS_SUPERUSUARIO.has(codigoPermiso)) {
    return true;
  }

  if (
    codigoRol === "cliente" &&
    !PERMISOS_CLIENTE.has(codigoPermiso)
  ) {
    return true;
  }

  if (
    codigoRol === "cajero" &&
    (
      codigoPermiso.startsWith("usuarios.") ||
      codigoPermiso.startsWith("sistema.") ||
      codigoPermiso.startsWith("auditoria.") ||
      PERMISOS_CAJERO_RESTRINGIDOS.has(codigoPermiso)
    )
  ) {
    return true;
  }

  return false;
}

function nombreModulo(modulo: string) {
  const nombres: Record<string, string> = {
    usuarios: "Usuarios",
    productos: "Productos",
    inventario: "Inventario",
    ventas: "Ventas",
    pedidos: "Pedidos",
    cotizaciones: "Cotizaciones",
    reportes: "Reportes",
    facturacion: "Facturación",
    caja: "Caja",
    sistema: "Sistema",
    auditoria: "Auditoría",
    perfil: "Perfil",
  };

  return nombres[modulo] ?? modulo.charAt(0).toUpperCase() + modulo.slice(1);
}

export function GestionRolesPermisos() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [rolId, setRolId] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [permisosSeleccionados, setPermisosSeleccionados] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [guardandoPermisos, setGuardandoPermisos] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const rolActual = useMemo(
    () => roles.find((rol) => rol.id === rolId) ?? null,
    [roles, rolId]
  );

  const permisosAgrupados = useMemo(() => {
    const grupos = new Map<string, Permiso[]>();

    for (const permiso of permisos) {
      const actuales = grupos.get(permiso.modulo) ?? [];
      actuales.push(permiso);
      grupos.set(permiso.modulo, actuales);
    }

    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permisos]);

  async function cargarDatos(rolPreferido?: string) {
    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/roles-permisos", {
        method: "GET",
        cache: "no-store",
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error ?? "No fue posible cargar los roles.");
      }

      const listaRoles = (datos.roles ?? []) as Rol[];
      const listaPermisos = (datos.permisos ?? []) as Permiso[];

      setRoles(listaRoles);
      setPermisos(listaPermisos);

      const idElegido =
        (rolPreferido && listaRoles.some((rol) => rol.id === rolPreferido)
          ? rolPreferido
          : "") ||
        (listaRoles.find((rol) => rol.codigo === "administrador")?.id ?? "") ||
        (listaRoles[0]?.id ?? "");

      setRolId(idElegido);

      const seleccionado = listaRoles.find((rol) => rol.id === idElegido);

      setNombre(seleccionado?.nombre ?? "");
      setDescripcion(seleccionado?.descripcion ?? "");
      setPermisosSeleccionados(seleccionado?.permisosIds ?? []);
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "Ocurrió un error al cargar los datos."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarDatos();
  }, []);

  function seleccionarRol(id: string) {
    const seleccionado = roles.find((rol) => rol.id === id);

    setRolId(id);
    setNombre(seleccionado?.nombre ?? "");
    setDescripcion(seleccionado?.descripcion ?? "");
    setPermisosSeleccionados(seleccionado?.permisosIds ?? []);
    setError("");
    setExito("");
  }

  function alternarPermiso(permiso: Permiso, marcado: boolean) {
    if (!rolActual || permisoBloqueado(rolActual.codigo, permiso.codigo)) {
      return;
    }

    setPermisosSeleccionados((actuales) =>
      marcado
        ? [...actuales, permiso.id]
        : actuales.filter((id) => id !== permiso.id)
    );

    setError("");
    setExito("");
  }

  async function guardarDatosRol() {
    if (!rolActual) return;

    setGuardandoDatos(true);
    setError("");
    setExito("");

    try {
      const respuesta = await fetch("/api/roles-permisos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "actualizar_datos",
          rolId: rolActual.id,
          nombre,
          descripcion,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error ?? "No fue posible actualizar el rol.");
      }

      setRoles((actuales) =>
        actuales.map((rol) =>
          rol.id === rolActual.id
            ? { ...rol, nombre: nombre.trim(), descripcion: descripcion.trim() || null }
            : rol
        )
      );

      setExito(datos.mensaje ?? "Datos del rol actualizados.");
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "No fue posible guardar los datos."
      );
    } finally {
      setGuardandoDatos(false);
    }
  }

  async function guardarPermisos() {
    if (!rolActual || rolActual.codigo === "superusuario") return;

    setGuardandoPermisos(true);
    setError("");
    setExito("");

    try {
      const respuesta = await fetch("/api/roles-permisos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "actualizar_permisos",
          rolId: rolActual.id,
          permisosIds: permisosSeleccionados,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error ?? "No fue posible actualizar los permisos.");
      }

      setRoles((actuales) =>
        actuales.map((rol) =>
          rol.id === rolActual.id
            ? { ...rol, permisosIds: [...permisosSeleccionados] }
            : rol
        )
      );

      setExito(datos.mensaje ?? "Permisos actualizados correctamente.");
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "No fue posible guardar los permisos."
      );
    } finally {
      setGuardandoPermisos(false);
    }
  }

  if (cargando) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">
          Cargando roles y permisos desde Supabase...
        </p>
      </section>
    );
  }

  if (roles.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          No hay roles disponibles en el catálogo.
        </p>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <button
          type="button"
          onClick={() => void cargarDatos()}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Reintentar
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Catálogo de roles
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Selecciona un rol para consultar sus datos y autorizaciones.
            </p>
          </div>
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {roles.length} roles registrados
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {roles.map((rol) => (
            <button
              key={rol.id}
              type="button"
              onClick={() => seleccionarRol(rol.id)}
              className={`rounded-xl border p-4 text-left transition ${
                rol.id === rolId
                  ? "border-cyan-600 bg-cyan-50 ring-1 ring-cyan-600"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900">{rol.nombre}</span>
                {rol.es_sistema && (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                    SISTEMA
                  </span>
                )}
              </span>
              <span className="mt-2 block text-xs text-slate-500">
                {rol.permisosIds.length} permisos asignados
              </span>
            </button>
          ))}
        </div>
      </section>

      {rolActual && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Información del rol
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Código interno: <span className="font-mono">{rolActual.codigo}</span>
                </p>
              </div>
              {rolActual.es_sistema && (
                <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  Rol protegido del sistema
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nombre del rol
                </span>
                <input
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  maxLength={60}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Descripción
                </span>
                <input
                  value={descripcion}
                  onChange={(event) => setDescripcion(event.target.value)}
                  maxLength={240}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void guardarDatosRol()}
                disabled={guardandoDatos || !nombre.trim()}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardandoDatos ? "Guardando..." : "Guardar datos del rol"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Permisos asignados
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Consulta y administra las autorizaciones agrupadas por módulo.
                </p>
              </div>
              <span className="w-fit rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">
                {rolActual.codigo === "superusuario"
                  ? `${permisos.length} permisos disponibles`
                  : `${permisosSeleccionados.length} seleccionados`}
              </span>
            </div>

            {rolActual.codigo === "superusuario" ? (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-semibold text-emerald-900">
                  Acceso total protegido
                </p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">
                  El superusuario tiene autorización global mediante la función
                  de seguridad de Supabase. Sus asignaciones no se pueden
                  modificar desde este módulo.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {permisosAgrupados.map(([modulo, lista]) => (
                  <div
                    key={modulo}
                    className="overflow-hidden rounded-xl border border-slate-200"
                  >
                    <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                      <h3 className="font-bold text-slate-800">
                        {nombreModulo(modulo)}
                      </h3>
                      <span className="text-xs font-medium text-slate-500">
                        {lista.filter((permiso) =>
                          permisosSeleccionados.includes(permiso.id)
                        ).length} de {lista.length}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {lista.map((permiso) => {
                        const bloqueado = permisoBloqueado(
                          rolActual.codigo,
                          permiso.codigo
                        );

                        const marcado = permisosSeleccionados.includes(
                          permiso.id
                        );

                        return (
                          <label
                            key={permiso.id}
                            className={`flex gap-3 px-4 py-3 ${
                              bloqueado
                                ? "cursor-not-allowed bg-slate-50/70"
                                : "cursor-pointer hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={marcado}
                              disabled={bloqueado}
                              onChange={(event) =>
                                alternarPermiso(permiso, event.target.checked)
                              }
                              className="mt-1 h-4 w-4 rounded border-slate-300 accent-cyan-700 disabled:opacity-50"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                                {permiso.nombre}
                                {bloqueado && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                    Protegido
                                  </span>
                                )}
                              </span>
                              {permiso.descripcion && (
                                <span className="mt-1 block text-xs leading-5 text-slate-500">
                                  {permiso.descripcion}
                                </span>
                              )}
                              <span className="mt-1 block break-all font-mono text-[10px] text-slate-400">
                                {permiso.codigo}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {rolActual.codigo !== "superusuario" && (
              <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">
                  Los permisos protegidos se validan también en el servidor.
                  Los cambios se registran en la auditoría.
                </p>
                <button
                  type="button"
                  onClick={() => void guardarPermisos()}
                  disabled={guardandoPermisos}
                  className="shrink-0 rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardandoPermisos ? "Guardando permisos..." : "Guardar permisos"}
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {exito && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {exito}
        </div>
      )}
    </div>
  );
}