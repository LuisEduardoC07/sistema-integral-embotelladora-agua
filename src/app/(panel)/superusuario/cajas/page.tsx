import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigirPermiso } from "@/lib/seguridad/autorizacion";


type Caja = {
  id: string;
  usuario_id: string;
  estado: string;
  monto_apertura: number;
  monto_cierre: number | null;
  monto_esperado: number | null;
  diferencia: number | null;
  observaciones: string | null;
  abierta_en: string;
  cerrada_en: string | null;
};

function dinero(valor: number | null) {
  if (valor === null) return "—";
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(Number(valor));
}

function fecha(valor: string | null) {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(valor));
}

export default async function PaginaCajas() {
  await connection();
  await exigirPermiso("caja.consultar_todas");
  const admin = createAdminClient();

  const { data: cajasData, error } = await admin
    .from("cajas")
    .select("id,usuario_id,estado,monto_apertura,monto_cierre,monto_esperado,diferencia,observaciones,abierta_en,cerrada_en")
    .order("abierta_en", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error("No fue posible consultar el historial de cajas.");
  }

  const cajas = (cajasData ?? []) as Caja[];
  const idsUsuarios = [...new Set(cajas.map((caja) => caja.usuario_id))];
  const idsCajas = cajas.map((caja) => caja.id);

  const [{ data: perfiles }, { data: movimientos }] = await Promise.all([
    idsUsuarios.length
      ? admin.from("profiles").select("id,nombre").in("id", idsUsuarios)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
    idsCajas.length
      ? admin.from("caja_movimientos")
          .select("id,caja_id,tipo,monto,descripcion,creado_en")
          .in("caja_id", idsCajas)
          .order("creado_en", { ascending: false })
      : Promise.resolve({ data: [] as {
          id: string; caja_id: string; tipo: string; monto: number;
          descripcion: string | null; creado_en: string;
        }[] }),
  ]);

  const nombres = new Map((perfiles ?? []).map((perfil) => [perfil.id, perfil.nombre]));
  const idsSinPerfil = idsUsuarios.filter((id) => !nombres.has(id));

  if (idsSinPerfil.length > 0) {
    const { data: identidadesArchivadas, error: errorIdentidades } = await admin
      .from("identidades_usuarios_eliminados")
      .select("usuario_id, nombre")
      .in("usuario_id", idsSinPerfil);

    if (errorIdentidades) {
      throw new Error("No fue posible consultar las identidades históricas de las cajas.");
    }

    for (const identidad of identidadesArchivadas ?? []) {
      nombres.set(identidad.usuario_id, identidad.nombre);
    }
  }
  const movimientosPorCaja = new Map<string, typeof movimientos>();
  for (const movimiento of movimientos ?? []) {
    const lista = movimientosPorCaja.get(movimiento.caja_id) ?? [];
    lista.push(movimiento);
    movimientosPorCaja.set(movimiento.caja_id, lista);
  }

  const abiertas = cajas.filter((caja) => caja.estado === "abierta").length;
  const cerradas = cajas.filter((caja) => caja.estado === "cerrada").length;

  return (
    <div className="space-y-7">
      <section className="rounded-3xl bg-gradient-to-br from-[#102f50] via-[#15506b] to-[#087e91] px-6 py-8 text-white shadow-sm sm:px-9">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
          Supervisión financiera
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Cajas</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
          Consulta los turnos de caja, sus cierres, diferencias y movimientos registrados.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { titulo: "Turnos consultados", valor: cajas.length },
          { titulo: "Cajas abiertas", valor: abiertas },
          { titulo: "Cajas cerradas", valor: cerradas },
        ].map((dato) => (
          <article key={dato.titulo} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">{dato.titulo}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{dato.valor}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Historial de turnos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Se muestran los últimos 100 turnos. Los registros históricos no se pueden editar ni eliminar.
            </p>
          </div>
          <a href="/superusuario/mi-caja" className="text-sm font-semibold text-cyan-800 hover:underline">
            Administrar mi propia caja
          </a>
        </div>

        {cajas.length === 0 ? (
          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Todavía no hay turnos de caja registrados.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {cajas.map((caja) => (
              <article key={caja.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {nombres.get(caja.usuario_id) ?? "Usuario no disponible"}
                      </h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        caja.estado === "abierta"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {caja.estado === "abierta" ? "Abierta" : "Cerrada"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Apertura: {fecha(caja.abierta_en)} · Cierre: {fecha(caja.cerrada_en)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm sm:min-w-[360px]">
                    <span className="text-slate-500">Monto inicial</span>
                    <strong className="text-right text-slate-800">{dinero(caja.monto_apertura)}</strong>
                    <span className="text-slate-500">Monto esperado</span>
                    <strong className="text-right text-slate-800">{dinero(caja.monto_esperado)}</strong>
                    <span className="text-slate-500">Monto contado</span>
                    <strong className="text-right text-slate-800">{dinero(caja.monto_cierre)}</strong>
                    <span className="text-slate-500">Diferencia</span>
                    <strong className={`text-right ${
                      Number(caja.diferencia ?? 0) === 0 ? "text-slate-800" : "text-rose-700"
                    }`}>{dinero(caja.diferencia)}</strong>
                  </div>
                </div>

                {caja.observaciones && (
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Observaciones: {caja.observaciones}
                  </p>
                )}

                <details className="mt-4 border-t border-slate-100 pt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-cyan-800">
                    Ver movimientos ({movimientosPorCaja.get(caja.id)?.length ?? 0})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {(movimientosPorCaja.get(caja.id) ?? []).length === 0 ? (
                      <p className="text-sm text-slate-500">No hay movimientos registrados.</p>
                    ) : (
                      (movimientosPorCaja.get(caja.id) ?? []).map((movimiento) => (
                        <div key={movimiento.id} className="flex flex-col justify-between gap-1 rounded-lg bg-slate-50 px-3 py-2 text-sm sm:flex-row">
                          <div>
                            <strong className="text-slate-800">{movimiento.tipo.replaceAll("_", " ")}</strong>
                            <p className="text-xs text-slate-500">{movimiento.descripcion || "Sin descripción"} · {fecha(movimiento.creado_en)}</p>
                          </div>
                          <strong className="text-slate-800">{dinero(Number(movimiento.monto))}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}