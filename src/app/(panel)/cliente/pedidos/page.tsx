import { connection } from "next/server";
import Link from "next/link";
import { protegerPanel } from "@/lib/seguridad/proteger-panel";
import { obtenerPedidosDelCliente } from "@/services/pedidos/pedidos-cliente.service";
import type { PedidoCliente, EstadoPedido } from "@/types/pedidos/pedidos.types";

export const instant = false;

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

const estados: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

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

function TarjetaPedido({ pedido }: { pedido: PedidoCliente }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pedido #{pedido.numero}</p>
          <p className="mt-1 text-sm text-slate-500">
            Solicitado el {new Intl.DateTimeFormat("es-DO", {
              dateStyle: "medium",
              timeZone: "America/Santo_Domingo",
            }).format(new Date(pedido.creado_en))}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${
          pedido.estado === "entregado" ? "bg-emerald-50 text-emerald-700" :
          pedido.estado === "cancelado" ? "bg-red-50 text-red-700" :
          pedido.estado === "pendiente" ? "bg-amber-50 text-amber-700" :
          "bg-sky-50 text-sky-700"
        }`}>
          {estados[pedido.estado]}
        </span>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-bold text-slate-800">Entrega solicitada</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Fecha y hora</dt>
              <dd className="mt-0.5 font-medium text-slate-700">{fechaLegible(pedido.fecha_entrega)} · {horaLegible(pedido.hora_entrega)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Dirección</dt>
              <dd className="mt-0.5 text-slate-700">{pedido.direccion_entrega}</dd>
            </div>
            {pedido.observaciones && (
              <div>
                <dt className="text-xs text-slate-400">Observaciones</dt>
                <dd className="mt-0.5 text-slate-700">{pedido.observaciones}</dd>
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
                <strong className="shrink-0 text-slate-700">{moneda.format(Number(detalle.total))}</strong>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span><span>{moneda.format(Number(pedido.subtotal))}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm text-slate-500">
              <span>Impuestos</span><span>{moneda.format(Number(pedido.impuesto))}</span>
            </div>
            <div className="mt-2 flex justify-between text-base font-extrabold text-slate-900">
              <span>Total</span><span>{moneda.format(Number(pedido.total))}</span>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

export default async function PaginaMisPedidos() {
  await connection();
  await protegerPanel("cliente");
  const resultado = await obtenerPedidosDelCliente();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[.16em] text-cyan-700">MI CUENTA</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Mis pedidos</h1>
          <p className="mt-2 text-sm text-slate-500">Consulta tus solicitudes, fechas de entrega y estados.</p>
        </div>
        <Link href="/cliente" className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-800">
          Crear un pedido
        </Link>
      </header>

      {resultado.error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{resultado.error}</div>
      ) : resultado.pedidos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-bold text-slate-800">Todavía no tienes pedidos</h2>
          <p className="mt-2 text-sm text-slate-500">Cuando solicites una entrega, podrás consultar aquí su seguimiento.</p>
          <Link href="/cliente" className="mt-5 inline-flex rounded-xl bg-cyan-700 px-5 py-3 text-sm font-bold text-white hover:bg-cyan-800">
            Explorar productos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {resultado.pedidos.map((pedido) => <TarjetaPedido key={pedido.id} pedido={pedido} />)}
        </div>
      )}
    </div>
  );
}
