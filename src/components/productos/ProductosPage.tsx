"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import styles from "./ProductosPage.module.css";
import type { RolSistema } from "@/types/usuarios/perfil.types";
import type { ProductoGestion } from "@/types/productos/productos.types";
import {
  ajustarExistencia,
  actualizarProducto,
  cambiarEstadoProducto,
  crearProducto,
  listarProductosGestion,
} from "@/services/productos/productos.service";

type EstadoFiltro = "todos" | "activos" | "inactivos";
type Vista = "tabla" | "tarjetas";
type Modal = "crear" | "editar" | "stock" | null;

type FormularioProducto = {
  codigo: string;
  nombre: string;
  descripcion: string;
  unidad: string;
  precio: string;
  costo: string;
  tasa_impuesto: string;
  existencia_inicial: string;
  existencia_minima: string;
};

type IconoNombre =
  | "box" | "check" | "alert" | "empty" | "search" | "plus"
  | "x" | "edit" | "trash" | "table" | "grid" | "upload"
  | "info" | "refresh" | "stock";

const FORMULARIO_VACIO: FormularioProducto = {
  codigo: "",
  nombre: "",
  descripcion: "",
  unidad: "unidad",
  precio: "",
  costo: "0",
  tasa_impuesto: "0",
  existencia_inicial: "0",
  existencia_minima: "0",
};

const RUTAS: Record<IconoNombre, string> = {
  box: "M12 3l9 5-9 5-9-5 9-5z M3 8v9l9 5 9-5V8 M12 13v9",
  check: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M8 12l3 3 5-6",
  alert: "M12 9v4 M12 17h.01 M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  empty: "M4 7l8-4 8 4v10l-8 4-8-4V7z M4 7l8 4 8-4 M12 11v10",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16 M21 21l-4.3-4.3",
  plus: "M12 5v14 M5 12h14",
  x: "M18 6 6 18 M6 6l12 12",
  edit: "M4 20h4L19 9l-4-4L4 16v4z M13 7l4 4",
  trash: "M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3",
  table: "M3 5h18v14H3z M3 10h18 M3 15h18 M9 5v14",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  upload: "M12 16V4 M7 9l5-5 5 5 M4 20h16",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M12 11v5 M12 8h.01",
  refresh: "M20 7v5h-5 M4 17v-5h5 M5.6 9a7 7 0 0 1 11.8-2L20 12 M4 12l2.6 5a7 7 0 0 0 11.8-2",
  stock: "M3 7h18 M5 7l1 13h12l1-13 M9 7V4h6v3 M9 12h6",
};

function Icono({ nombre, tam = 18 }: { nombre: IconoNombre; tam?: number }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={styles.icono}
    >
      <path d={RUTAS[nombre]} />
    </svg>
  );
}

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

const numero = new Intl.NumberFormat("es-DO", {
  maximumFractionDigits: 3,
});

function errorTexto(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Ocurrió un error inesperado.";
}

function esNumeroValido(valor: string) {
  return valor.trim() !== "" && Number.isFinite(Number(valor)) && Number(valor) >= 0;
}

export function ProductosPage({ rol }: { rol: RolSistema }) {
  const puedeGestionar = rol === "administrador" || rol === "superusuario";

  const [productos, setProductos] = useState<ProductoGestion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<EstadoFiltro>("todos");
  const [vista, setVista] = useState<Vista>("tabla");

  const [modal, setModal] = useState<Modal>(null);
  const [productoSeleccionado, setProductoSeleccionado] =
    useState<ProductoGestion | null>(null);

  const [formulario, setFormulario] =
    useState<FormularioProducto>(FORMULARIO_VACIO);

  const [archivoImagen, setArchivoImagen] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [quitarImagen, setQuitarImagen] = useState(false);

  const [nuevaExistencia, setNuevaExistencia] = useState("");
  const [motivoAjuste, setMotivoAjuste] = useState("");

  const cargarProductos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const resultado = await listarProductosGestion();
      setProductos(resultado);
    } catch (e) {
      setError(errorTexto(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarProductos();
  }, [cargarProductos]);

  useEffect(() => {
    if (!archivoImagen) {
      setVistaPrevia(null);
      return;
    }

    const url = URL.createObjectURL(archivoImagen);
    setVistaPrevia(url);

    return () => URL.revokeObjectURL(url);
  }, [archivoImagen]);

  const busquedaNormalizada = busqueda.trim().toLocaleLowerCase("es");

  const filtrados = useMemo(
    () =>
      productos.filter((producto) => {
        const coincideTexto =
          producto.nombre.toLocaleLowerCase("es").includes(busquedaNormalizada) ||
          producto.codigo.toLocaleLowerCase("es").includes(busquedaNormalizada);

        const coincideEstado =
          estado === "todos" ||
          (estado === "activos" ? producto.activo : !producto.activo);

        return coincideTexto && coincideEstado;
      }),
    [productos, busquedaNormalizada, estado],
  );

  const estadisticas = useMemo(() => {
    const activos = productos.filter((p) => p.activo);
    return [
      {
        titulo: "Total de productos",
        valor: productos.length,
        detalle: "Productos registrados",
        icono: "box" as const,
      },
      {
        titulo: "Productos activos",
        valor: activos.length,
        detalle: "Disponibles en el catálogo",
        icono: "check" as const,
      },
      {
        titulo: "Stock bajo",
        valor: activos.filter(
          (p) => p.existencia > 0 && p.existencia <= p.existencia_minima,
        ).length,
        detalle: "Requieren reposición",
        icono: "alert" as const,
      },
      {
        titulo: "Sin existencia",
        valor: activos.filter((p) => p.existencia <= 0).length,
        detalle: "Productos agotados",
        icono: "empty" as const,
      },
    ];
  }, [productos]);

  function abrirCrear() {
    setProductoSeleccionado(null);
    setFormulario(FORMULARIO_VACIO);
    setArchivoImagen(null);
    setQuitarImagen(false);
    setMensaje("");
    setModal("crear");
  }

  function abrirEditar(producto: ProductoGestion) {
    setProductoSeleccionado(producto);
    setFormulario({
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? "",
      unidad: producto.unidad,
      precio: String(producto.precio),
      costo: String(producto.costo),
      tasa_impuesto: String(producto.tasa_impuesto),
      existencia_inicial: "0",
      existencia_minima: String(producto.existencia_minima),
    });
    setArchivoImagen(null);
    setQuitarImagen(false);
    setMensaje("");
    setModal("editar");
  }

  function abrirAjuste(producto: ProductoGestion) {
    setProductoSeleccionado(producto);
    setNuevaExistencia(String(producto.existencia));
    setMotivoAjuste("");
    setMensaje("");
    setModal("stock");
  }

  function cerrarModal() {
    if (guardando) return;
    setModal(null);
    setProductoSeleccionado(null);
    setArchivoImagen(null);
    setVistaPrevia(null);
    setQuitarImagen(false);
  }

  function cambiarCampo(
    evento: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = evento.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  }

  function seleccionarImagen(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0] ?? null;
    evento.target.value = "";

    if (!archivo) return;

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
      setError("Formato no permitido. Selecciona JPG, PNG, WEBP o AVIF.");
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      setError("La imagen supera el límite permitido de 5 MB.");
      return;
    }

    setError("");
    setArchivoImagen(archivo);
    setQuitarImagen(false);
  }

  function validarFormulario() {
    if (!formulario.nombre.trim() || !formulario.codigo.trim()) {
      return "El nombre y el código del producto son obligatorios.";
    }

    const camposNumericos = [
      formulario.precio,
      formulario.costo,
      formulario.tasa_impuesto,
      formulario.existencia_minima,
    ];

    if (modal === "crear") {
      camposNumericos.push(formulario.existencia_inicial);
    }

    if (!camposNumericos.every(esNumeroValido)) {
      return "Comprueba los importes y las existencias. Deben ser números iguales o mayores que cero.";
    }

    if (Number(formulario.tasa_impuesto) > 100) {
      return "El impuesto no puede superar el 100%.";
    }

    return null;
  }

  async function guardarProducto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!puedeGestionar || guardando) return;

    const validacion = validarFormulario();

    if (validacion) {
      setError(validacion);
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      if (modal === "crear") {
        const resultado = await crearProducto(
          {
            codigo: formulario.codigo,
            nombre: formulario.nombre,
            descripcion: formulario.descripcion,
            unidad: formulario.unidad,
            precio: Number(formulario.precio),
            costo: Number(formulario.costo),
            tasa_impuesto: Number(formulario.tasa_impuesto),
            existencia_inicial: Number(formulario.existencia_inicial),
            existencia_minima: Number(formulario.existencia_minima),
          },
          archivoImagen,
        );

        setMensaje(
          resultado.advertencia ??
            "Producto registrado correctamente.",
        );
      } else if (modal === "editar" && productoSeleccionado) {
        const resultado = await actualizarProducto(
          {
            id: productoSeleccionado.id,
            codigo: formulario.codigo,
            nombre: formulario.nombre,
            descripcion: formulario.descripcion,
            unidad: formulario.unidad,
            precio: Number(formulario.precio),
            costo: Number(formulario.costo),
            tasa_impuesto: Number(formulario.tasa_impuesto),
            existencia_minima: Number(formulario.existencia_minima),
          },
          archivoImagen,
          quitarImagen,
          productoSeleccionado.imagen_path,
        );

        setMensaje(
          resultado.advertencia ??
            "Producto actualizado correctamente.",
        );
      }

      setModal(null);
      setProductoSeleccionado(null);
      setArchivoImagen(null);
      setQuitarImagen(false);
      await cargarProductos();
    } catch (e) {
      setError(errorTexto(e));
    } finally {
      setGuardando(false);
    }
  }

  async function guardarAjuste(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!puedeGestionar || !productoSeleccionado || guardando) return;

    if (!esNumeroValido(nuevaExistencia)) {
      setError("Introduce una existencia válida.");
      return;
    }

    if (!motivoAjuste.trim()) {
      setError("Debes indicar el motivo del ajuste.");
      return;
    }

    setGuardando(true);
    setError("");

    try {
      await ajustarExistencia(
        productoSeleccionado.id,
        Number(nuevaExistencia),
        motivoAjuste,
      );

      setMensaje("Existencia ajustada y movimiento registrado correctamente.");
      setModal(null);
      setProductoSeleccionado(null);
      await cargarProductos();
    } catch (e) {
      setError(errorTexto(e));
    } finally {
      setGuardando(false);
    }
  }

  async function alternarEstado(producto: ProductoGestion) {
    if (!puedeGestionar) return;

    const accion = producto.activo ? "desactivar" : "activar";

    if (!window.confirm(`¿Deseas ${accion} el producto "${producto.nombre}"?`)) {
      return;
    }

    setError("");
    setMensaje("");

    try {
      await cambiarEstadoProducto(producto.id, !producto.activo);
      setMensaje(
        producto.activo
          ? "Producto desactivado correctamente."
          : "Producto activado correctamente.",
      );
      await cargarProductos();
    } catch (e) {
      setError(errorTexto(e));
    }
  }

  const hayFiltros = busqueda !== "" || estado !== "todos";

  function limpiarFiltros() {
    setBusqueda("");
    setEstado("todos");
  }

  function contenidoVacio() {
    return (
      <div className={styles.estadoVacio}>
        <div className={styles.vacioIcono}>
          <Icono nombre="box" tam={30} />
        </div>
        <h3>{hayFiltros ? "No se encontraron productos" : "Tu catálogo está preparado"}</h3>
        <p>
          {hayFiltros
            ? "Prueba cambiando los filtros o el texto de búsqueda."
            : "Registra tus productos para que aparezcan aquí y estén disponibles en el punto de venta."}
        </p>
        {hayFiltros ? (
          <button
            type="button"
            className={styles.botonPrincipal}
            onClick={limpiarFiltros}
          >
            Limpiar filtros
          </button>
        ) : puedeGestionar ? (
          <button
            type="button"
            className={styles.botonPrincipal}
            onClick={abrirCrear}
          >
            <Icono nombre="plus" tam={16} /> Registrar primer producto
          </button>
        ) : null}
      </div>
    );
  }

  function imagenProducto(producto: ProductoGestion) {
    return producto.imagen_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={styles.miniatura}
        src={producto.imagen_url}
        alt={producto.nombre}
      />
    ) : (
      <span className={styles.miniatura}>
        <Icono nombre="box" tam={20} />
      </span>
    );
  }

  function accionesProducto(producto: ProductoGestion) {
    if (!puedeGestionar) {
      return <span className={styles.textoSoloLectura}>Solo consulta</span>;
    }

    return (
      <div className={styles.acciones}>
        <button
          type="button"
          className={styles.accionEditar}
          title="Editar producto"
          aria-label={`Editar ${producto.nombre}`}
          onClick={() => abrirEditar(producto)}
        >
          <Icono nombre="edit" tam={16} />
        </button>
        <button
          type="button"
          className={styles.accionStock}
          title="Ajustar existencia"
          aria-label={`Ajustar existencia de ${producto.nombre}`}
          onClick={() => abrirAjuste(producto)}
        >
          <Icono nombre="stock" tam={16} />
        </button>
        <button
          type="button"
          className={styles.accionEliminar}
          title={producto.activo ? "Desactivar producto" : "Activar producto"}
          aria-label={`${producto.activo ? "Desactivar" : "Activar"} ${producto.nombre}`}
          onClick={() => void alternarEstado(producto)}
        >
          <Icono nombre={producto.activo ? "trash" : "check"} tam={16} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.pagina}>
      <header className={styles.encabezado}>
        <div className={styles.titulo}>
          <span className={styles.tituloIcono}>
            <Icono nombre="box" tam={26} />
          </span>
          <div>
            <h1>Productos</h1>
            <p>Administra productos, precios, fotografías y disponibilidad.</p>
          </div>
        </div>

        <div className={styles.encabezadoAcciones}>
          <button
            type="button"
            className={styles.botonSecundario}
            onClick={() => void cargarProductos()}
            disabled={cargando}
          >
            <Icono nombre="refresh" tam={16} />
            Actualizar
          </button>

          {puedeGestionar && (
            <button
              type="button"
              className={styles.botonPrincipal}
              onClick={abrirCrear}
            >
              <Icono nombre="plus" tam={17} /> Nuevo producto
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className={styles.alertaError} role="alert">
          <Icono nombre="alert" tam={18} />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Cerrar error">
            <Icono nombre="x" tam={16} />
          </button>
        </div>
      )}

      {mensaje && (
        <div className={styles.alertaExito} role="status">
          <Icono nombre="check" tam={18} />
          <span>{mensaje}</span>
          <button type="button" onClick={() => setMensaje("")} aria-label="Cerrar mensaje">
            <Icono nombre="x" tam={16} />
          </button>
        </div>
      )}

      <section className={styles.estadisticas}>
        {estadisticas.map((item) => (
          <article className={styles.tarjetaEstadistica} key={item.titulo}>
            <div className={styles.iconoEstadistica}>
              <Icono nombre={item.icono} tam={20} />
            </div>
            <div>
              <span>{item.titulo}</span>
              <strong className={styles.valorEstadistica}>{item.valor}</strong>
              <small className={styles.detalleEstadistica}>{item.detalle}</small>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.contenido}>
        <div className={styles.filtros}>
          <div className={styles.busqueda}>
            <Icono nombre="search" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código..."
              aria-label="Buscar productos"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                aria-label="Limpiar búsqueda"
              >
                <Icono nombre="x" tam={16} />
              </button>
            )}
          </div>

          <select
            aria-label="Filtrar por estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoFiltro)}
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>

          <button
            type="button"
            className={styles.botonSecundario}
            onClick={limpiarFiltros}
            disabled={!hayFiltros}
          >
            Limpiar filtros
          </button>

          <div className={styles.controlesVista} role="group" aria-label="Tipo de vista">
            <button
              type="button"
              aria-label="Vista de tabla"
              aria-pressed={vista === "tabla"}
              className={vista === "tabla" ? styles.vistaActiva : ""}
              onClick={() => setVista("tabla")}
            >
              <Icono nombre="table" tam={17} />
            </button>
            <button
              type="button"
              aria-label="Vista de tarjetas"
              aria-pressed={vista === "tarjetas"}
              className={vista === "tarjetas" ? styles.vistaActiva : ""}
              onClick={() => setVista("tarjetas")}
            >
              <Icono nombre="grid" tam={17} />
            </button>
          </div>
        </div>

        <div className={styles.tablaContenedor}>
          {cargando ? (
            <div className={styles.estadoCarga}>
              <span className={styles.indicadorCarga} />
              <p>Cargando productos desde Supabase...</p>
            </div>
          ) : filtrados.length === 0 ? (
            contenidoVacio()
          ) : vista === "tabla" ? (
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Existencia</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((producto) => (
                  <tr key={producto.id}>
                    <td>{imagenProducto(producto)}</td>
                    <td>{producto.codigo}</td>
                    <td className={styles.celdaNombre}>{producto.nombre}</td>
                    <td>{moneda.format(producto.precio)}</td>
                    <td>
                      <span
                        className={
                          producto.existencia <= 0
                            ? styles.stockAgotado
                            : producto.existencia <= producto.existencia_minima
                              ? styles.stockBajo
                              : styles.stockNormal
                        }
                      >
                        {numero.format(producto.existencia)} {producto.unidad}
                      </span>
                    </td>
                    <td>
                      <span className={producto.activo ? styles.etiquetaActivo : styles.etiquetaInactivo}>
                        {producto.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>{accionesProducto(producto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.tarjetasProductos}>
              {filtrados.map((producto) => (
                <article className={styles.tarjetaProducto} key={producto.id}>
                  <div className={styles.tarjetaProductoImagen}>
                    {imagenProducto(producto)}
                    <span className={producto.activo ? styles.etiquetaActivo : styles.etiquetaInactivo}>
                      {producto.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className={styles.tarjetaProductoContenido}>
                    <small>{producto.codigo}</small>
                    <h3>{producto.nombre}</h3>
                    <strong>{moneda.format(producto.precio)}</strong>
                    <p>
                      Existencia: {numero.format(producto.existencia)} {producto.unidad}
                    </p>
                    <p>
                      Mínimo: {numero.format(producto.existencia_minima)} {producto.unidad}
                    </p>
                    {accionesProducto(producto)}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className={styles.pieListado}>
          <span>
            Mostrando {filtrados.length} de {productos.length} productos
          </span>
          <span>{puedeGestionar ? "Gestión habilitada" : "Modo de consulta"}</span>
        </div>
      </section>

      {modal && (
        <div
          className={styles.fondoModal}
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) cerrarModal();
          }}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-producto"
          >
            <header className={styles.modalCabecera}>
              <div>
                <h2 id="titulo-modal-producto">
                  {modal === "crear"
                    ? "Nuevo producto"
                    : modal === "editar"
                      ? "Editar producto"
                      : "Ajustar existencia"}
                </h2>
                <p>
                  {modal === "stock"
                    ? "Registra una corrección de inventario con su motivo."
                    : "Completa los datos del producto."}
                </p>
              </div>
              <button
                type="button"
                className={styles.cerrarModal}
                onClick={cerrarModal}
                disabled={guardando}
                aria-label="Cerrar formulario"
              >
                <Icono nombre="x" tam={18} />
              </button>
            </header>

            {modal === "stock" ? (
              <form onSubmit={guardarAjuste}>
                <div className={styles.modalContenido}>
                  <div className={styles.resumenStock}>
                    <strong>{productoSeleccionado?.nombre}</strong>
                    <span>
                      Existencia actual: {numero.format(productoSeleccionado?.existencia ?? 0)}
                    </span>
                  </div>

                  <div className={styles.campo}>
                    <label htmlFor="nueva-existencia">Nueva existencia *</label>
                    <input
                      id="nueva-existencia"
                      type="number"
                      min="0"
                      step="0.001"
                      value={nuevaExistencia}
                      onChange={(e) => setNuevaExistencia(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.campo}>
                    <label htmlFor="motivo-ajuste">Motivo del ajuste *</label>
                    <textarea
                      id="motivo-ajuste"
                      rows={3}
                      value={motivoAjuste}
                      onChange={(e) => setMotivoAjuste(e.target.value)}
                      placeholder="Ej. Conteo físico, mercancía recibida, corrección..."
                      required
                    />
                  </div>

                  <div className={styles.avisoFormulario}>
                    <span><Icono nombre="info" tam={16} /></span>
                    <p>
                      El ajuste quedará registrado en el historial de movimientos.
                      Las ventas y anulaciones conservan su propio control automático.
                    </p>
                  </div>
                </div>

                <footer className={styles.modalPie}>
                  <button
                    type="button"
                    className={styles.botonSecundario}
                    onClick={cerrarModal}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={styles.botonPrincipal}
                    disabled={guardando}
                  >
                    {guardando ? "Guardando..." : "Guardar ajuste"}
                  </button>
                </footer>
              </form>
            ) : (
              <form onSubmit={guardarProducto}>
                <div className={styles.modalContenido}>
                  <div className={styles.formularioGrid}>
                    <div className={styles.campoImagen}>
                      <label>Fotografía del producto</label>
                      <label className={styles.zonaImagen}>
                        {vistaPrevia || (!quitarImagen && productoSeleccionado?.imagen_url) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={vistaPrevia ?? productoSeleccionado?.imagen_url ?? ""}
                            alt="Vista previa del producto"
                          />
                        ) : (
                          <>
                            <span className={styles.iconoSubir}>
                              <Icono nombre="upload" tam={20} />
                            </span>
                            <strong>Agregar fotografía</strong>
                            <small>Selecciona una imagen de tu equipo</small>
                            <small>JPG, PNG, WEBP o AVIF · Máximo 5 MB</small>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          onChange={seleccionarImagen}
                        />
                      </label>

                      {(vistaPrevia || productoSeleccionado?.imagen_url) && (
                        <button
                          type="button"
                          className={styles.quitarImagen}
                          onClick={() => {
                            setArchivoImagen(null);
                            setQuitarImagen(true);
                          }}
                        >
                          Quitar fotografía
                        </button>
                      )}
                    </div>

                    <div className={styles.camposPrincipales}>
                      <div className={styles.campo}>
                        <label htmlFor="producto-nombre">Nombre del producto *</label>
                        <input
                          id="producto-nombre"
                          name="nombre"
                          value={formulario.nombre}
                          onChange={cambiarCampo}
                          placeholder="Ej. Botellón de agua 5 galones"
                          required
                        />
                      </div>

                      <div className={styles.campo}>
                        <label htmlFor="producto-codigo">Código / SKU *</label>
                        <input
                          id="producto-codigo"
                          name="codigo"
                          value={formulario.codigo}
                          onChange={cambiarCampo}
                          placeholder="Ej. AGU-005"
                          required
                        />
                      </div>

                      <div className={styles.campo}>
                        <label htmlFor="producto-categoria">Categoría</label>
                        <input id="producto-categoria" value="Agua" readOnly />
                      </div>

                      <div className={styles.campo}>
                        <label htmlFor="producto-unidad">Unidad de medida *</label>
                        <select
                          id="producto-unidad"
                          name="unidad"
                          value={formulario.unidad}
                          onChange={cambiarCampo}
                        >
                          <option value="unidad">Unidad</option>
                          <option value="botellon">Botellón</option>
                          <option value="litro">Litro</option>
                          <option value="galon">Galón</option>
                          <option value="paquete">Paquete</option>
                          <option value="caja">Caja</option>
                          <option value="kg">Kilogramo</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className={styles.separador}>
                    <span>Información comercial</span>
                  </div>

                  <div className={styles.camposTres}>
                    <div className={styles.campo}>
                      <label htmlFor="producto-precio">Precio de venta (RD$) *</label>
                      <input
                        id="producto-precio"
                        name="precio"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formulario.precio}
                        onChange={cambiarCampo}
                        required
                      />
                    </div>
                    <div className={styles.campo}>
                      <label htmlFor="producto-costo">Costo (RD$)</label>
                      <input
                        id="producto-costo"
                        name="costo"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formulario.costo}
                        onChange={cambiarCampo}
                      />
                    </div>
                    <div className={styles.campo}>
                      <label htmlFor="producto-impuesto">Impuesto (%)</label>
                      <input
                        id="producto-impuesto"
                        name="tasa_impuesto"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formulario.tasa_impuesto}
                        onChange={cambiarCampo}
                      />
                    </div>
                  </div>

                  <div className={styles.campo}>
                    <label htmlFor="producto-descripcion">Descripción</label>
                    <textarea
                      id="producto-descripcion"
                      name="descripcion"
                      rows={3}
                      value={formulario.descripcion}
                      onChange={cambiarCampo}
                      placeholder="Describe las características del producto..."
                    />
                  </div>

                  <div className={styles.separador}>
                    <span>{modal === "crear" ? "Existencia inicial" : "Control de existencias"}</span>
                  </div>

                  <div className={styles.camposDos}>
                    {modal === "crear" && (
                      <div className={styles.campo}>
                        <label htmlFor="producto-existencia">Existencia inicial</label>
                        <input
                          id="producto-existencia"
                          name="existencia_inicial"
                          type="number"
                          min="0"
                          step="0.001"
                          value={formulario.existencia_inicial}
                          onChange={cambiarCampo}
                        />
                      </div>
                    )}

                    <div className={styles.campo}>
                      <label htmlFor="producto-minimo">Existencia mínima</label>
                      <input
                        id="producto-minimo"
                        name="existencia_minima"
                        type="number"
                        min="0"
                        step="0.001"
                        value={formulario.existencia_minima}
                        onChange={cambiarCampo}
                      />
                    </div>
                  </div>

                  {modal === "editar" && (
                    <div className={styles.avisoFormulario}>
                      <span><Icono nombre="info" tam={16} /></span>
                      <p>
                        Para cambiar la existencia actual utiliza la acción
                        «Ajustar existencia». Así se conserva el historial de movimientos.
                      </p>
                    </div>
                  )}
                </div>

                <footer className={styles.modalPie}>
                  <button
                    type="button"
                    className={styles.botonSecundario}
                    onClick={cerrarModal}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={styles.botonPrincipal}
                    disabled={guardando}
                  >
                    {guardando
                      ? "Guardando..."
                      : modal === "crear"
                        ? "Registrar producto"
                        : "Guardar cambios"}
                  </button>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
