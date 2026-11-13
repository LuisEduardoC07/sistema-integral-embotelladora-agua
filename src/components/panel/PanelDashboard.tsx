import Link from "next/link";
import type { ResumenDashboard } from "@/services/panel/dashboard.service";

type AccesoRapido = {
  titulo: string;
  descripcion: string;
  href?: string;
};

const formatoNumero = new Intl.NumberFormat("es-DO");

const formatoMoneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 2,
});

export function PanelDashboard({
  titulo,
  descripcion,
  nombre,
  accesos,
  resumen = { pedidosPendientes: 0, productosActivos: 0, ventasCompletadas: 0, ingresosTotales: 0, productosStockBajo: 0, totalProductos: 0 },
}: {
  titulo: string;
  descripcion: string;
  nombre: string;
  accesos: AccesoRapido[];
  resumen?: ResumenDashboard;
}) {
  const indicadores = [
    {
      titulo: "Pedidos pendientes",
      valor: formatoNumero.format(resumen.pedidosPendientes),
      subtitulo: "Solicitudes por gestionar",
      simbolo: "P",
      href: "/pedidos-pendientes",
    },
    {
      titulo: "Productos activos",
      valor: formatoNumero.format(resumen.productosActivos),
      subtitulo: `${formatoNumero.format(resumen.totalProductos)} registrados`,
      simbolo: "PR",
      href: "/productos",
    },
    {
      titulo: "Ventas completadas",
      valor: formatoNumero.format(resumen.ventasCompletadas),
      subtitulo: "Operaciones registradas",
      simbolo: "V",
      href: "/historial-ventas",
    },
    {
      titulo: "Stock bajo",
      valor: formatoNumero.format(resumen.productosStockBajo),
      subtitulo: "Productos que requieren revisión",
      simbolo: "I",
      href: "/productos",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#15364a] to-[#176b83] px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Sistema integral de embotelladora
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {titulo}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">
            {descripcion}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs text-cyan-50">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Sesión activa · Bienvenido, {nombre}
          </div>
        </div>
        <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[35px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-32 right-24 h-64 w-64 rounded-full border-[28px] border-cyan-200/10" />
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-800">Resumen general</h2>
          <p className="mt-1 text-sm text-slate-500">
            Estado actual de la operación, consultado desde la base de datos.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {indicadores.map((indicador) => (
            <Link
              key={indicador.titulo}
              href={indicador.href}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  {indicador.titulo}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-sm font-bold text-cyan-700">
                  {indicador.simbolo}
                </span>
              </div>
              <p className="mt-5 text-2xl font-bold text-slate-800">
                {indicador.valor}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {indicador.subtitulo}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Ingresos por ventas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Importe acumulado de las ventas completadas.
            </p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            {formatoMoneda.format(resumen.ingresosTotales)}
          </p>
        </div>
        <Link
          href="/historial-ventas"
          className="mt-4 inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-900"
        >
          Consultar historial de ventas →
        </Link>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-800">Accesos del panel</h2>
          <p className="mt-1 text-sm text-slate-500">
            Accede directamente a los módulos disponibles.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accesos.map((acceso, indice) => {
            const contenido = (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600">
                    {String(indice + 1).padStart(2, "0")}
                  </div>
                  {acceso.href && (
                    <span className="text-lg text-slate-400">→</span>
                  )}
                </div>
                <h3 className="mt-4 font-semibold text-slate-800">
                  {acceso.titulo}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {acceso.descripcion}
                </p>
              </>
            );

            return acceso.href ? (
              <Link
                key={acceso.titulo}
                href={acceso.href}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
              >
                {contenido}
              </Link>
            ) : (
              <article
                key={acceso.titulo}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
              >
                {contenido}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

