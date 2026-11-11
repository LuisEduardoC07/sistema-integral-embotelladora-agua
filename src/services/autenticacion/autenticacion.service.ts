import { createClient } from "@/lib/supabase/browser";
import type {
  DatosInicioSesion,
  DatosRegistro,
  DatosVerificacionEmail,
  ResultadoAutenticacion,
  ResultadoRegistro,
  ResultadoVerificacion,
} from "@/types/autenticacion/autenticacion.types";

export async function registrarUsuario(
  datos: DatosRegistro,
): Promise<ResultadoRegistro> {
  const nombre = datos.nombre.trim();
  const telefono = datos.telefono.trim();
  const email = datos.email.trim().toLowerCase();

  if (!nombre || !email || !datos.password) {
    return {
      exitoso: false,
      mensaje: "Completa los campos obligatorios.",
      error: "Faltan datos obligatorios.",
      requiereVerificacion: false,
    };
  }

  try {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password: datos.password,
      options: {
        data: {
          nombre,
          telefono: telefono || null,
        },
      },
    });

    if (error) {
      return {
        exitoso: false,
        mensaje: "No se pudo completar el registro.",
        error: error.message,
        requiereVerificacion: false,
      };
    }

    if (!data.user) {
      return {
        exitoso: false,
        mensaje: "No se pudo crear la cuenta.",
        error: "Supabase no devolvió un usuario.",
        requiereVerificacion: false,
      };
    }

    return {
      exitoso: true,
      mensaje: data.session
        ? "Tu cuenta fue creada correctamente."
        : "Te enviamos un código de verificación a tu correo.",
      error: null,
      requiereVerificacion: !data.session,
    };
  } catch {
    return {
      exitoso: false,
      mensaje: "Ocurrió un error al intentar registrarte.",
      error: "No fue posible conectar con el servicio de autenticación.",
      requiereVerificacion: false,
    };
  }
}

export async function iniciarSesion(
  datos: DatosInicioSesion,
): Promise<ResultadoAutenticacion> {
  const email = datos.email.trim().toLowerCase();

  if (!email || !datos.password) {
    return {
      exitoso: false,
      mensaje: "Introduce tu correo y contraseña.",
      error: "Faltan credenciales.",
    };
  }

  try {
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: datos.password,
    });

    if (error) {
      return {
        exitoso: false,
        mensaje:
          "No se pudo iniciar sesión. Verifica tus credenciales y la confirmación del correo.",
        error: error.message,
      };
    }

    return {
      exitoso: true,
      mensaje: "Sesión iniciada correctamente.",
      error: null,
    };
  } catch {
    return {
      exitoso: false,
      mensaje: "Ocurrió un error al iniciar sesión.",
      error: "No fue posible conectar con el servicio de autenticación.",
    };
  }
}

export async function verificarCorreo(
  datos: DatosVerificacionEmail,
): Promise<ResultadoVerificacion> {
  const email = datos.email.trim().toLowerCase();
  const token = datos.token.trim();

  if (!email || !token) {
    return {
      exitoso: false,
      mensaje: "Introduce tu correo y el código de verificación.",
      error: "Faltan datos de verificación.",
      verificado: false,
    };
  }

  try {
    const supabase = createClient();

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (error) {
      return {
        exitoso: false,
        mensaje:
          "No se pudo verificar el correo. Comprueba el código e inténtalo nuevamente.",
        error: error.message,
        verificado: false,
      };
    }

    return {
      exitoso: true,
      mensaje: "Correo verificado correctamente.",
      error: null,
      verificado: true,
    };
  } catch {
    return {
      exitoso: false,
      mensaje: "Ocurrió un error al verificar el correo.",
      error: "No fue posible conectar con el servicio de autenticación.",
      verificado: false,
    };
  }
}

export async function cerrarSesion(): Promise<ResultadoAutenticacion> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        exitoso: false,
        mensaje: "No se pudo cerrar la sesión.",
        error: error.message,
      };
    }

    return {
      exitoso: true,
      mensaje: "Sesión cerrada correctamente.",
      error: null,
    };
  } catch {
    return {
      exitoso: false,
      mensaje: "Ocurrió un error al cerrar la sesión.",
      error: "No fue posible conectar con el servicio de autenticación.",
    };
  }
}
