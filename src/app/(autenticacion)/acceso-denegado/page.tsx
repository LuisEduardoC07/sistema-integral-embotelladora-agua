import Link from "next/link";

export default function AccesoDenegadoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">
          Acceso no autorizado
        </h1>

        <p className="mt-4 text-gray-600">
          Tu cuenta no está habilitada para acceder a esta sección o no tienes
          los permisos necesarios.
        </p>

        <p className="mt-2 text-sm text-gray-500">
          Si consideras que se trata de un error, comunícate con el administrador
          del sistema.
        </p>

        <Link
          href="/iniciar-sesion"
          className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
        >
          Volver al inicio de sesión
        </Link>
      </section>
    </main>
  );
}
