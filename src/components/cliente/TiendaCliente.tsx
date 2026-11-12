"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import type { ProductoCatalogoPublico } from "@/services/productos/catalogo-publico.service";
import styles from "./TiendaCliente.module.css";

interface Props {
  productos: ProductoCatalogoPublico[];
  errorCatalogo: boolean;
  nombreCliente: string;
}

interface ItemCarrito {
  producto: ProductoCatalogoPublico;
  cantidad: number;
}

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

function fechaLocalActual() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export default function TiendaCliente({
  productos,
  errorCatalogo,
  nombreCliente,
}: Props) {
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [direccion, setDireccion] = useState("");
  const [fecha, setFecha] = useState(fechaLocalActual);
  const [hora, setHora] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [pedidoCreado, setPedidoCreado] = useState("");

  const cantidadArticulos = carrito.reduce((suma, item) => suma + item.cantidad, 0);
  const subtotalVisual = useMemo(
    () => carrito.reduce((suma, item) => suma + item.producto.precio * item.cantidad, 0),
    [carrito]
  );

  function agregar(producto: ProductoCatalogoPublico) {
    setPedidoCreado("");
    setCarrito((actual) => {
      const existente = actual.find((item) => item.producto.id === producto.id);
      if (existente) {
        return actual.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: Math.min(item.cantidad + 1, 9999) }
            : item
        );
      }
      return [...actual, { producto, cantidad: 1 }];
    });
  }

  function cambiarCantidad(productoId: string, cantidad: number) {
    setCarrito((actual) =>
      cantidad <= 0
        ? actual.filter((item) => item.producto.id !== productoId)
        : actual.map((item) =>
            item.producto.id === productoId
              ? { ...item, cantidad: Math.min(cantidad, 9999) }
              : item
          )
    );
  }

  async function enviarPedido(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensajeError("");
    setPedidoCreado("");

    if (carrito.length === 0) {
      setMensajeError("Agrega al menos un producto antes de solicitar el pedido.");
      return;
    }

    setEnviando(true);

    try {
      const respuesta = await fetch("/api/cliente/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: carrito.map((item) => ({
            producto_id: item.producto.id,
            cantidad: item.cantidad,
          })),
          direccion,
          fecha_entrega: fecha,
          hora_entrega: hora,
          observaciones,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setMensajeError(resultado.error || "No se pudo registrar tu pedido.");
        return;
      }

      setCarrito([]);
      setDireccion("");
      setFecha(fechaLocalActual());
      setHora("");
      setObservaciones("");
      setPedidoCreado(resultado.pedido_id);
    } catch {
      setMensajeError("No fue posible conectar con el sistema. Inténtalo nuevamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={styles.contenedor}>
      <section className={styles.bienvenida}>
        <div>
          <p className={styles.etiqueta}>TIENDA DEL CLIENTE</p>
          <h1>Hola, {nombreCliente}</h1>
          <p>Selecciona tus productos y programa la entrega de tu pedido.</p>
        </div>
        <Link href="/cliente/pedidos" className={styles.enlacePedidos}>
          Consultar mis pedidos
        </Link>
      </section>

      {pedidoCreado && (
        <div className={styles.exito} role="status">
          <div>
            <strong>¡Tu solicitud fue registrada!</strong>
            <p>Tu número de pedido es {pedidoCreado.slice(0, 8).toUpperCase()}.</p>
          </div>
          <Link href="/cliente/pedidos">Ver mis pedidos</Link>
        </div>
      )}

      <div className={styles.distribucion}>
        <section className={styles.seccionCatalogo}>
          <div className={styles.encabezadoSeccion}>
            <div>
              <p className={styles.etiqueta}>CATÁLOGO</p>
              <h2>Productos disponibles</h2>
              <p>Agrega al carrito los productos que deseas recibir.</p>
            </div>
            <span className={styles.contador}>{cantidadArticulos} artículos</span>
          </div>

          {errorCatalogo ? (
            <div className={styles.estadoVacio}>
              No pudimos cargar los productos. Vuelve a intentarlo más tarde.
            </div>
          ) : productos.length === 0 ? (
            <div className={styles.estadoVacio}>
              Todavía no hay productos disponibles en el catálogo.
            </div>
          ) : (
            <div className={styles.gridProductos}>
              {productos.map((producto) => (
                <article className={styles.tarjetaProducto} key={producto.id}>
                  <div className={styles.imagenProducto}>
                    {producto.imagen_url ? (
                      // La URL proviene del almacenamiento público de Supabase.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={producto.imagen_url} alt={producto.nombre} />
                    ) : (
                      <span className={styles.iconoAgua} aria-hidden="true">◈</span>
                    )}
                  </div>
                  <div className={styles.detalleProducto}>
                    <h3>{producto.nombre}</h3>
                    {producto.descripcion && <p>{producto.descripcion}</p>}
                    <div className={styles.pieProducto}>
                      <div>
                        <strong>{moneda.format(producto.precio)}</strong>
                        <small>Por {producto.unidad}</small>
                      </div>
                      <button type="button" onClick={() => agregar(producto)}>
                        Agregar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className={styles.panelPedido}>
          <div className={styles.tituloCarrito}>
            <div>
              <p className={styles.etiqueta}>TU SOLICITUD</p>
              <h2>Carrito</h2>
            </div>
            <span>{cantidadArticulos}</span>
          </div>

          {carrito.length === 0 ? (
            <div className={styles.carritoVacio}>
              <span aria-hidden="true">🛒</span>
              <strong>Tu carrito está vacío</strong>
              <p>Agrega productos del catálogo para comenzar.</p>
            </div>
          ) : (
            <div className={styles.listaCarrito}>
              {carrito.map((item) => (
                <div className={styles.itemCarrito} key={item.producto.id}>
                  <div className={styles.itemInfo}>
                    <strong>{item.producto.nombre}</strong>
                    <small>{moneda.format(item.producto.precio)} / {item.producto.unidad}</small>
                  </div>
                  <div className={styles.controlesCantidad}>
                    <button
                      type="button"
                      aria-label={`Disminuir ${item.producto.nombre}`}
                      onClick={() => cambiarCantidad(item.producto.id, item.cantidad - 1)}
                    >−</button>
                    <span>{item.cantidad}</span>
                    <button
                      type="button"
                      aria-label={`Aumentar ${item.producto.nombre}`}
                      onClick={() => cambiarCantidad(item.producto.id, item.cantidad + 1)}
                    >+</button>
                  </div>
                  <strong className={styles.totalLinea}>
                    {moneda.format(item.producto.precio * item.cantidad)}
                  </strong>
                </div>
              ))}
              <div className={styles.subtotal}>
                <span>Subtotal estimado</span>
                <strong>{moneda.format(subtotalVisual)}</strong>
              </div>
              <p className={styles.notaPrecio}>
                El importe definitivo se calcula al registrar la solicitud con los precios vigentes del sistema.
              </p>
            </div>
          )}

          <form className={styles.formulario} onSubmit={enviarPedido}>
            <div className={styles.encabezadoFormulario}>
              <h3>Datos de entrega</h3>
              <p>Indica dónde y cuándo deseas recibir tu pedido.</p>
            </div>

            <label>
              Dirección o lugar de entrega
              <textarea
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle, número, sector, referencias..."
                minLength={5}
                maxLength={500}
                required
              />
            </label>

            <div className={styles.camposFechaHora}>
              <label>
                Fecha solicitada
                <input
                  type="date"
                  value={fecha}
                  min={fechaLocalActual()}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </label>
              <label>
                Hora solicitada
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  required
                />
              </label>
            </div>

            <label>
              Observaciones (opcional)
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Indicaciones adicionales para la entrega..."
                maxLength={1000}
                rows={3}
              />
            </label>

            {mensajeError && (
              <p className={styles.error} role="alert">{mensajeError}</p>
            )}

            <button
              className={styles.botonSolicitar}
              type="submit"
              disabled={enviando || carrito.length === 0}
            >
              {enviando ? "Registrando solicitud..." : "Solicitar pedido"}
            </button>
            <p className={styles.aclaracion}>
              Esta acción registra una solicitud de entrega. No genera una venta ni descuenta inventario.
            </p>
          </form>
        </aside>
      </div>
    </div>
  );
}
