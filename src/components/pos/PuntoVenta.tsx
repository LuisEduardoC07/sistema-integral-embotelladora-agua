"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { FormEvent } from "react";
import styles from "./PuntoVenta.module.css";

import { listarProductosPOS } from "@/services/productos/productos-pos.service";
import {
  abrirCajaPOS,
  cerrarCajaPOS,
  obtenerCajaAbiertaPOS,
} from "@/services/caja/caja-pos.service";
import { confirmarVentaPOS } from "@/services/ventas/ventas-pos.service";

import type {
  CajaAbiertaPOS,
  MetodoPagoPOS,
  ProductoPOS,
  ResultadoVentaPOS,
} from "@/types/pos/pos.types";

interface LineaCarrito {
  producto: ProductoPOS;
  cantidad: number;
}

interface PagoFormulario {
  metodo: MetodoPagoPOS;
  monto: string;
  referencia: string;
}

interface LineaComprobante {
  codigo: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  impuesto: number;
  total: number;
}

interface ComprobantePOS extends ResultadoVentaPOS {
  fecha: string;
  clienteNombre: string | null;
  observaciones: string | null;
  lineas: LineaComprobante[];
  pagos: {
    metodo: MetodoPagoPOS;
    monto: number;
    referencia: string | null;
  }[];
}

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

function dinero(valor: number) {
  return moneda.format(valor);
}

const METODOS: { valor: MetodoPagoPOS; etiqueta: string; icono: IconoNombre }[] = [
  { valor: "efectivo", etiqueta: "Efectivo", icono: "cash" },
  { valor: "tarjeta", etiqueta: "Tarjeta", icono: "card" },
  { valor: "transferencia", etiqueta: "Transferencia", icono: "bank" },
  { valor: "otro", etiqueta: "Otro", icono: "dots" },
];

type IconoNombre =
  | "cart" | "search" | "user" | "card" | "cash" | "bank" | "dots"
  | "trash" | "plus" | "minus" | "refresh" | "wallet" | "clock"
  | "box" | "receipt" | "x" | "alert" | "check" | "droplet";

const RUTAS: Record<IconoNombre, string> = {
  cart: "M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 7H6 M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2 M18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16 M21 21l-4.3-4.3",
  user: "M20 21a8 8 0 0 0-16 0 M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10",
  card: "M3 6h18v12H3z M3 10h18 M7 15h3",
  cash: "M2 7h20v10H2z M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M6 10v.01 M18 14v.01",
  bank: "M3 10l9-6 9 6 M5 10v8 M9 10v8 M15 10v8 M19 10v8 M3 21h18",
  dots: "M5 12h.01 M12 12h.01 M19 12h.01",
  trash: "M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3",
  plus: "M12 5v14 M5 12h14",
  minus: "M5 12h14",
  refresh: "M20 11a8 8 0 0 0-14.9-3 M4 4v4h4 M4 13a8 8 0 0 0 14.9 3 M20 20v-4h-4",
  wallet: "M3 7a2 2 0 0 1 2-2h14v4 M3 7v11a2 2 0 0 0 2 2h16V9H5a2 2 0 0 1-2-2 M16 14h2",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M12 7v5l3 2",
  box: "M12 3l9 5-9 5-9-5 9-5z M3 8v9l9 5 9-5V8 M12 13v9",
  receipt: "M6 2h12v20l-3-2-3 2-3-2-3 2V2z M9 8h6 M9 12h6 M9 16h3",
  x: "M18 6 6 18 M6 6l12 12",
  alert: "M12 9v4 M12 17h.01 M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  check: "M5 12l5 5 9-11",
  droplet: "M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z",
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

export function PuntoVenta() {
  const [productos, setProductos] = useState<ProductoPOS[]>([]);
  const [caja, setCaja] = useState<CajaAbiertaPOS | null>(null);
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [busqueda, setBusqueda] = useState("");
  const [montoApertura, setMontoApertura] = useState("0");
  const [montoCierre, setMontoCierre] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [pagos, setPagos] = useState<PagoFormulario[]>([
    { metodo: "efectivo", monto: "0", referencia: "" },
  ]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [venta, setVenta] = useState<ComprobantePOS | null>(null);

  async function cargarDatos() {
    try {
      const [lista, cajaActual] = await Promise.all([
        listarProductosPOS(),
        obtenerCajaAbiertaPOS(),
      ]);
      setProductos(lista);
      setCaja(cajaActual);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let cancelado = false;

    Promise.all([listarProductosPOS(), obtenerCajaAbiertaPOS()])
      .then(([lista, cajaActual]) => {
        if (cancelado) return;
        setProductos(lista);
        setCaja(cajaActual);
        setError("");
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const lineas = useMemo<LineaCarrito[]>(() => {
    return Object.entries(carrito)
      .map(([id, cantidad]) => {
        const producto = productos.find((p) => p.id === id);
        return producto ? { producto, cantidad } : null;
      })
      .filter((item): item is LineaCarrito => item !== null);
  }, [carrito, productos]);

  const subtotal = useMemo(
    () => lineas.reduce((suma, linea) => suma + linea.producto.precio * linea.cantidad, 0),
    [lineas],
  );

  const impuesto = useMemo(
    () => lineas.reduce((suma, linea) => {
      const base = linea.producto.precio * linea.cantidad;
      return suma + Number((base * linea.producto.tasa_impuesto / 100).toFixed(2));
    }, 0),
    [lineas],
  );

  const total = Number((subtotal + impuesto).toFixed(2));
  const cantidadArticulos = lineas.reduce((suma, linea) => suma + linea.cantidad, 0);

  const totalCentavos = Math.round(total * 100);

  const pagosCalculados = pagos.map((pago) => ({
    metodo: pago.metodo,
    monto: Number(
      (Math.round(Number(pago.monto) * 100) / 100).toFixed(2),
    ),
    referencia: pago.referencia.trim() || null,
  }));

  const totalPagadoCentavos = pagos.length === 1
    ? totalCentavos
    : pagosCalculados.reduce(
        (suma, pago) => suma + Math.round(pago.monto * 100),
        0,
      );

  const totalPagado = Number((totalPagadoCentavos / 100).toFixed(2));

  const diferenciaPago = Number(
    ((totalCentavos - totalPagadoCentavos) / 100).toFixed(2),
  );

  const pagosInvalidos =
    pagos.length === 0 ||
    (pagos.length === 1
      ? totalCentavos <= 0
      : pagosCalculados.some(
          (pago) => !Number.isFinite(pago.monto) || pago.monto <= 0,
        ));

  function agregarPago() {
    setPagos((actuales) => {
      if (actuales.length === 1) {
        return [
          { ...actuales[0], monto: total.toFixed(2) },
          { metodo: "tarjeta", monto: "0", referencia: "" },
        ];
      }

      return [
        ...actuales,
        { metodo: "tarjeta", monto: "0", referencia: "" },
      ];
    });
  }

  function actualizarPago(
    indice: number,
    cambios: Partial<PagoFormulario>,
  ) {
    setPagos((actuales) =>
      actuales.map((pago, i) =>
        i === indice ? { ...pago, ...cambios } : pago,
      ),
    );
  }

  function eliminarPago(indice: number) {
    setPagos((actuales) =>
      actuales.length > 1
        ? actuales.filter((_, i) => i !== indice)
        : actuales,
    );
  }

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase();
    return productos.filter((p) =>
      p.nombre.toLocaleLowerCase().includes(termino) ||
      p.codigo.toLocaleLowerCase().includes(termino)
    );
  }, [productos, busqueda]);

  function agregarProducto(producto: ProductoPOS) {
    setError("");
    setMensaje("");
    setVenta(null);

    const cantidad = carrito[producto.id] ?? 0;
    if (cantidad + 1 > producto.existencia) {
      setError(`Existencia insuficiente para ${producto.nombre}.`);
      return;
    }

    setCarrito((actual) => ({ ...actual, [producto.id]: cantidad + 1 }));
  }

  function cambiarCantidad(producto: ProductoPOS, cantidad: number) {
    setError("");

    if (cantidad <= 0) {
      setCarrito((actual) => {
        const siguiente = { ...actual };
        delete siguiente[producto.id];
        return siguiente;
      });
      return;
    }

    if (cantidad > producto.existencia) {
      setError(`No hay suficiente existencia de ${producto.nombre}.`);
      return;
    }

    setCarrito((actual) => ({ ...actual, [producto.id]: cantidad }));
  }

  async function manejarApertura(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      const monto = Number(montoApertura);
      if (!Number.isFinite(monto) || monto < 0 ||
          !/^\d+(\.\d{1,2})?$/.test(montoApertura)) {
        throw new Error("Introduce un monto válido con máximo dos decimales.");
      }

      await abrirCajaPOS(monto);
      setMensaje("La caja se abrió correctamente.");
      await cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la caja.");
    } finally {
      setProcesando(false);
    }
  }

  async function manejarCierre(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!caja) return;

    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      const monto = Number(montoCierre);
      if (!Number.isFinite(monto) || monto < 0 ||
          !/^\d+(\.\d{1,2})?$/.test(montoCierre)) {
        throw new Error("Introduce el efectivo contado con máximo dos decimales.");
      }

      const resultado = await cerrarCajaPOS(
        caja.id,
        monto,
        observaciones.trim() || null,
      );

      setMensaje(
        `Caja cerrada. Esperado: ${dinero(Number(resultado.monto_esperado ?? 0))}. Diferencia: ${dinero(Number(resultado.diferencia ?? 0))}.`,
      );
      setMontoCierre("");
      setObservaciones("");
      setCarrito({});
      await cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cerrar la caja.");
    } finally {
      setProcesando(false);
    }
  }

  async function manejarVenta() {
    if (!caja) {
      setError("Debes abrir una caja antes de registrar ventas.");
      return;
    }
    if (lineas.length === 0) {
      setError("Agrega al menos un producto al carrito.");
      return;
    }
    if (total <= 0) {
      setError("El total de la venta debe ser mayor que cero.");
      return;
    }

    if (pagosInvalidos) {
      setError("Todos los métodos de pago deben tener un monto mayor que cero.");
      return;
    }

    if (diferenciaPago !== 0) {
      setError(
        `El pago no coincide con el total. Diferencia: ${dinero(diferenciaPago)}.`,
      );
      return;
    }

    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      const pagosVenta = pagos.map((pago) => ({
        metodo: pago.metodo,
        monto: pagos.length === 1 ? total : Number((Math.round(Number(pago.monto) * 100) / 100).toFixed(2)),
        referencia: pago.referencia.trim() || null,
      }));

      const nombreCliente = clienteNombre.trim() || null;
      const notasVenta = observaciones.trim() || null;

      const resultado = await confirmarVentaPOS({
        cajaId: caja.id,
        items: lineas.map((linea) => ({
          producto_id: linea.producto.id,
          cantidad: linea.cantidad,
        })),
        pagos: pagosVenta,
        clienteNombre: nombreCliente,
        observaciones: notasVenta,
      });

      const lineasComprobante: LineaComprobante[] = lineas.map((linea) => {
        const base = Number(
          (linea.producto.precio * linea.cantidad).toFixed(2),
        );
        const impuestoLinea = Number(
          (base * linea.producto.tasa_impuesto / 100).toFixed(2),
        );

        return {
          codigo: linea.producto.codigo,
          nombre: linea.producto.nombre,
          unidad: linea.producto.unidad,
          cantidad: linea.cantidad,
          precio: linea.producto.precio,
          subtotal: base,
          impuesto: impuestoLinea,
          total: Number((base + impuestoLinea).toFixed(2)),
        };
      });

      setVenta({
        ...resultado,
        fecha: new Date().toISOString(),
        clienteNombre: nombreCliente,
        observaciones: notasVenta,
        lineas: lineasComprobante,
        pagos: pagosVenta,
      });

      setCarrito({});
      setClienteNombre("");
      setObservaciones("");
      setPagos([{ metodo: "efectivo", monto: "0", referencia: "" }]);
      setMensaje(`Venta #${resultado.numero} registrada correctamente.`);
      await cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la venta.");
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <div className={styles.cargando}>
        <span className={styles.spinner} />
        <strong>Preparando punto de venta</strong>
        <span>Consultando productos y estado de caja...</span>
      </div>
    );
  }

  return (
    <main className={styles.contenedor}>
      <header className={styles.topbar}>
        <div className={styles.titulo}>
          <span className={styles.tituloIcono}><Icono nombre="cart" tam={24} /></span>
          <div>
            <h1>Punto de venta</h1>
            <p>Registra ventas y controla tu caja.</p>
          </div>
        </div>

        <div className={styles.topbarAcciones}>
          <div className={`${styles.estadoIndicador} ${caja ? styles.activa : styles.inactiva}`}>
            <span />
            {caja ? "Caja abierta" : "Caja cerrada"}
          </div>
          <button
            type="button"
            className={styles.botonSecundario}
            onClick={() => void cargarDatos()}
            disabled={procesando}
            title="Actualizar información"
          >
            <Icono nombre="refresh" tam={15} /> <span>Actualizar</span>
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.alertaError} role="alert">
          <Icono nombre="alert" tam={16} /> {error}
        </div>
      )}
      {mensaje && (
        <div className={styles.alertaExito} role="status">
          <Icono nombre="check" tam={16} /> {mensaje}
        </div>
      )}

      {!caja ? (
        <section className={styles.apertura}>
          <div className={styles.aperturaIcono}><Icono nombre="wallet" tam={30} /></div>
          <div className={styles.aperturaTexto}>
            <h2>Abre tu caja para comenzar</h2>
            <p>Registra el efectivo inicial disponible antes de realizar la primera venta.</p>
          </div>
          <form onSubmit={manejarApertura} className={styles.formApertura}>
            <label htmlFor="monto-apertura">Efectivo inicial (DOP)</label>
            <div className={styles.inputMoneda}>
              <span>RD$</span>
              <input
                id="monto-apertura"
                type="number"
                min="0"
                step="0.01"
                required
                value={montoApertura}
                onChange={(e) => setMontoApertura(e.target.value)}
              />
            </div>
            <button className={styles.botonCobrar} disabled={procesando}>
              {procesando ? "Abriendo caja..." : "Abrir caja"}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className={styles.resumenCaja}>
            <div className={styles.resumenCajaItem}>
              <span className={styles.resumenIcono}><Icono nombre="wallet" /></span>
              <div><small>Estado</small><strong className={styles.textoActivo}>Caja activa</strong></div>
            </div>
            <div className={styles.resumenCajaItem}>
              <span className={styles.resumenIcono}><Icono nombre="cash" /></span>
              <div><small>Fondo de apertura</small><strong>{dinero(Number(caja.monto_apertura))}</strong></div>
            </div>
            <div className={styles.resumenCajaItem}>
              <span className={styles.resumenIcono}><Icono nombre="clock" /></span>
              <div><small>Hora de apertura</small><strong>{new Date(caja.abierta_en).toLocaleString("es-DO")}</strong></div>
            </div>
            <div className={styles.resumenCajaItem}>
              <span className={styles.resumenIcono}><Icono nombre="cart" /></span>
              <div><small>Artículos en venta</small><strong>{cantidadArticulos}</strong></div>
            </div>
          </section>

          <div className={styles.areaTrabajo}>
            <section className={styles.catalogo}>
              <div className={styles.catalogoCabecera}>
                <div>
                  <h2>Productos</h2>
                  <p>Busca un producto y agrégalo a la venta.</p>
                </div>
                <span className={styles.totalProductos}>{productosFiltrados.length} resultados</span>
              </div>

              <div className={styles.busquedaContenedor}>
                <Icono nombre="search" />
                <input
                  type="search"
                  aria-label="Buscar productos"
                  placeholder="Buscar por nombre o código de producto..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                {busqueda && (
                  <button type="button" onClick={() => setBusqueda("")} aria-label="Limpiar búsqueda">
                    <Icono nombre="x" tam={16} />
                  </button>
                )}
              </div>

              {productosFiltrados.length === 0 ? (
                <div className={styles.catalogoVacio}>
                  <div><Icono nombre="search" tam={26} /></div>
                  <h3>{productos.length === 0 ? "Todavía no hay productos" : "No encontramos resultados"}</h3>
                  <p>{productos.length === 0
                    ? "Cuando registres productos activos, aparecerán aquí para vender."
                    : "Prueba con otro nombre o código de producto."}</p>
                </div>
              ) : (
                <div className={styles.productosGrid}>
                  {productosFiltrados.map((producto) => {
                    const cantidad = carrito[producto.id] ?? 0;
                    const agotado = producto.existencia <= 0;
                    const limite = cantidad >= producto.existencia;

                    return (
                      <article className={styles.productoCard} key={producto.id}>
                        <div className={styles.productoVisual}>
                          {producto.imagen_url ? (
                            <Image
                              src={producto.imagen_url}
                              alt={producto.nombre}
                              fill
                              sizes="(max-width: 650px) 50vw, (max-width: 1150px) 33vw, 25vw"
                              className={styles.productoImagen}
                              unoptimized
                            />
                          ) : (
                            <div className={styles.productoImagenPlaceholder}>
                              <Icono nombre="droplet" tam={42} />
                            </div>
                          )}
                          <span className={`${styles.stockBadge} ${agotado ? styles.stockAgotado : ""}`}>
                            {agotado ? "Agotado" : `${producto.existencia} disponibles`}
                          </span>
                          {cantidad > 0 && <span className={styles.enCarrito}>{cantidad} en venta</span>}
                        </div>

                        <div className={styles.productoInfo}>
                          <span className={styles.productoCodigo}>Cód. {producto.codigo}</span>
                          <h3>{producto.nombre}</h3>
                          <span className={styles.productoUnidad}>{producto.unidad}</span>
                          <div className={styles.productoPie}>
                            <strong>{dinero(producto.precio)}</strong>
                            <button
                              type="button"
                              className={styles.agregar}
                              onClick={() => agregarProducto(producto)}
                              disabled={agotado || limite || procesando}
                            >
                              {limite && !agotado ? "Máximo" : "Agregar"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className={styles.panelVenta}>
              <section className={styles.tarjeta}>
                <div className={styles.tarjetaCabecera}>
                  <span className={styles.tarjetaIcono}><Icono nombre="cart" /></span>
                  <h2>Carrito de compra</h2>
                  <span className={styles.contadorCarrito}>{cantidadArticulos}</span>
                </div>

                <div className={styles.listaCarrito}>
                  {lineas.length === 0 ? (
                    <div className={styles.carritoVacio}>
                      <div className={styles.carritoVacioIcono}><Icono nombre="cart" tam={22} /></div>
                      <strong>Tu venta está vacía</strong>
                      <span>Selecciona productos del catálogo para comenzar.</span>
                    </div>
                  ) : (
                    lineas.map((linea) => (
                      <div className={styles.lineaCarrito} key={linea.producto.id}>
                        <div className={styles.miniatura}>
                          {linea.producto.imagen_url ? (
                            <Image
                              src={linea.producto.imagen_url}
                              alt=""
                              fill
                              sizes="44px"
                              className={styles.productoImagen}
                              unoptimized
                            />
                          ) : (
                            <Icono nombre="droplet" tam={20} />
                          )}
                        </div>
                        <div className={styles.lineaDatos}>
                          <strong>{linea.producto.nombre}</strong>
                          <span>{dinero(linea.producto.precio)} / {linea.producto.unidad}</span>
                          <div className={styles.cantidadControl}>
                            <button
                              type="button"
                              onClick={() => cambiarCantidad(linea.producto, linea.cantidad - 1)}
                              aria-label={`Disminuir ${linea.producto.nombre}`}
                            ><Icono nombre="minus" tam={13} /></button>
                            <span>{linea.cantidad}</span>
                            <button
                              type="button"
                              onClick={() => cambiarCantidad(linea.producto, linea.cantidad + 1)}
                              disabled={linea.cantidad >= linea.producto.existencia}
                              aria-label={`Aumentar ${linea.producto.nombre}`}
                            ><Icono nombre="plus" tam={13} /></button>
                          </div>
                        </div>
                        <div className={styles.lineaDerecha}>
                          <strong className={styles.lineaImporte}>
                            {dinero(linea.producto.precio * linea.cantidad)}
                          </strong>
                          <button
                            type="button"
                            className={styles.eliminarLinea}
                            onClick={() => cambiarCantidad(linea.producto, 0)}
                            aria-label={`Quitar ${linea.producto.nombre}`}
                            title="Quitar"
                          ><Icono nombre="trash" tam={16} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className={styles.tarjeta}>
                <div className={styles.tarjetaCabecera}>
                  <span className={styles.tarjetaIcono}><Icono nombre="user" /></span>
                  <h2>Cliente <small>(opcional)</small></h2>
                </div>
                <div className={styles.tarjetaCuerpo}>
                  <input
                    id="cliente-nombre"
                    aria-label="Nombre del cliente"
                    className={styles.campo}
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Nombre del cliente"
                  />
                </div>
              </section>

              <section className={styles.tarjeta}>
                <div className={styles.tarjetaCabecera}>
                  <span className={styles.tarjetaIcono}><Icono nombre="card" /></span>
                  <h2>Método de pago</h2>
                  <button
                    type="button"
                    className={styles.agregarPago}
                    onClick={agregarPago}
                    disabled={procesando || total <= 0 || pagos.length >= 4}
                  >
                    <Icono nombre="plus" tam={13} /> Dividir pago
                  </button>
                </div>

                <div className={styles.tarjetaCuerpo}>
                  <div className={styles.pagosLista}>
                    {pagos.map((pago, indice) => (
                      <div className={styles.pagoFila} key={indice}>
                        {pagos.length > 1 && (
                          <div className={styles.pagoFilaCabecera}>
                            <strong>Pago {indice + 1}</strong>
                            <button
                              type="button"
                              className={styles.quitarPago}
                              onClick={() => eliminarPago(indice)}
                              disabled={procesando}
                            >
                              Quitar
                            </button>
                          </div>
                        )}

                        <div
                          className={styles.metodos}
                          role="group"
                          aria-label={`Método de pago ${indice + 1}`}
                        >
                          {METODOS.map((metodo) => (
                            <button
                              key={metodo.valor}
                              type="button"
                              aria-pressed={pago.metodo === metodo.valor}
                              className={`${styles.metodo} ${pago.metodo === metodo.valor ? styles.metodoActivo : ""}`}
                              onClick={() => actualizarPago(indice, { metodo: metodo.valor })}
                              disabled={procesando}
                            >
                              <Icono nombre={metodo.icono} tam={20} />
                              {metodo.etiqueta}
                            </button>
                          ))}
                        </div>

                        <label htmlFor={`pago-monto-${indice}`}>Monto (DOP)</label>
                        <input
                          id={`pago-monto-${indice}`}
                          className={styles.campo}
                          type="number"
                          min="0"
                          step="0.01"
                          value={pagos.length === 1 ? total.toFixed(2) : pago.monto}
                          onChange={(e) => actualizarPago(indice, {
                            monto: e.target.value,
                          })}
                          readOnly={pagos.length === 1}
                          disabled={procesando}
                        />

                        {pago.metodo !== "efectivo" && (
                          <>
                            <label htmlFor={`pago-referencia-${indice}`}>
                              Referencia <span>opcional</span>
                            </label>
                            <input
                              id={`pago-referencia-${indice}`}
                              className={styles.campo}
                              type="text"
                              maxLength={120}
                              value={pago.referencia}
                              onChange={(e) => actualizarPago(indice, {
                                referencia: e.target.value,
                              })}
                              placeholder="Referencia de tarjeta o transferencia"
                              disabled={procesando}
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  <label htmlFor="observaciones">Observaciones <span>opcional</span></label>
                  <textarea
                    id="observaciones"
                    className={styles.campo}
                    rows={2}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Notas de esta venta"
                  />
                </div>
              </section>

              <section className={`${styles.tarjeta} ${styles.resumen}`}>
                <div className={styles.tarjetaCabecera}>
                  <span className={styles.tarjetaIcono}><Icono nombre="receipt" /></span>
                  <h2>Resumen</h2>
                </div>
                <div className={styles.totales}>
                  <div><span>Subtotal</span><strong>{dinero(subtotal)}</strong></div>
                  <div><span>Impuestos estimados</span><strong>{dinero(impuesto)}</strong></div>
                  <div className={styles.totalFinal}>
                    <span>Total</span>
                    <strong>{dinero(total)}</strong>
                  </div>
                </div>

                {pagos.length > 1 && (
                  <div className={styles.estadoPagos}>
                    <div>
                      <span>Total pagado</span>
                      <strong>{dinero(totalPagado)}</strong>
                    </div>
                    <div
                      className={`${styles.diferenciaPagos} ${diferenciaPago === 0 ? styles.pagoCompleto : styles.pagoPendiente}`}
                    >
                      <span>
                        {diferenciaPago === 0
                          ? "Estado del pago"
                          : diferenciaPago > 0
                            ? "Pendiente por pagar"
                            : "Monto excedido"}
                      </span>
                      <strong>
                        {diferenciaPago === 0
                          ? "Completo"
                          : dinero(Math.abs(diferenciaPago))}
                      </strong>
                    </div>
                  </div>
                )}

                <div className={styles.cobro}>
                  <button
                    type="button"
                    className={styles.botonCobrar}
                    onClick={() => void manejarVenta()}
                    disabled={
                      procesando ||
                      lineas.length === 0 ||
                      total <= 0 ||
                      pagosInvalidos ||
                      diferenciaPago !== 0
                    }
                  >
                    {procesando ? "Procesando venta..." : `Cobrar venta ${dinero(total)}`}
                  </button>
                  <span className={styles.notaCobro}>La venta se registrará y el inventario se actualizará al confirmar el cobro.</span>
                </div>
              </section>
            </aside>
          </div>

          <section className={styles.cierreCaja}>
            <div>
              <h2>Cierre de caja</h2>
              <p>Cuenta el efectivo disponible y registra el monto real para finalizar la jornada.</p>
            </div>
            <form onSubmit={manejarCierre}>
              <label htmlFor="monto-cierre">Efectivo contado (DOP)</label>
              <div className={styles.inputMoneda}>
                <span>RD$</span>
                <input
                  id="monto-cierre"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={montoCierre}
                  onChange={(e) => setMontoCierre(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <button type="submit" className={styles.botonCerrar} disabled={procesando}>
                {procesando ? "Cerrando..." : "Cerrar caja"}
              </button>
            </form>
          </section>
        </>
      )}

      {venta && (
        <section className={styles.recibo}>
          <div className={styles.reciboCabecera}>
            <span className={styles.etiqueta}>Venta completada</span>
            <h2>Comprobante de venta</h2>
            <strong>Venta #{venta.numero}</strong>
            <p>{new Date(venta.fecha).toLocaleString("es-DO")}</p>
          </div>

          <div className={styles.reciboDatos}>
            <p><strong>Identificador:</strong> {venta.venta_id}</p>
            <p><strong>Cliente:</strong> {venta.clienteNombre || "Consumidor final"}</p>
            <p><strong>Estado:</strong> {venta.estado}</p>
          </div>

          <div className={styles.reciboSeccion}>
            <strong>Detalle de productos</strong>
            <div className={styles.reciboTabla}>
              {venta.lineas.map((linea, indice) => (
                <div className={styles.reciboLinea} key={`${linea.codigo}-${indice}`}>
                  <strong>{linea.nombre}</strong>
                  <span>{linea.codigo} · {linea.cantidad} × {dinero(linea.precio)}</span>
                  <span>Subtotal: {dinero(linea.subtotal)}</span>
                  <span>Impuesto: {dinero(linea.impuesto)}</span>
                  <b>{dinero(linea.total)}</b>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.reciboTotales}>
            <div><span>Subtotal</span><strong>{dinero(Number(venta.subtotal))}</strong></div>
            <div><span>Impuestos</span><strong>{dinero(Number(venta.impuesto))}</strong></div>
            <div className={styles.reciboTotal}>
              <span>Total</span>
              <strong>{dinero(Number(venta.total))}</strong>
            </div>
          </div>

          <div className={styles.reciboSeccion}>
            <strong>Desglose de pagos</strong>
            {venta.pagos.map((pago, indice) => (
              <div className={styles.reciboPago} key={`${pago.metodo}-${indice}`}>
                <span>
                  {pago.metodo === "efectivo" ? "Efectivo"
                    : pago.metodo === "tarjeta" ? "Tarjeta"
                    : pago.metodo === "transferencia" ? "Transferencia"
                    : "Otro"}
                </span>
                <strong>{dinero(pago.monto)}</strong>
                {pago.referencia && <small>Ref.: {pago.referencia}</small>}
              </div>
            ))}
          </div>

          {venta.observaciones && (
            <div className={styles.reciboObservaciones}>
              <strong>Observaciones</strong>
              <p>{venta.observaciones}</p>
            </div>
          )}

          <p className={styles.reciboGracias}>Gracias por su compra</p>

          <button
            type="button"
            className={styles.botonSecundario}
            onClick={() => window.print()}
          >
            Imprimir comprobante
          </button>
        </section>
      )}
    </main>
  );
}