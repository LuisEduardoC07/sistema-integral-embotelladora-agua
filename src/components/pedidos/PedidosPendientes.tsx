"use client";

import { useMemo, useState } from "react";
import type {
  EstadoPedido,
  PedidoCliente,
} from "@/types/pedidos/pedidos.types";

interface Props {
  pedidosIniciales: PedidoCliente[];
  errorInicial: string | null;
  puedeGestionar: boolean;
  puedeEntregar: boolean;
}

type Filtro = "todos" | EstadoPedido;

const ESTADOS: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const OPCIONES_GESTION: EstadoPedido[] = [
  "pendiente",
  "confirmado",
  "en_preparacion",
  "en_camino",
  "entregado",
  "cancelado",
];

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

function fechaLegible(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(anio, mes - 1, dia));
}

function horaLegible(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  const fecha = new Date();
  fecha.setHours(h, m, 0, 0);
  return new Intl.DateTimeFormat("es-DO", {
    hour: "numeric",
    minute: "2-digit",
  }).format(fecha);
}

function colorEstado(estado: EstadoPedido) {
  if (estado === "entregado") return "bg-emerald-50 text-emerald-700";
  if (estado === "cancelado") return "bg-red-50 text-red-700";
  if (estado === "pendiente") return "bg-amber-50 text-amber-700";
  return "bg-sky-50 text-sky-700";
}

export default function PedidosPendientes({
  pedidosIniciales,
  errorInicial,
  puedeGestionar,
  puedeEntregar,
}: Props) {
  const [pedidos, setPedidos] = useState(pedidosIniciales);
  const [filtro, setFiltro] = useState<Filtro>(
    puedeGestionar ? "todos" : "pendiente"
  );
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [error, setError] = useState(errorInicial ?? "");
  const [mensaje, setMensaje] = useState("");

  const pedidosFiltrados = useMemo(() => {
    if (!puedeGestionar) {
      return pedidos.filter((pedido) => pedido.estado === "pendiente");
    }

    if (filtro === "todos") return pedidos;

    return pedidos.filter((pedido) => pedido.estado === filtro);
  }, [pedidos, filtro, puedeGestionar]);

  const conteos = useMemo(() => ({
    todos: pedidos.length,
    pendiente: pedidos.filter((p) => p.estado === "pendiente").length,
    confirmado: pedidos.filter((p) => p.estado === "confirmado").length,
    en_preparacion: pedidos.filter((p) => p.estado === "en_preparacion").length,
    en_camino: pedidos.filter((p) => p.estado === "en_camino").length,
    entregado: pedidos.filter((p) => p.estado === "entregado").length,
    cancelado: pedidos.filter((p) => p.estado === "cancelado").length,
  }), [pedidos]);

  async function actualizarEstado(pedidoId: string, estado: EstadoPedido) {
    setError("");
    setMensaje("");
    setActualizando(pedidoId);

    try {
      const respuesta = await fetch("/api/pedidos-pendientes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido_id: pedidoId, estado }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error ?? "No fue posible actualizar el pedido.");
      }

      setPedidos((actuales) =>
        actuales.map((pedido) =>
          pedido.id === pedidoId ? { ...pedido, estado } : pedido
        )
      );

      setMensaje("El pedido se actualizó correctamente.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error inesperado.");
    } finally {
      setActualizando(null);
    }
  }

  const filtros: { valor: Filtro; etiqueta: string }[] = [
    { valor: "todos", etiqueta: "Todos" },
    { valor: "pendiente", etiqueta: "Pendientes" },
    { valor: "confirmado", etiqueta: "Confirmados" },
    { valor: "en_preparacion", etiqueta: "En preparación" },
    { valor: "en_camino", etiqueta: "En camino" },
    { valor: "entregado", etiqueta: "Entregados" },
    { valor: "cancelado", etiqueta: "Cancelados" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-xs font-bold tracking-[.16em] text-cyan-700">
          GESTIÓN DE ENTREGAS
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
          Pedidos pendientes
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Consulta las solicitudes de los clientes y gestiona su entrega.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Pendientes</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">{conteos.pendiente}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">En preparación</p>
          <p className="mt-1 text-2xl font-extrabold text-sky-700">{conteos.en_preparacion}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">En camino</p>
          <p className="mt-1 text-2xl font-extrabold text-blue-700">{conteos.en_camino}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Entregados</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700">{conteos.entregado}</p>
        </div>
      </section>

      {puedeGestionar && (
        <div className="flex flex-wrap gap-2">
          {filtros.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => setFiltro(opcion.valor)}
              className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                filtro === opcion.valor
                  ? "border-cyan-700 bg-cyan-700 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-cyan-500"
              }`}
            >
              {opcion.etiqueta}
              <span className="ml-1 opacity-75">
                {conteos[opcion.valor]}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {mensaje && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {mensaje}
        </div>
      )}

      {pedidosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-bold text-slate-800">
            No hay pedidos para mostrar
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Cuando existan solicitudes correspondientes a esta vista, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidosFiltrados.map((pedido) => {
            const finalizado = pedido.estado === "entregado" || pedido.estado === "cancelado";

            return (
              <article
                key={pedido.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Pedido #{pedido.numero}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Registrado el{" "}
                      {new Intl.DateTimeFormat("es-DO", {
                        dateStyle: "medium",
                        timeZone: "America/Santo_Domingo",
                      }).format(new Date(pedido.creado_en))}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${colorEstado(pedido.estado)}`}>
                    {ESTADOS[pedido.estado]}
                  </span>
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-2">
                  <section>
                    <h2 className="text-sm font-bold text-slate-800">Datos del cliente</h2>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div>
                        <dt className="text-xs text-slate-400">Nombre</dt>
                        <dd className="font-semibold text-slate-700">{pedido.cliente_nombre}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">Correo electrónico</dt>
                        <dd className="break-all text-slate-700">{pedido.cliente_email}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">Teléfono</dt>
                        <dd className="text-slate-700">{pedido.cliente_telefono || "No proporcionado"}</dd>
                      </div>
                    </dl>

                    <h2 className="mt-5 text-sm font-bold text-slate-800">Entrega solicitada</h2>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div>
                        <dt className="text-xs text-slate-400">Fecha y hora</dt>
                        <dd className="font-semibold text-slate-700">
                          {fechaLegible(pedido.fecha_entrega)} · {horaLegible(pedido.hora_entrega)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">Dirección de entrega</dt>
                        <dd className="text-slate-700">{pedido.direccion_entrega}</dd>
                      </div>
                      {pedido.observaciones && (
                        <div>
                          <dt className="text-xs text-slate-400">Observaciones</dt>
                          <dd className="text-slate-700">{pedido.observaciones}</dd>
                        </div>
                      )}
                    </dl>
                  </section>

                  <section>
                    <h2 className="text-sm font-bold text-slate-800">Productos solicitados</h2>
                    <div className="mt-3 space-y-3">
                      {pedido.detalles.map((detalle) => (
                        <div key={detalle.id} className="flex justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-700">{detalle.nombre_producto}</p>
                            <p className="text-xs text-slate-400">
                              {detalle.cantidad} {detalle.unidad} × {moneda.format(Number(detalle.precio_unitario))}
                            </p>
                          </div>
                          <strong className="shrink-0 text-slate-700">
                            {moneda.format(Number(detalle.total))}
                          </strong>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal</span>
                        <span>{moneda.format(Number(pedido.subtotal))}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Impuestos</span>
                        <span>{moneda.format(Number(pedido.impuesto))}</span>
                      </div>
                      <div className="flex justify-between pt-1 text-base font-extrabold text-slate-900">
                        <span>Total</span>
                        <span>{moneda.format(Number(pedido.total))}</span>
                      </div>
                    </div>
                  </section>
                </div>

                {!finalizado && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
                    <p className="text-xs text-slate-500">
                      {puedeGestionar
                        ? "Puedes actualizar el estado de este pedido."
                        : "El cajero puede completar únicamente pedidos pendientes."}
                    </p>

                    {puedeGestionar ? (
                      <select
                        aria-label={`Cambiar estado del pedido ${pedido.numero}`}
                        value={pedido.estado}
                        disabled={actualizando === pedido.id}
                        onChange={(e) => actualizarEstado(pedido.id, e.target.value as EstadoPedido)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
                      >
                        {OPCIONES_GESTION.map((estado) => (
                          <option key={estado} value={estado}>{ESTADOS[estado]}</option>
                        ))}
                      </select>
                    ) : puedeEntregar && pedido.estado === "pendiente" ? (
                      <button
                        type="button"
                        disabled={actualizando === pedido.id}
                        onClick={() => actualizarEstado(pedido.id, "entregado")}
                        className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actualizando === pedido.id ? "Actualizando..." : "Marcar como completado"}
                      </button>
                    ) : null}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
