"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import styles from "./PerfilCliente.module.css";

interface Props {
  usuarioId: string;
  nombreInicial: string;
  telefonoInicial: string;
  correo: string;
  avatarInicial: string | null;
  avatarPathInicial: string | null;
}

const TAMANO_MAXIMO = 2 * 1024 * 1024;

const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export default function PerfilCliente({
  usuarioId,
  nombreInicial,
  telefonoInicial,
  correo,
  avatarInicial,
  avatarPathInicial,
}: Props) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [telefono, setTelefono] = useState(telefonoInicial);
  const [avatarUrl, setAvatarUrl] = useState(avatarInicial);
  const [avatarPath, setAvatarPath] = useState(avatarPathInicial);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const inputFoto = useRef<HTMLInputElement>(null);

  const iniciales = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");

  function seleccionarFoto(file: File | undefined) {
    setError("");
    setMensaje("");

    if (!file) return;

    if (!Object.prototype.hasOwnProperty.call(EXTENSIONES, file.type)) {
      setError("Selecciona una imagen JPG, PNG o WEBP.");
      return;
    }

    if (file.size > TAMANO_MAXIMO) {
      setError("La fotografía no puede superar los 2 MB.");
      return;
    }

    setArchivo(file);
    setQuitarFoto(false);
  }

  function eliminarFoto() {
    setArchivo(null);
    setQuitarFoto(true);
    setAvatarUrl(null);
    setError("");
    setMensaje("");

    if (inputFoto.current) {
      inputFoto.current.value = "";
    }
  }

  async function guardarCambios() {
    setError("");
    setMensaje("");

    if (nombre.trim().length < 2 || nombre.trim().length > 100) {
      setError("El nombre debe tener entre 2 y 100 caracteres.");
      return;
    }

    if (telefono.trim().length > 25) {
      setError("El teléfono no puede superar los 25 caracteres.");
      return;
    }

    setGuardando(true);

    const supabase = createClient();

    let nuevaRuta: string | null = null;

    try {
      if (archivo) {
        const extension = EXTENSIONES[archivo.type];

        nuevaRuta =
          `${usuarioId}/${crypto.randomUUID()}.${extension}`;

        const { error: errorSubida } = await supabase.storage
          .from("avatars")
          .upload(nuevaRuta, archivo, {
            contentType: archivo.type,
            cacheControl: "3600",
            upsert: false,
          });

        if (errorSubida) {
          throw new Error(
            "No fue posible subir la fotografía. Inténtalo nuevamente."
          );
        }
      }

      const datos: {
        nombre: string;
        telefono: string;
        avatar_path?: string | null;
      } = {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
      };

      if (nuevaRuta) {
        datos.avatar_path = nuevaRuta;
      } else if (quitarFoto) {
        datos.avatar_path = null;
      }

      const respuesta = await fetch("/api/cliente/perfil", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error || "No fue posible guardar los cambios."
        );
      }

      const rutaAnterior = (quitarFoto || nuevaRuta) ? avatarPath : null;

      if (nuevaRuta) {
        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(nuevaRuta);

        setAvatarUrl(data.publicUrl);
        setAvatarPath(nuevaRuta);
      } else if (quitarFoto) {
        setAvatarUrl(null);
        setAvatarPath(null);
      }

      if (rutaAnterior && rutaAnterior !== nuevaRuta) {
        await supabase.storage
          .from("avatars")
          .remove([rutaAnterior]);
      }

      setArchivo(null);
      setQuitarFoto(false);
      setMensaje("Tu perfil se actualizó correctamente.");
    } catch (errorGuardado) {
      if (nuevaRuta) {
        await supabase.storage
          .from("avatars")
          .remove([nuevaRuta]);
      }

      setError(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "Ocurrió un error al guardar tu perfil."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className={styles.contenedor}>
      <header className={styles.encabezado}>
        <div>
          <span className={styles.etiqueta}>MI CUENTA</span>
          <h1>Mi perfil</h1>
          <p>
            Administra tu información personal y tu fotografía de perfil.
          </p>
        </div>
      </header>

      <section className={styles.tarjeta}>
        <div className={styles.tituloSeccion}>
          <div>
            <h2>Fotografía de perfil</h2>
            <p>Personaliza tu cuenta con una imagen.</p>
          </div>
        </div>

        <div className={styles.fotografia}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Fotografía de perfil" />
          ) : (
            <div className={styles.iniciales}>
              {iniciales || "C"}
            </div>
          )}

          <div className={styles.accionesFoto}>
            <strong>{nombre || "Cliente"}</strong>
            <span>JPG, PNG o WEBP. Máximo 2 MB.</span>

            <div className={styles.botonesFoto}>
              <button
                type="button"
                onClick={() => inputFoto.current?.click()}
                disabled={guardando}
              >
                Seleccionar fotografía
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  className={styles.botonEliminar}
                  onClick={eliminarFoto}
                  disabled={guardando}
                >
                  Quitar fotografía
                </button>
              )}
            </div>

            {archivo && (
              <small className={styles.archivoSeleccionado}>
                Nueva imagen: {archivo.name}
              </small>
            )}
          </div>

          <input
            ref={inputFoto}
            className={styles.inputArchivo}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(evento) =>
              seleccionarFoto(evento.target.files?.[0])
            }
            disabled={guardando}
          />
        </div>
      </section>

      <section className={styles.tarjeta}>
        <div className={styles.tituloSeccion}>
          <div>
            <h2>Información personal</h2>
            <p>Actualiza los datos asociados a tu cuenta.</p>
          </div>
        </div>

        <div className={styles.formulario}>
          <label className={styles.campo}>
            Nombre completo
            <input
              type="text"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              maxLength={100}
              autoComplete="name"
              disabled={guardando}
            />
          </label>

          <label className={styles.campo}>
            Correo electrónico
            <input
              type="email"
              value={correo}
              disabled
              readOnly
            />
            <small>
              Este es el correo de acceso a tu cuenta. Para cambiarlo
              se requiere una confirmación de seguridad.
            </small>
          </label>

          <label className={styles.campo}>
            Teléfono / celular
            <input
              type="tel"
              value={telefono}
              onChange={(evento) => setTelefono(evento.target.value)}
              maxLength={25}
              autoComplete="tel"
              placeholder="Ej. 829 000 0000"
              disabled={guardando}
            />
          </label>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {mensaje && (
          <div className={styles.exito} role="status">
            {mensaje}
          </div>
        )}

        <div className={styles.pieFormulario}>
          <button
            type="button"
            onClick={guardarCambios}
            disabled={guardando}
          >
            {guardando ? "Guardando cambios..." : "Guardar cambios"}
          </button>
        </div>
      </section>

      <p className={styles.nota}>
        Tus datos personales solo pueden ser modificados desde tu propia
        cuenta. Los cambios no modifican tu rol ni tus permisos dentro
        del sistema.
      </p>
    </main>
  );
}
