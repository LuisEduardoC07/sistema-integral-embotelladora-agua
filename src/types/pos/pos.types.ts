export type MetodoPagoPOS =
  | "efectivo"
  | "tarjeta"
  | "transferencia"
  | "otro";

export interface ProductoPOS {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  unidad: string;
  precio: number;
  tasa_impuesto: number;
  existencia: number;
  existencia_minima: number;
  imagen_url: string | null;
}

export interface CajaAbiertaPOS {
  id: string;
  estado: string;
  monto_apertura: number;
  abierta_en: string;
}

export interface ResultadoCajaAbiertaPOS {
  caja: CajaAbiertaPOS | null;
}

export interface ItemVentaPOS {
  producto_id: string;
  cantidad: number;
}

export interface PagoVentaPOS {
  metodo: MetodoPagoPOS;
  monto: number;
  monto_recibido: number;
  referencia?: string | null;
}

export interface ResultadoVentaPOS {
  venta_id: string;
  numero: number;
  subtotal: number;
  impuesto: number;
  total: number;
  estado: string;
  cambio_devuelto?: number;
}

export interface ResultadoOperacionPOS {
  caja_id?: string;
  monto_esperado?: number;
  monto_cierre?: number;
  diferencia?: number;
  estado?: string;
}
