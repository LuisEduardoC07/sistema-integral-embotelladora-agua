"use client";

import { useMemo, useState } from "react";
import type { ProductoCatalogoPublico } from "@/services/productos/catalogo-publico.service";
import styles from "./CotizacionesCliente.module.css";

interface Props {
  productos: ProductoCatalogoPublico[];
  errorCatalogo: boolean;
  nombreCliente: string;
}

interface ItemCotizacion {
  producto: ProductoCatalogoPublico;
  cantidad: number;
}

const TELEFONO_NEGOCIO = "18292575688";
const CORREO_NEGOCIO = "luiseduardocastillo015@gmail.com";

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

export default function CotizacionesCliente({
  productos,
  errorCatalogo,
  nombreCliente,
}: Props) {
  const [seleccionados, setSeleccionados] = useState<ItemCotizacion[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  const cantidadArticulos = seleccionados.reduce(
    (total, item) => total + item.cantidad,
    0
  );

  const subtotal = useMemo(
    () =>
      seleccionados.reduce(
        (total, item) => total + item.producto.precio * item.cantidad,
        0
      ),
    [seleccionados]
  );

  function agregar(producto: ProductoCatalogoPublico) {
    setMensajeError("");

    setSeleccionados((actuales) => {
      const existente = actuales.find(
        (item) => item.producto.id === producto.id
      );

      if (existente) {
        return actuales.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: Math.min(item.cantidad + 1, 9999) }
            : item
        );
      }

      return [...actuales, { producto, cantidad: 1 }];
    });
  }

  function cambiarCantidad(productoId: string, cantidad: number) {
    setSeleccionados((actuales) =>
      cantidad <= 0
        ? actuales.filter((item) => item.producto.id !== productoId)
        : actuales.map((item) =>
            item.producto.id === productoId
              ? { ...item, cantidad: Math.min(cantidad, 9999) }
              : item
          )
    );
  }

  function construirMensaje() {
    const lineas = seleccionados.map((item) => {
      const importe = item.producto.precio * item.cantidad;

      return [
        `- ${item.producto.nombre}`,
        `Cantidad: ${item.cantidad} ${item.producto.unidad}`,
        `Precio de referencia: ${moneda.format(item.producto.precio)}`,
        `Importe estimado: ${moneda.format(importe)}`,
      ].join("\n");
    });

    return [
      "SOLICITUD DE COTIZACIÓN",
      "",
      `Cliente: ${nombreCliente}`,
      "",
      "Productos solicitados:",
      ...lineas,
      "",
      `Subtotal estimado: ${moneda.format(subtotal)}`,
      "",
      observaciones.trim()
        ? `Observaciones: ${observaciones.trim()}`
        : "",
      "",
      "Solicito confirmar disponibilidad y precio definitivo.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function validarCotizacion() {
    setMensajeError("");

    if (seleccionados.length === 0) {
      setMensajeError("Selecciona al menos un producto para cotizar.");
      return false;
    }

    if (
      seleccionados.some(
        (item) =>
          !Number.isFinite(item.cantidad) ||
          item.cantidad <= 0 ||
          item.cantidad > 9999
      )
    ) {
      setMensajeError("Revisa las cantidades de los productos seleccionados.");
      return false;
    }

    return true;
  }

  function enviarWhatsApp() {
    if (!validarCotizacion()) return;

    const mensaje = construirMensaje();
    const url = `https://wa.me/${TELEFONO_NEGOCIO}?text=${encodeURIComponent(mensaje)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function enviarCorreo() {
    if (!validarCotizacion()) return;

    const asunto = "Solicitud de cotización de productos";
    const cuerpo = construirMensaje();

    const url =
      `mailto:${CORREO_NEGOCIO}` +
      `?subject=${encodeURIComponent(asunto)}` +
      `&body=${encodeURIComponent(cuerpo)}`;

    window.location.href = url;
  }

  return (
    <main className={styles.contenedor}>
      <header className={styles.encabezado}>
        <div>
          <p className={styles.etiqueta}>MI CUENTA / COTIZACIONES</p>
          <h1>Solicitar una cotización</h1>
          <p>
            Selecciona los productos y las cantidades que deseas cotizar.
            Te ayudaremos a confirmar los precios y la disponibilidad.
          </p>
        </div>

        <div className={styles.resumenEncabezado}>
          <span>{cantidadArticulos}</span>
          <small>unidades solicitadas</small>
        </div>
      </header>

      <div className={styles.distribucion}>
        <section className={styles.catalogo}>
          <div className={styles.tituloSeccion}>
            <div>
              <span className={styles.etiqueta}>CATÁLOGO</span>
              <h2>Productos disponibles</h2>
            </div>
            <span className={styles.contador}>
              {productos.length} productos
            </span>
          </div>

          {errorCatalogo ? (
            <div className={styles.estado}>
              No fue posible cargar el catálogo. Inténtalo nuevamente más tarde.
            </div>
          ) : productos.length === 0 ? (
            <div className={styles.estado}>
              No hay productos disponibles para cotizar actualmente.
            </div>
          ) : (
            <div className={styles.gridProductos}>
              {productos.map((producto) => {
                const seleccionado = seleccionados.some(
                  (item) => item.producto.id === producto.id
                );

                return (
                  <article
                    key={producto.id}
                    className={styles.tarjetaProducto}
                  >
                    <div className={styles.imagen}>
                      {producto.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={producto.imagen_url}
                          alt={producto.nombre}
                        />
                      ) : (
                        <span aria-hidden="true">◈</span>
                      )}
                    </div>

                    <div className={styles.detalleProducto}>
                      <h3>{producto.nombre}</h3>

                      {producto.descripcion && (
                        <p>{producto.descripcion}</p>
                      )}

                      <div className={styles.pieProducto}>
                        <div>
                          <strong>
                            {moneda.format(producto.precio)}
                          </strong>
                          <small>Por {producto.unidad}</small>
                        </div>

                        <button
                          type="button"
                          onClick={() => agregar(producto)}
                        >
                          {seleccionado ? "Agregar otro" : "Cotizar"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className={styles.panelCotizacion}>
          <div className={styles.tituloPanel}>
            <div>
              <span className={styles.etiqueta}>TU SOLICITUD</span>
              <h2>Mi cotización</h2>
            </div>
            <span className={styles.contador}>{cantidadArticulos}</span>
          </div>

          {seleccionados.length === 0 ? (
            <div className={styles.vacio}>
              <span aria-hidden="true">▤</span>
              <strong>No has seleccionado productos</strong>
              <p>Agrega productos del catálogo para preparar tu cotización.</p>
            </div>
          ) : (
            <div className={styles.lista}>
              {seleccionados.map((item) => (
                <div
                  className={styles.item}
                  key={item.producto.id}
                >
                  <div className={styles.infoItem}>
                    <strong>{item.producto.nombre}</strong>
                    <small>
                      {moneda.format(item.producto.precio)} / {item.producto.unidad}
                    </small>
                  </div>

                  <div className={styles.cantidad}>
                    <button
                      type="button"
                      aria-label={`Disminuir ${item.producto.nombre}`}
                      onClick={() =>
                        cambiarCantidad(
                          item.producto.id,
                          item.cantidad - 1
                        )
                      }
                    >
                      −
                    </button>

                    <span>{item.cantidad}</span>

                    <button
                      type="button"
                      aria-label={`Aumentar ${item.producto.nombre}`}
                      onClick={() =>
                        cambiarCantidad(
                          item.producto.id,
                          item.cantidad + 1
                        )
                      }
                    >
                      +
                    </button>
                  </div>

                  <strong className={styles.importe}>
                    {moneda.format(item.producto.precio * item.cantidad)}
                  </strong>
                </div>
              ))}
            </div>
          )}

          <div className={styles.total}>
            <span>Subtotal estimado</span>
            <strong>{moneda.format(subtotal)}</strong>
          </div>

          <p className={styles.nota}>
            Los importes son referencias calculadas con los precios actuales
            del catálogo. La cotización definitiva debe ser confirmada por el
            negocio.
          </p>

          <label className={styles.campo}>
            Observaciones (opcional)
            <textarea
              value={observaciones}
              onChange={(evento) => setObservaciones(evento.target.value)}
              placeholder="Indica cantidades especiales u otras necesidades..."
              maxLength={1000}
              rows={4}
            />
          </label>

          {mensajeError && (
            <p className={styles.error} role="alert">
              {mensajeError}
            </p>
          )}

          <div className={styles.botones}>
            <button
              type="button"
              className={styles.botonWhatsApp}
              onClick={enviarWhatsApp}
              disabled={seleccionados.length === 0}
            >
              Solicitar por WhatsApp
            </button>

            <button
              type="button"
              className={styles.botonCorreo}
              onClick={enviarCorreo}
              disabled={seleccionados.length === 0}
            >
              Solicitar por correo
            </button>
          </div>

          <p className={styles.aclaracion}>
            Se abrirá la aplicación correspondiente para que revises y envíes
            la solicitud. No se genera una venta ni se modifica el inventario.
          </p>
        </aside>
      </div>
    </main>
  );
}
