import Link from "next/link";
import FormularioInicioSesion from "@/components/iniciar-sesion/FormularioInicioSesion";

export default function InicioSesionPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-md space-y-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-950">
            Iniciar sesión
          </h1>

          <p className="text-sm leading-6 text-gray-600">
            Accede a tu cuenta para continuar utilizando nuestros servicios.
          </p>
        </header>

        <FormularioInicioSesion />

        <p className="text-center text-sm text-gray-600">
          <Link
            href="/"
            className="font-medium text-blue-700 hover:text-blue-800"
          >
            Volver al inicio
          </Link>
        </p>
      </section>
    </main>
  );
}
