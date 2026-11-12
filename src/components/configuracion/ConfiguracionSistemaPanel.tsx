"use client";

import { useEffect, useState } from "react";
import styles from "./ConfiguracionSistemaPanel.module.css";
import {
  guardarConfiguracion,
  obtenerConfiguracion,
} from "@/services/configuracion/configuracion.service";
import type {
  ConfiguracionSistema,
  DatosConfiguracion,
} from "@/types/configuracion/configuracion.types";

const valoresIniciales: DatosConfiguracion = {
  nombre_comercial: "",
  telefono_contacto: "",
  whatsapp: "",
  correo_contacto: "",
  direccion: "",
  horario_atencion: "",
  zona_horaria: "America/Santo_Domingo",
  moneda: "DOP",
  entregas_habilitadas: true,
  costo_entrega: 0,
  pedido_minimo: 0,
};

export function ConfiguracionSistemaPanel() {
  const [datos, setDatos] = useState<DatosConfiguracion>(valoresIniciales);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [actualizado, setActualizado] = useState("");

  useEffect(() => {
    let activo = true;

    obtenerConfiguracion()
      .then((configuracion: ConfiguracionSistema) => {
        if (!activo) return;

        setDatos({
          nombre_comercial: configuracion.nombre_comercial ?? "",
          telefono_contacto: configuracion.telefono_contacto ?? "",
          whatsapp: configuracion.whatsapp ?? "",
          correo_contacto: configuracion.correo_contacto ?? "",
          direccion: configuracion.direccion ?? "",
          horario_atencion: configuracion.horario_atencion ?? "",
          zona_horaria: configuracion.zona_horaria,
          moneda: configuracion.moneda,
          entregas_habilitadas: configuracion.entregas_habilitadas,
          costo_entrega: Number(configuracion.costo_entrega),
          pedido_minimo: Number(configuracion.pedido_minimo),
        });
        setActualizado(configuracion.actualizado_en);
      })
      .catch((e: unknown) => {
        if (activo) {
          setError(e instanceof Error ? e.message : "No fue posible cargar los datos.");
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  function cambiar<K extends keyof DatosConfiguracion>(
    campo: K,
    valor: DatosConfiguracion[K]
  ) {
    setDatos((actuales) => ({ ...actuales, [campo]: valor }));
    setError("");
    setExito("");
  }

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    setExito("");

    try {
      const resultado = await guardarConfiguracion(datos);

      setDatos({
        nombre_comercial: resultado.nombre_comercial ?? "",
        telefono_contacto: resultado.telefono_contacto ?? "",
        whatsapp: resultado.whatsapp ?? "",
        correo_contacto: resultado.correo_contacto ?? "",
        direccion: resultado.direccion ?? "",
        horario_atencion: resultado.horario_atencion ?? "",
        zona_horaria: resultado.zona_horaria,
        moneda: resultado.moneda,
        entregas_habilitadas: resultado.entregas_habilitadas,
        costo_entrega: Number(resultado.costo_entrega),
        pedido_minimo: Number(resultado.pedido_minimo),
      });
      setActualizado(resultado.actualizado_en);
      setExito("La configuración se guardó correctamente.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <div className={styles.estado}>Cargando configuración...</div>;
  }

  const campoTexto = (
    etiqueta: string,
    campo: keyof Pick<
      DatosConfiguracion,
      | "nombre_comercial"
      | "telefono_contacto"
      | "whatsapp"
      | "correo_contacto"
      | "direccion"
      | "horario_atencion"
      | "zona_horaria"
    >,
    tipo = "text"
  ) => (
    <label className={styles.campo} key={campo}>
      <span>{etiqueta}</span>
      <input
        type={tipo}
        value={datos[campo] ?? ""}
        onChange={(e) => cambiar(campo, e.target.value)}
        maxLength={500}
      />
    </label>
  );

  return (
    <section className={styles.contenedor}>
      <header className={styles.encabezado}>
        <div>
          <span className={styles.eyebrow}>ADMINISTRACIÓN DEL SISTEMA</span>
          <h1>Configuración</h1>
          <p>Administra la información comercial y las condiciones de operación.</p>
        </div>
      </header>

      {error && <div className={styles.error} role="alert">{error}</div>}
      {exito && <div className={styles.exito} role="status">{exito}</div>}

      <form onSubmit={guardar}>
        <div className={styles.seccion}>
          <h2>Información comercial</h2>
          <p>Datos que identifican a la embotelladora y sus canales de contacto.</p>
          <div className={styles.grid}>
            {campoTexto("Nombre comercial", "nombre_comercial")}
            {campoTexto("Teléfono de contacto", "telefono_contacto", "tel")}
            {campoTexto("WhatsApp", "whatsapp", "tel")}
            {campoTexto("Correo de contacto", "correo_contacto", "email")}
            {campoTexto("Dirección del establecimiento", "direccion")}
            {campoTexto("Horario de atención", "horario_atencion")}
          </div>
        </div>

        <div className={styles.seccion}>
          <h2>Preferencias regionales</h2>
          <p>Define cómo se presentan las fechas, horarios y valores monetarios.</p>
          <div className={styles.grid}>
            <label className={styles.campo}>
              <span>Zona horaria</span>
              <select
                value={datos.zona_horaria}
                onChange={(e) => cambiar("zona_horaria", e.target.value)}
              >
                <option value="America/Santo_Domingo">Santo Domingo</option>
                <option value="America/New_York">Nueva York</option>
                <option value="America/Puerto_Rico">Puerto Rico</option>
                <option value="UTC">UTC</option>
              </select>
            </label>

            <label className={styles.campo}>
              <span>Moneda</span>
              <select
                value={datos.moneda}
                onChange={(e) => cambiar("moneda", e.target.value)}
              >
                <option value="DOP">Peso dominicano (DOP)</option>
                <option value="USD">Dólar estadounidense (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </label>
          </div>
        </div>

        <div className={styles.seccion}>
          <h2>Condiciones de entrega</h2>
          <p>Establece las condiciones económicas de los pedidos de clientes.</p>

          <label className={styles.interruptor}>
            <input
              type="checkbox"
              checked={datos.entregas_habilitadas}
              onChange={(e) => cambiar("entregas_habilitadas", e.target.checked)}
            />
            <span>
              <strong>Entregas habilitadas</strong>
              <small>Permite que los clientes soliciten pedidos con entrega.</small>
            </span>
          </label>

          <div className={styles.grid}>
            <label className={styles.campo}>
              <span>Costo de entrega</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={datos.costo_entrega}
                onChange={(e) => cambiar("costo_entrega", Number(e.target.value))}
                required
              />
            </label>

            <label className={styles.campo}>
              <span>Pedido mínimo</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={datos.pedido_minimo}
                onChange={(e) => cambiar("pedido_minimo", Number(e.target.value))}
                required
              />
            </label>
          </div>
        </div>

        <footer className={styles.pie}>
          {actualizado && (
            <small>
              Última actualización: {new Date(actualizado).toLocaleString("es-DO")}
            </small>
          )}
          <button type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar configuración"}
          </button>
        </footer>
      </form>
    </section>
  );
}