"use client";

import { useCallback, useEffect, useState } from "react";
import {
  abrirCajaPOS,
  cerrarCajaPOS,
  obtenerCajaAbiertaPOS,
  registrarMovimientoCajaPOS,
} from "@/services/caja/caja-pos.service";
import type { CajaAbiertaPOS } from "@/types/pos/pos.types";

function dinero(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(valor);
}

function fecha(valor: string) {
  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(valor));
}

export function GestionCaja() {
  const [caja, setCaja] = useState<CajaAbiertaPOS | null>(null);
  const [montoApertura, setMontoApertura] = useState("0");
  const [montoMovimiento, setMontoMovimiento] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState<"entrada" | "salida">("entrada");
  const [descripcion, setDescripcion] = useState("");
  const [montoCierre, setMontoCierre] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const cargarCaja = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const resultado = await obtenerCajaAbiertaPOS();
      setCaja(resultado);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible consultar tu caja.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarCaja();
  }, [cargarCaja]);

  async function ejecutar(operacion: () => Promise<unknown>, mensaje: string): Promise<boolean> {
    if (procesando) return false;
    setProcesando(true);
    setError("");
    setExito("");

    try {
      await operacion();
      setExito(mensaje);
      await cargarCaja();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible completar la operación.");
      return false;
    } finally {
      setProcesando(false);
    }
  }

  function validarMonto(valor: string) {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 && Math.round(numero * 100) === numero * 100;
  }

  async function abrir() {
    if (!validarMonto(montoApertura)) {
      setError("Introduce un monto de apertura válido con máximo dos decimales.");
      return;
    }
    await ejecutar(
      () => abrirCajaPOS(Number(montoApertura)),
      "La caja se abrió correctamente.",
    );
  }

  async function movimiento(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!caja) return;
    if (!validarMonto(montoMovimiento) || Number(montoMovimiento) <= 0) {
      setError("El movimiento debe ser mayor que cero y tener máximo dos decimales.");
      return;
    }
    if (descripcion.trim().length < 3) {
      setError("Describe el motivo del movimiento.");
      return;
    }
    const resultado = await ejecutar(
      () => registrarMovimientoCajaPOS(
        caja.id,
        tipoMovimiento,
        Number(montoMovimiento),
        descripcion.trim(),
      ),
      "El movimiento quedó registrado.",
    );

    if (!resultado) return;

    setMontoMovimiento("");
    setDescripcion("");
  }

  async function cerrar() {
    if (!caja) return;
    if (!montoCierre.trim() || !validarMonto(montoCierre)) {
      setError("Introduce el monto contado al cierre con máximo dos decimales.");
      return;
    }
    if (!window.confirm("¿Confirmas el cierre de tu caja? Esta operación no se puede deshacer.")) {
      return;
    }
    const resultado = await ejecutar(
      () => cerrarCajaPOS(caja.id, Number(montoCierre), observaciones.trim() || null),
      "La caja se cerró correctamente.",
    );

    if (!resultado) return;

    setMontoCierre("");
    setObservaciones("");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-[#102f50] via-[#15506b] to-[#087e91] px-6 py-8 text-white shadow-sm sm:px-9">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
          Operaciones de efectivo
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Mi caja</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
          Administra tu turno, registra entradas y salidas de efectivo y realiza el cierre.
        </p>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      {exito && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {exito}
        </div>
      )}

      {cargando ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Consultando tu caja...
        </div>
      ) : !caja ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Abrir turno de caja</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Registra el efectivo inicial disponible. Solo puedes mantener una caja abierta a la vez.
            </p>
          </div>
          <label className="block max-w-sm">
            <span className="mb-2 block text-sm font-medium text-slate-700">Monto inicial (DOP)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={montoApertura}
              onChange={(e) => setMontoApertura(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <button
            type="button"
            disabled={procesando}
            onClick={() => void abrir()}
            className="mt-5 rounded-xl bg-[#0c637b] px-6 py-3 text-sm font-semibold text-white hover:bg-[#084e63] disabled:opacity-50"
          >
            {procesando ? "Abriendo..." : "Abrir caja"}
          </button>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Estado del turno</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">Caja abierta</p>
              <p className="mt-2 text-sm text-slate-500">Apertura: {fecha(caja.abierta_en)}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Efectivo inicial</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{dinero(Number(caja.monto_apertura))}</p>
              <p className="mt-2 text-sm text-slate-500">Monto registrado al iniciar el turno</p>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Registrar movimiento</h2>
            <p className="mt-2 text-sm text-slate-500">
              Registra entradas o salidas extraordinarias. Los movimientos quedan en el historial inmutable.
            </p>
            <form onSubmit={movimiento} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Tipo</span>
                <select
                  value={tipoMovimiento}
                  onChange={(e) => setTipoMovimiento(e.target.value as "entrada" | "salida")}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                >
                  <option value="entrada">Entrada de efectivo</option>
                  <option value="salida">Salida de efectivo</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Monto (DOP)</span>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={montoMovimiento}
                  onChange={(e) => setMontoMovimiento(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Descripción / motivo</span>
                <input
                  required
                  minLength={3}
                  maxLength={300}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                  placeholder="Describe el motivo del movimiento"
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={procesando}
                  className="rounded-xl bg-[#0c637b] px-6 py-3 text-sm font-semibold text-white hover:bg-[#084e63] disabled:opacity-50"
                >
                  {procesando ? "Registrando..." : "Registrar movimiento"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Cerrar turno</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Cuenta el efectivo disponible e introduce el monto real. El sistema calculará la diferencia respecto al monto esperado.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Efectivo contado (DOP)</span>
                <input
                  required type="number"
                  min="0"
                  step="0.01"
                  value={montoCierre}
                  onChange={(e) => setMontoCierre(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Observaciones (opcional)</span>
                <input
                  maxLength={500}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                  placeholder="Notas del cierre"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={procesando}
              onClick={() => void cerrar()}
              className="mt-5 rounded-xl bg-rose-700 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
            >
              {procesando ? "Cerrando..." : "Cerrar caja"}
            </button>
          </section>
        </>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void cargarCaja()}
          disabled={cargando || procesando}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Actualizar estado
        </button>
      </div>
    </div>
  );
}