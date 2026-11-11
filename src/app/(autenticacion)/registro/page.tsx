import Link from "next/link";
import FormularioRegistro from "@/components/registro/FormularioRegistro";

export default function RegistroPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-md space-y-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-950">
            Crear una cuenta
          </h1>

          <p className="text-sm leading-6 text-gray-600">
            Regístrate para consultar nuestros productos, solicitar cotizaciones
            y realizar tus pedidos.
          </p>
        </header>

        <FormularioRegistro />

        <p className="text-center text-sm text-gray-600">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/iniciar-sesion"
            className="font-semibold text-blue-700 hover:text-blue-800"
          >
            Inicia sesión
          </Link>
        </p>
      </section>
    </main>
  );
}
