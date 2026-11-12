"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type RolSistema = "administrador" | "superusuario";
type RolGestionable = "cliente" | "administrador" | "cajero";
type EstadoUsuario = "pendiente" | "activo" | "suspendido";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  estado: EstadoUsuario;
  creado_en: string;
  actualizado_en: string;
  rol: RolGestionable;
  rol_nombre: string;
}

interface RegistroAuditoria {
  id: string;
  accion: string;
  motivo: string | null;
  creado_en: string;
  usuario_afectado_id: string | null;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
}

interface RespuestaAPI {
  error?: string;
  mensaje?: string;
  usuarios?: Usuario[];
  auditoria?: RegistroAuditoria[];
  authPendiente?: boolean;
}

export function GestionUsuarios({
  rolActual,
  soloCajeros = false,
}: {
  rolActual: RolSistema;
  soloCajeros?: boolean;
}) {
  const esSuperusuario = rolActual === "superusuario";

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacionPassword, setConfirmacionPassword] = useState("");
  const [rolNuevo, setRolNuevo] = useState<RolGestionable>("cajero");

  const [editando, setEditando] = useState<Usuario | null>(null);
  const [nombreEdicion, setNombreEdicion] = useState("");
  const [emailEdicion, setEmailEdicion] = useState("");
  const [telefonoEdicion, setTelefonoEdicion] = useState("");
  const [passwordNuevo, setPasswordNuevo] = useState("");
  const [confirmacionPasswordNueva, setConfirmacionPasswordNueva] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [usuarioProcesado, setUsuarioProcesado] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const usuariosDelModulo = useMemo(
    () => soloCajeros
      ? usuarios.filter((usuario) => usuario.rol === "cajero")
      : usuarios,
    [usuarios, soloCajeros],
  );

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/usuarios", {
        method: "GET",
        cache: "no-store",
      });

      const datos = await respuesta.json() as RespuestaAPI;

      if (!respuesta.ok) {
        throw new Error(datos.error || "No fue posible cargar los usuarios.");
      }

      setUsuarios(datos.usuarios ?? []);
      setAuditoria(datos.auditoria ?? []);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Ocurrió un error al consultar los usuarios."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarUsuarios();
  }, [cargarUsuarios]);

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return usuariosDelModulo.filter((usuario) => {
      const coincideBusqueda =
        !termino ||
        usuario.nombre.toLowerCase().includes(termino) ||
        usuario.email.toLowerCase().includes(termino) ||
        (usuario.telefono ?? "").toLowerCase().includes(termino);

      const coincideRol =
        filtroRol === "todos" || usuario.rol === filtroRol;

      const coincideEstado =
        filtroEstado === "todos" || usuario.estado === filtroEstado;

      return coincideBusqueda && coincideRol && coincideEstado;
    });
  }, [usuariosDelModulo, busqueda, filtroRol, filtroEstado]);

  const resumen = useMemo(() => ({
    total: usuariosDelModulo.length,
    activos: usuariosDelModulo.filter((u) => u.estado === "activo").length,
    pendientes: usuariosDelModulo.filter((u) => u.estado === "pendiente").length,
    suspendidos: usuariosDelModulo.filter((u) => u.estado === "suspendido").length,
  }), [usuariosDelModulo]);

  async function crearUsuario(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setExito("");

    if (guardando) return;

    if (password.length < 8 || password.length > 72) {
      setError("La contraseña debe tener entre 8 y 72 caracteres.");
      return;
    }

    if (password !== confirmacionPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          email,
          telefono,
          password,
          rol: soloCajeros ? "cajero" : esSuperusuario ? rolNuevo : "cajero",
        }),
      });

      const datos = await respuesta.json() as RespuestaAPI;

      if (!respuesta.ok) {
        throw new Error(datos.error || "No fue posible crear la cuenta.");
      }

      setNombre("");
      setEmail("");
      setTelefono("");
      setPassword("");
      setConfirmacionPassword("");
      setExito(datos.mensaje || "Cuenta creada correctamente.");

      await cargarUsuarios();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No fue posible crear la cuenta."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(
    usuario: Usuario,
    accion: "desactivar" | "reactivar"
  ) {
    const texto = accion === "desactivar"
      ? `¿Deseas desactivar la cuenta de ${usuario.nombre}? Su historial se conservará.`
      : `¿Deseas reactivar la cuenta de ${usuario.nombre}?`;

    if (!window.confirm(texto)) return;

    setError("");
    setExito("");
    setUsuarioProcesado(usuario.id);

    try {
      const respuesta = await fetch("/api/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId: usuario.id,
          accion,
        }),
      });

      const datos = await respuesta.json() as RespuestaAPI;

      if (!respuesta.ok) {
        throw new Error(datos.error || "No fue posible modificar la cuenta.");
      }

      setExito(datos.mensaje || "La cuenta fue actualizada.");
      await cargarUsuarios();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No fue posible modificar la cuenta."
      );
    } finally {
      setUsuarioProcesado("");
    }
  }

  function iniciarEdicion(usuario: Usuario) {
    setEditando(usuario);
    setNombreEdicion(usuario.nombre);
    setEmailEdicion(usuario.email);
    setTelefonoEdicion(usuario.telefono ?? "");
    setPasswordNuevo("");
    setConfirmacionPasswordNueva("");
    setError("");
    setExito("");
  }

  function cerrarEdicion() {
    if (guardando) return;
    setEditando(null);
    setNombreEdicion("");
    setEmailEdicion("");
    setTelefonoEdicion("");
    setPasswordNuevo("");
    setConfirmacionPasswordNueva("");
  }

  async function guardarEdicion(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!editando || guardando) return;

    setError("");
    setExito("");

    setGuardando(true);

    try {
      const respuesta = await fetch("/api/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId: editando.id,
          accion: "editar",
          nombre: nombreEdicion,
          email: emailEdicion,
          telefono: telefonoEdicion,
        }),
      });

      const datos = await respuesta.json() as RespuestaAPI;

      if (!respuesta.ok) {
        throw new Error(datos.error || "No fue posible guardar los cambios.");
      }

      setExito(datos.mensaje || "Los datos fueron actualizados.");
      cerrarEdicion();
      await cargarUsuarios();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No fue posible guardar los cambios."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarPassword(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!editando || guardando) return;

    if (passwordNuevo.length < 8 || passwordNuevo.length > 72) {
      setError("La contraseña debe tener entre 8 y 72 caracteres.");
      return;
    }

    if (passwordNuevo !== confirmacionPasswordNueva) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    if (!window.confirm(`¿Confirmas cambiar la contraseña de ${editando.nombre}?`)) {
      return;
    }

    setError("");
    setExito("");
    setGuardando(true);

    try {
      const respuesta = await fetch("/api/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId: editando.id,
          accion: "password",
          password: passwordNuevo,
        }),
      });

      const datos = await respuesta.json() as RespuestaAPI;

      if (!respuesta.ok) {
        throw new Error(datos.error || "No fue posible cambiar la contraseña.");
      }

      setPasswordNuevo("");
      setConfirmacionPasswordNueva("");
      setExito(datos.mensaje || "La contraseña fue actualizada.");
      cerrarEdicion();
      await cargarUsuarios();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No fue posible cambiar la contraseña."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarUsuario(usuario: Usuario) {
    const motivo = window.prompt(
      `Indica el motivo de eliminación de la cuenta de ${usuario.nombre}:`
    );

    if (motivo === null) return;

    if (!window.confirm(
      `ATENCIÓN: se eliminará permanentemente la cuenta de ${usuario.nombre}. Los registros comerciales e históricos se conservarán. Esta operación no se puede deshacer. ¿Deseas continuar?`
    )) {
      return;
    }

    setError("");
    setExito("");
    setUsuarioProcesado(usuario.id);

    try {
      const respuesta = await fetch("/api/usuarios", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId: usuario.id,
          motivo: motivo.trim(),
        }),
      });

      const datos = await respuesta.json() as RespuestaAPI;

      if (!respuesta.ok) {
        throw new Error(datos.error || "No fue posible eliminar la cuenta.");
      }

      setExito(datos.mensaje || "La cuenta fue eliminada.");
      await cargarUsuarios();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No fue posible eliminar la cuenta."
      );
    } finally {
      setUsuarioProcesado("");
    }
  }

  function fecha(valor: string) {
    const date = new Date(valor);

    if (!Number.isFinite(date.getTime())) return "Fecha no disponible";

    return new Intl.DateTimeFormat("es-DO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  function etiquetaEstado(estado: EstadoUsuario) {
    const estilos: Record<EstadoUsuario, string> = {
      activo: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      pendiente: "bg-amber-50 text-amber-700 ring-amber-200",
      suspendido: "bg-rose-50 text-rose-700 ring-rose-200",
    };

    const etiquetas: Record<EstadoUsuario, string> = {
      activo: "Activo",
      pendiente: "Pendiente",
      suspendido: "Desactivado",
    };

    return (
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estilos[estado]}`}>
        {etiquetas[estado]}
      </span>
    );
  }

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#102f50] via-[#15506b] to-[#087e91] px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
          Administración del sistema
        </p>
        <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Usuarios y cuentas
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              Administra las cuentas, los datos de acceso y los permisos según tu rol.
              Las operaciones quedan registradas en auditoría.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
            <p className="text-xs text-cyan-100">Sesión actual</p>
            <p className="mt-1 font-semibold">
              {esSuperusuario ? "Superusuario" : "Administrador"}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {exito && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {exito}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            titulo: soloCajeros ? "Cajeros registrados" : "Cuentas visibles",
            valor: resumen.total,
            detalle: soloCajeros ? "Personal de caja" : "Clientes y personal",
          },
          { titulo: "Activas", valor: resumen.activos, detalle: "Acceso habilitado" },
          { titulo: "Pendientes", valor: resumen.pendientes, detalle: "Esperando confirmación" },
          { titulo: "Desactivadas", valor: resumen.suspendidos, detalle: "Acceso suspendido" },
        ].map((dato) => (
          <article key={dato.titulo} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-semibold text-slate-500">{dato.titulo}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{dato.valor}</p>
            <p className="mt-1 text-xs text-slate-400">{dato.detalle}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">
            Nueva cuenta
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            {soloCajeros ? "Registrar cajero" : "Crear cuenta"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Establece una contraseña inicial. La cuenta podrá iniciar sesión con el correo y la contraseña asignados.
          </p>
        </div>

        <form onSubmit={crearUsuario} className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Nombre completo</span>
            <input
              required
              minLength={2}
              maxLength={100}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellido"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Correo electrónico</span>
            <input
              required
              type="email"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@correo.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Teléfono (opcional)</span>
            <input
              type="tel"
              maxLength={30}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Número de contacto"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña inicial</span>
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Confirmar contraseña</span>
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={confirmacionPassword}
              onChange={(e) => setConfirmacionPassword(e.target.value)}
              placeholder="Repite la contraseña"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Rol de la cuenta</span>
            {esSuperusuario && !soloCajeros ? (
              <select
                value={rolNuevo}
                onChange={(e) => setRolNuevo(e.target.value as RolGestionable)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              >
                <option value="cliente">Cliente</option>
                <option value="cajero">Cajero</option>
                <option value="administrador">Administrador</option>
              </select>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                Cajero
              </div>
            )}
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#0c637b] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#084e63] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {guardando ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">
              Directorio de cuentas
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Cuentas registradas
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void cargarUsuarios()}
            disabled={cargando}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {cargando ? "Actualizando..." : "Actualizar lista"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono"
            className="min-w-0 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />

          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-600"
          >
            <option value="todos">{soloCajeros ? "Todos los cajeros" : "Todos los roles"}</option>
            {esSuperusuario && !soloCajeros && <option value="cliente">Clientes</option>}
            {esSuperusuario && !soloCajeros && <option value="administrador">Administradores</option>}
            <option value="cajero">Cajeros</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-600"
          >
            <option value="todos">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="pendiente">Pendientes</option>
            <option value="suspendido">Desactivados</option>
          </select>
        </div>

        <div className="mt-5 space-y-3">
          {cargando ? (
            <div className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Cargando cuentas...
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
              <p className="font-semibold text-slate-700">No se encontraron cuentas</p>
              <p className="mt-1 text-sm text-slate-500">
                Cambia los filtros o crea una nueva cuenta.
              </p>
            </div>
          ) : (
            usuariosFiltrados.map((usuario) => (
              <article
                key={usuario.id}
                className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{usuario.nombre}</h3>
                    {etiquetaEstado(usuario.estado)}
                  </div>
                  <p className="mt-1 break-all text-sm text-slate-600">{usuario.email || "Correo no disponible"}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{usuario.rol_nombre || usuario.rol}</span>
                    {usuario.telefono && <span>{usuario.telefono}</span>}
                    <span>Creado: {fecha(usuario.creado_en)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={usuarioProcesado === usuario.id || guardando}
                    onClick={() => iniciarEdicion(usuario)}
                    className="rounded-lg border border-cyan-300 px-3 py-2 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-50 disabled:opacity-50"
                  >
                    Editar / contraseña
                  </button>

                  {usuario.estado === "suspendido" ? (
                    <button
                      type="button"
                      disabled={usuarioProcesado === usuario.id || guardando}
                      onClick={() => void cambiarEstado(usuario, "reactivar")}
                      className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {usuarioProcesado === usuario.id ? "Procesando..." : "Reactivar"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={usuarioProcesado === usuario.id || guardando}
                      onClick={() => void cambiarEstado(usuario, "desactivar")}
                      className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                    >
                      {usuarioProcesado === usuario.id ? "Procesando..." : "Desactivar"}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={usuarioProcesado === usuario.id || guardando}
                    onClick={() => void eliminarUsuario(usuario)}
                    className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Mostrando {usuariosFiltrados.length} de {usuariosDelModulo.length} cuentas.
          Las cuentas desactivadas conservan su historial y sus registros de auditoría.
        </p>
      </section>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-edicion-usuario"
            className="my-auto w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">
                  Gestión de cuenta
                </p>
                <h2 id="titulo-edicion-usuario" className="mt-1 text-xl font-bold text-slate-900">
                  {editando.nombre}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Rol: {editando.rol_nombre || editando.rol}. El rol no se modifica desde esta pantalla.
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarEdicion}
                disabled={guardando}
                aria-label="Cerrar"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={guardarEdicion} className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Nombre completo</span>
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={nombreEdicion}
                  onChange={(e) => setNombreEdicion(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Correo electrónico</span>
                <input
                  required
                  type="email"
                  maxLength={254}
                  value={emailEdicion}
                  onChange={(e) => setEmailEdicion(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Teléfono</span>
                <input
                  type="tel"
                  maxLength={30}
                  value={telefonoEdicion}
                  onChange={(e) => setTelefonoEdicion(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-xl bg-[#0c637b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#084e63] disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  type="button"
                  onClick={cerrarEdicion}
                  disabled={guardando}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>

            <div className="my-6 border-t border-slate-200" />

            <form onSubmit={cambiarPassword} className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900">Cambiar contraseña</h3>
                <p className="mt-1 text-sm text-slate-500">
                  La nueva contraseña permitirá iniciar sesión con el correo actual de la cuenta.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Nueva contraseña</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    required
                    value={passwordNuevo}
                    onChange={(e) => setPasswordNuevo(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Confirmar contraseña</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    required
                    value={confirmacionPasswordNueva}
                    onChange={(e) => setConfirmacionPasswordNueva(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="rounded-xl border border-cyan-700 px-5 py-3 text-sm font-semibold text-cyan-800 hover:bg-cyan-50 disabled:opacity-50"
              >
                {guardando ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </form>
          </section>
        </div>
      )}

      {esSuperusuario && !soloCajeros && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">
            Control y trazabilidad
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Actividad reciente de usuarios
          </h2>

          <div className="mt-5 space-y-3">
            {auditoria.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-7 text-center text-sm text-slate-500">
                Todavía no hay operaciones de usuarios registradas.
              </p>
            ) : (
              auditoria.map((registro) => (
                <article key={registro.id} className="rounded-xl border border-slate-200 px-4 py-3">
                  <div className="flex flex-col justify-between gap-1 sm:flex-row">
                    <p className="text-sm font-semibold text-slate-800">
                      {registro.accion.replaceAll("_", " ")}
                    </p>
                    <time className="text-xs text-slate-400">
                      {fecha(registro.creado_en)}
                    </time>
                  </div>
                  {registro.motivo && (
                    <p className="mt-1 text-sm text-slate-500">{registro.motivo}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    Usuario afectado: {registro.usuario_afectado_id ?? "No disponible"}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}