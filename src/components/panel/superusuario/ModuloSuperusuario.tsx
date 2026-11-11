export function ModuloSuperusuario({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="space-y-7">
      <section className="rounded-2xl bg-gradient-to-r from-[#15364a] to-[#176b83] px-7 py-9 text-white shadow-sm sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
          Administración del sistema
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{titulo}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
          {descripcion}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
            <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5 M12 8h.01" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Estructura del módulo preparada</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Esta sección ya está integrada en el panel de superusuario.
              Sus operaciones y datos se incorporarán durante el desarrollo
              de este módulo.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
