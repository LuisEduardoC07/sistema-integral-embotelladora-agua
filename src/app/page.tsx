import Link from "next/link";

const enlaces = [
  { label: "Inicio", href: "/" },
  { label: "Productos", href: "/#productos" },
  { label: "Nosotros", href: "/#nosotros" },
];

export default function PaginaPrincipal() {
  return (
    <main className="min-h-screen bg-white text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500 text-white">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13Z" />
              </svg>
            </span>
            <span>
              <span className="block text-xl font-bold tracking-tight text-slate-900">AquaControl</span>
              <span className="block text-[9px] font-semibold tracking-[0.19em] text-slate-400">SISTEMA INTEGRAL</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {enlaces.map((enlace) => (
              <Link
                key={enlace.label}
                href={enlace.href}
                className="text-sm font-medium text-slate-600 transition hover:text-cyan-600"
              >
                {enlace.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/iniciar-sesion"
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:px-4"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700"
            >
              Crear cuenta
            </Link>
          </div>
        </div>

        <nav className="flex justify-center gap-7 border-t border-slate-100 px-4 py-3 md:hidden">
          {enlaces.map((enlace) => (
            <Link key={enlace.label} href={enlace.href} className="text-xs font-medium text-slate-600">
              {enlace.label}
            </Link>
          ))}
        </nav>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#102e43] via-[#14536b] to-[#087e91]">
        <div className="mx-auto grid min-h-[530px] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:px-8">
          <div className="relative z-10">
            <span className="inline-flex rounded-full border border-cyan-200/25 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-cyan-100">
              AGUA DE CALIDAD PARA TU HOGAR Y NEGOCIO
            </span>
            <h1 className="mt-7 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Agua de calidad, directamente hasta tu puerta.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-200">
              Explora nuestros productos, solicita tus pedidos y organiza tus entregas de forma sencilla y conveniente.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/registro"
                className="rounded-xl bg-cyan-400 px-6 py-3.5 text-sm font-bold text-[#102e43] shadow-lg transition hover:bg-cyan-300"
              >
                Crear una cuenta
              </Link>
              <Link
                href="/iniciar-sesion"
                className="rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Acceder a mi cuenta
              </Link>
            </div>
          </div>

          <div className="relative hidden min-h-[360px] items-center justify-center lg:flex">
            <div className="absolute h-[340px] w-[340px] rounded-full border border-white/10" />
            <div className="absolute h-[270px] w-[270px] rounded-full border border-white/10" />
            <div className="relative flex h-56 w-56 items-center justify-center rounded-[48px] border border-white/20 bg-white/10 shadow-2xl backdrop-blur">
              <svg viewBox="0 0 24 24" width="125" height="125" fill="none" stroke="white" strokeWidth="0.8">
                <path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13Z" />
                <path d="M8 15a4 4 0 0 0 4 4" />
              </svg>
            </div>
            <div className="absolute bottom-5 right-0 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-white shadow-xl backdrop-blur">
              <p className="text-sm font-semibold">AquaControl</p>
              <p className="mt-1 text-xs text-cyan-100">Calidad y comodidad</p>
            </div>
          </div>
        </div>
      </section>

      <section id="productos" className="scroll-mt-28 bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold tracking-[0.2em] text-cyan-700">NUESTROS SERVICIOS</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Todo lo que necesitas en un solo lugar</h2>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              Accede a nuestra tienda y gestiona tus solicitudes desde tu cuenta.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { numero: "01", titulo: "Catálogo de productos", texto: "Consulta los productos disponibles y conoce sus opciones." },
              { numero: "02", titulo: "Pedidos y entregas", texto: "Solicita tus productos e indica dónde y cuándo deseas recibirlos." },
              { numero: "03", titulo: "Tu cuenta", texto: "Consulta tus solicitudes y mantén actualizados tus datos de contacto." },
            ].map((item) => (
              <article key={item.numero} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-sm font-bold text-cyan-700">
                  {item.numero}
                </span>
                <h3 className="mt-6 text-lg font-bold text-slate-900">{item.titulo}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">{item.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="nosotros" className="scroll-mt-28 px-6 py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-3xl bg-[#142b3b] p-8 text-white sm:p-12 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.2em] text-cyan-300">AQUACONTROL</p>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Una experiencia sencilla para gestionar tus pedidos.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Crea tu cuenta para acceder a la tienda y solicitar tus entregas.
            </p>
          </div>
          <Link href="/registro" className="shrink-0 rounded-xl bg-cyan-400 px-6 py-3.5 text-sm font-bold text-[#142b3b] transition hover:bg-cyan-300">
            Comenzar ahora
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-7">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <p className="text-sm font-bold text-slate-700">AquaControl</p>
          <p className="text-xs text-slate-400">© 2026 AquaControl. Todos los derechos reservados.</p>
        </div>
      </footer>
    </main>
  );
}
