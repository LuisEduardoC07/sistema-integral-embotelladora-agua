"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CajeroHistorialOption,
  RespuestaHistorialVentas,
  VentaHistorial,
} from "@/types/ventas/historial-ventas.types";
import styles from "./HistorialVentas.module.css";

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

const fechaHora = (valor: string) =>
  new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santo_Domingo",
  }).format(new Date(valor));

const metodoNombre: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  otro: "Otro",
};

function importe(valor: number) {
  return moneda.format(Number(valor) || 0);
}

export function HistorialVentas({
  cajeros = [],
  puedeFiltrarCajero = false,
}: {
  cajeros?: CajeroHistorialOption[];
  puedeFiltrarCajero?: boolean;
}) {
  const [datos, setDatos] = useState<RespuestaHistorialVentas | null>(null);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaHistorial | null>(null);

  // Valores editables: no generan consultas mientras el usuario escribe.
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [cajeroId, setCajeroId] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [estado, setEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // Solo estos valores se envían a la API.
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    fechaDesde: "",
    fechaHasta: "",
    cajeroId: "",
    metodoPago: "",
    estado: "",
    busqueda: "",
  });

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const solicitudActiva = useRef<AbortController | null>(null);

  const cargar = useCallback(async (
    nuevoCursor: { creado_en: string; id: string } | null = null
  ) => {
    solicitudActiva.current?.abort();

    const controlador = new AbortController();
    solicitudActiva.current = controlador;

    setCargando(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (filtrosAplicados.fechaDesde) {
        params.set("fechaDesde", filtrosAplicados.fechaDesde);
      }

      if (filtrosAplicados.fechaHasta) {
        params.set("fechaHasta", filtrosAplicados.fechaHasta);
      }

      if (filtrosAplicados.cajeroId) {
        params.set("cajeroId", filtrosAplicados.cajeroId);
      }

      if (filtrosAplicados.metodoPago) {
        params.set("metodoPago", filtrosAplicados.metodoPago);
      }

      if (filtrosAplicados.estado) {
        params.set("estado", filtrosAplicados.estado);
      }

      if (filtrosAplicados.busqueda.trim()) {
        params.set("busqueda", filtrosAplicados.busqueda.trim());
      }

      if (nuevoCursor) {
        params.set("cursorFecha", nuevoCursor.creado_en);
        params.set("cursorId", nuevoCursor.id);
      }

      const response = await fetch(
        `/api/ventas/historial?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
          signal: controlador.signal,
        }
      );

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(
          resultado.error || "No fue posible consultar las ventas."
        );
      }

      const nuevosDatos = resultado.datos as RespuestaHistorialVentas;

      setDatos((anteriores) => {
        if (!nuevoCursor || !anteriores) {
          return nuevosDatos;
        }

        return {
          ...nuevosDatos,
          ventas: [
            ...anteriores.ventas,
            ...nuevosDatos.ventas.filter(
              (nueva) =>
                !anteriores.ventas.some(
                  (anterior) => anterior.id === nueva.id
                )
            ),
          ],
        };
      });

      setVentaSeleccionada(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Error al consultar las ventas."
      );

      if (!nuevoCursor) {
        setDatos(null);
      }
    } finally {
      if (solicitudActiva.current === controlador) {
        solicitudActiva.current = null;
        setCargando(false);
      }
    }
  }, [filtrosAplicados]);

  useEffect(() => {
    void cargar(null);

    return () => {
      solicitudActiva.current?.abort();
    };
  }, [cargar]);

  function aplicarFiltros() {
    setFiltrosAplicados({
      fechaDesde,
      fechaHasta,
      cajeroId,
      metodoPago,
      estado,
      busqueda: busqueda.trim(),
    });
  }

  function limpiarFiltros() {
    setFechaDesde("");
    setFechaHasta("");
    setCajeroId("");
    setMetodoPago("");
    setEstado("");
    setBusqueda("");

    setFiltrosAplicados({
      fechaDesde: "",
      fechaHasta: "",
      cajeroId: "",
      metodoPago: "",
      estado: "",
      busqueda: "",
    });
  }
  const estadisticas = datos?.estadisticas;
  const maxDia = Math.max(1, ...(estadisticas?.ventas_por_dia ?? []).map((item) => item.total));
  const maxProducto = Math.max(1, ...(estadisticas?.productos_mas_vendidos ?? []).map((item) => item.cantidad));
  const maxCajero = Math.max(1, ...(estadisticas?.ventas_por_cajero ?? []).map((item) => item.total));
  const maxMetodo = Math.max(1, ...(estadisticas?.metodos_pago ?? []).map((item) => item.total));

  return (
    <section className={styles.contenedor}>
      <header className={styles.encabezado}>
        <div>
          <span className={styles.etiqueta}>GESTIÓN COMERCIAL</span>
          <h1>Historial de ventas</h1>
          <p>Consulta operaciones, comprobantes, pagos y rendimiento comercial.</p>
        </div>
        <button className={styles.botonSecundario} onClick={() => void cargar(null)} disabled={cargando}>
          {cargando ? "Actualizando..." : "Actualizar"}
        </button>
      </header>

      <div className={styles.filtros}>
        <label>
          Desde
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </label>
        <label>
          Método de pago
          <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
            <option value="">Todos</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label>
          Estado
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="completada">Completadas</option>
            <option value="anulada">Anuladas</option>
          </select>
        </label>
        {puedeFiltrarCajero && (
          <label>
            Cajero
            <select
              value={cajeroId}
              onChange={(e) => setCajeroId(e.target.value)}
            >
              <option value="">Todos los cajeros</option>
              {cajeros.map((cajero) => (
                <option key={cajero.id} value={cajero.id}>
                  {cajero.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={styles.busqueda}>
          Buscar venta, cliente o número
          <input
            type="search"
            maxLength={100}
            placeholder="Escribe para buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicarFiltros();
            }}
          />
        </label>
        <button className={styles.botonPrimario} onClick={aplicarFiltros} disabled={cargando}>
          Aplicar filtros
        </button>
        <button
          className={styles.botonTexto}
          onClick={limpiarFiltros}
        >
          Limpiar
        </button>
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.tarjetas}>
        <article className={styles.tarjeta}>
          <span>Ventas completadas</span>
          <strong>{estadisticas?.cantidad_ventas ?? "—"}</strong>
          <small>{importe(estadisticas?.total_ventas ?? 0)}</small>
        </article>
        <article className={styles.tarjeta}>
          <span>Ticket promedio</span>
          <strong>{estadisticas ? importe(estadisticas.ticket_promedio) : "—"}</strong>
          <small>Por venta completada</small>
        </article>
        <article className={styles.tarjeta}>
          <span>Productos vendidos</span>
          <strong>{estadisticas?.productos_vendidos ?? "—"}</strong>
          <small>Unidades registradas</small>
        </article>
        <article className={styles.tarjeta}>
          <span>Ventas anuladas</span>
          <strong>{estadisticas?.cantidad_anuladas ?? "—"}</strong>
          <small>{importe(estadisticas?.total_anulado ?? 0)}</small>
        </article>
      </div>

      <div className={styles.graficos}>
        <article className={styles.panelGrafico}>
          <h2>Ventas por día</h2>
          {!estadisticas?.ventas_por_dia.length ? (
            <p className={styles.vacioGrafico}>No hay datos para el período seleccionado.</p>
          ) : (
            <div className={styles.barras}>
              {estadisticas.ventas_por_dia.map((item) => (
                <div className={styles.barraItem} key={item.fecha} title={`${item.fecha}: ${importe(item.total)}`}>
                  <div className={styles.barraFondo}>
                    <div className={styles.barra} style={{ height: `${Math.max(3, item.total / maxDia * 100)}%` }} />
                  </div>
                  <strong>{importe(item.total)}</strong>
                  <span>{item.fecha}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.panelGrafico}>
          <h2>Métodos de pago</h2>
          {!estadisticas?.metodos_pago.length ? (
            <p className={styles.vacioGrafico}>No hay pagos registrados.</p>
          ) : (
            <div className={styles.listaBarras}>
              {estadisticas.metodos_pago.map((item) => (
                <div className={styles.filaBarra} key={item.metodo}>
                  <div><span>{metodoNombre[item.metodo]}</span><strong>{importe(item.total)}</strong></div>
                  <div className={styles.progreso}><span style={{ width: `${item.total / maxMetodo * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.panelGrafico}>
          <h2>Productos más vendidos</h2>
          {!estadisticas?.productos_mas_vendidos.length ? (
            <p className={styles.vacioGrafico}>No hay productos vendidos.</p>
          ) : (
            <div className={styles.listaBarras}>
              {estadisticas.productos_mas_vendidos.map((item) => (
                <div className={styles.filaBarra} key={item.producto_id}>
                  <div><span>{item.nombre} · {item.cantidad} uds.</span><strong>{importe(item.total)}</strong></div>
                  <div className={styles.progreso}><span style={{ width: `${item.cantidad / maxProducto * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.panelGrafico}>
          <h2>Rendimiento por cajero</h2>
          {!estadisticas?.ventas_por_cajero.length ? (
            <p className={styles.vacioGrafico}>No hay actividad para mostrar.</p>
          ) : (
            <div className={styles.listaBarras}>
              {estadisticas.ventas_por_cajero.map((item) => (
                <div className={styles.filaBarra} key={item.usuario_id}>
                  <div><span>{item.nombre} · {item.cantidad} ventas</span><strong>{importe(item.total)}</strong></div>
                  <div className={styles.progreso}><span style={{ width: `${item.total / maxCajero * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>

      <section className={styles.panelTabla}>
        <div className={styles.tituloTabla}>
          <div>
            <h2>Operaciones registradas</h2>
            <p>Selecciona una venta para consultar sus productos y pagos.</p>
          </div>
          <span>{datos?.ventas.length ?? 0} registros en esta página</span>
        </div>

        <div className={styles.tablaScroll}>
          <table>
            <thead>
              <tr>
                <th>Venta</th>
                <th>Fecha</th>
                <th>Cajero</th>
                <th>Cliente</th>
                <th>Pago</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {datos?.ventas.map((venta) => (
                <tr key={venta.id}>
                  <td>#{venta.numero}</td>
                  <td>{fechaHora(venta.creado_en)}</td>
                  <td>{venta.cajero_nombre}</td>
                  <td>{venta.cliente_nombre || "Consumidor final"}</td>
                  <td>{[...new Set(venta.pagos.map((p) => metodoNombre[p.metodo]))].join(" + ") || "—"}</td>
                  <td className={styles.total}>{importe(venta.total)}</td>
                  <td>
                    <span className={venta.estado === "completada" ? styles.estadoOk : styles.estadoAnulado}>
                      {venta.estado === "completada" ? "Completada" : "Anulada"}
                    </span>
                  </td>
                  <td>
                    <button className={styles.enlaceDetalle} onClick={() => setVentaSeleccionada(venta)}>
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
              {!cargando && !datos?.ventas.length && (
                <tr><td colSpan={8} className={styles.sinDatos}>No se encontraron ventas con esos filtros.</td></tr>
              )}
              {cargando && (
                <tr><td colSpan={8} className={styles.sinDatos}>Consultando operaciones...</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.paginacion}>
          <span>{datos?.hay_mas ? "Hay más operaciones disponibles." : "Fin de los resultados."}</span>
          <button
            className={styles.botonSecundario}
            disabled={cargando || !datos?.hay_mas || !datos.siguiente_cursor}
            onClick={() => datos?.siguiente_cursor && void cargar(datos.siguiente_cursor)}
          >
            Cargar siguientes
          </button>
        </div>
      </section>

      {ventaSeleccionada && (
        <div className={styles.modalFondo} role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setVentaSeleccionada(null);
        }}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="detalle-venta-titulo">
            <div className={styles.modalEncabezado}>
              <div>
                <span className={styles.etiqueta}>DETALLE DE OPERACIÓN</span>
                <h2 id="detalle-venta-titulo">Venta #{ventaSeleccionada.numero}</h2>
                <p>{fechaHora(ventaSeleccionada.creado_en)}</p>
              </div>
              <button className={styles.cerrarModal} onClick={() => setVentaSeleccionada(null)} aria-label="Cerrar detalle">×</button>
            </div>

            <div className={styles.datosVenta}>
              <p><span>Cajero</span><strong>{ventaSeleccionada.cajero_nombre}</strong></p>
              <p><span>Cliente</span><strong>{ventaSeleccionada.cliente_nombre || "Consumidor final"}</strong></p>
              <p><span>Estado</span><strong>{ventaSeleccionada.estado}</strong></p>
              <p><span>Comprobante interno</span><strong>#{ventaSeleccionada.numero}</strong></p>
            </div>

            <h3>Productos vendidos</h3>
            <div className={styles.tablaScroll}>
              <table>
                <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr></thead>
                <tbody>
                  {ventaSeleccionada.detalles.map((detalle) => (
                    <tr key={detalle.id}>
                      <td>{detalle.nombre_producto}</td>
                      <td>{detalle.cantidad}</td>
                      <td>{importe(detalle.precio_unitario)}</td>
                      <td>{importe(detalle.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3>Pagos</h3>
            <div className={styles.listaPagos}>
              {ventaSeleccionada.pagos.map((pago) => (
                <div key={pago.id}>
                  <span>{metodoNombre[pago.metodo]}</span>
                  <span>Aplicado: {importe(pago.monto)}</span>
                  <strong>Recibido: {importe(pago.monto_recibido)}</strong>
                </div>
              ))}
            </div>

            <div className={styles.resumenImportes}>
              <p><span>Subtotal</span><strong>{importe(ventaSeleccionada.subtotal)}</strong></p>
              <p><span>Descuento</span><strong>{importe(ventaSeleccionada.descuento)}</strong></p>
              <p><span>Impuestos</span><strong>{importe(ventaSeleccionada.impuesto)}</strong></p>
              <p className={styles.totalFinal}><span>Total</span><strong>{importe(ventaSeleccionada.total)}</strong></p>
              <p><span>Cambio devuelto</span><strong>{importe(ventaSeleccionada.cambio_devuelto)}</strong></p>
            </div>

            {ventaSeleccionada.motivo_anulacion && (
              <p className={styles.motivoAnulacion}>Motivo de anulación: {ventaSeleccionada.motivo_anulacion}</p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
