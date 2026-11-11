type AccesoRapido = {
  titulo: string;
  descripcion: string;
};

export function PanelDashboard({
  titulo,
  descripcion,
  nombre,
  accesos,
}: {
  titulo: string;
  descripcion: string;
  nombre: string;
  accesos: AccesoRapido[];
}) {
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
            Indicadores del sistema. Los datos se conectarán a los módulos operativos.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { titulo: "Pedidos", subtitulo: "Actividad de pedidos", simbolo: "P" },
            { titulo: "Productos", subtitulo: "Catálogo de productos", simbolo: "PR" },
            { titulo: "Ventas", subtitulo: "Actividad comercial", simbolo: "V" },
            { titulo: "Inventario", subtitulo: "Control de existencias", simbolo: "I" },
          ].map((indicador) => (
            <article
              key={indicador.titulo}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  {indicador.titulo}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-sm font-bold text-cyan-700">
                  {indicador.simbolo}
                </span>
              </div>
              <p className="mt-5 text-2xl font-bold text-slate-300">—</p>
              <p className="mt-1 text-xs text-slate-400">{indicador.subtitulo}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-800">Accesos del panel</h2>
          <p className="mt-1 text-sm text-slate-500">
            Módulos previstos para este perfil.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accesos.map((acceso, indice) => (
            <article
              key={acceso.titulo}
              className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600 transition group-hover:bg-cyan-50 group-hover:text-cyan-700">
                  {String(indice + 1).padStart(2, "0")}
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Próximamente
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-slate-800">{acceso.titulo}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {acceso.descripcion}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
