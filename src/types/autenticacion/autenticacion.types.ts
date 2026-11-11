export interface DatosRegistro {
  nombre: string;
  telefono: string;
  email: string;
  password: string;
}

export interface DatosInicioSesion {
  email: string;
  password: string;
}

export interface DatosVerificacionEmail {
  email: string;
  token: string;
}

export interface ResultadoAutenticacion {
  exitoso: boolean;
  mensaje: string;
  error: string | null;
}

export interface ResultadoRegistro extends ResultadoAutenticacion {
  requiereVerificacion: boolean;
}

export interface ResultadoVerificacion extends ResultadoAutenticacion {
  verificado: boolean;
}
