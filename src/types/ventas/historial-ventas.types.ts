import type { MetodoPagoPOS } from "@/types/pos/pos.types";

export type EstadoVentaHistorial = "completada" | "anulada";

export interface FiltrosHistorialVentas {
  fechaDesde?: string;
  fechaHasta?: string;
  cajeroId?: string;
  metodoPago?: MetodoPagoPOS | "";
  estado?: EstadoVentaHistorial | "";
  busqueda?: string;
  limite?: number;
  cursorFecha?: string;
  cursorId?: string;
}

export interface CajeroHistorialOption {
  id: string;
  nombre: string;
  eliminado: boolean;
}

export interface DetalleVentaHistorial {
  id: string;
  producto_id: string;
  codigo_producto: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  tasa_impuesto: number;
  subtotal: number;
  impuesto: number;
  total: number;
}

export interface PagoVentaHistorial {
  id: string;
  metodo: MetodoPagoPOS;
  monto: number;
  monto_recibido: number;
  referencia: string | null;
  creado_en: string;
}

export interface VentaHistorial {
  id: string;
  numero: number;
  caja_id: string;
  usuario_id: string;
  cajero_nombre: string;
  cliente_nombre: string | null;
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  estado: EstadoVentaHistorial;
  observaciones: string | null;
  creado_en: string;
  anulada_por: string | null;
  anulada_por_nombre: string | null;
  anulada_en: string | null;
  motivo_anulacion: string | null;
  cambio_devuelto: number;
  detalles: DetalleVentaHistorial[];
  pagos: PagoVentaHistorial[];
}

export interface CursorHistorialVentas {
  creado_en: string;
  id: string;
}

export interface EstadisticasHistorialVentas {
  cantidad_ventas: number;
  cantidad_anuladas: number;
  total_ventas: number;
  total_anulado: number;
  ticket_promedio: number;
  productos_vendidos: number;
  metodos_pago: {
    metodo: MetodoPagoPOS;
    cantidad: number;
    total: number;
  }[];
  ventas_por_dia: {
    fecha: string;
    cantidad: number;
    total: number;
  }[];
  productos_mas_vendidos: {
    producto_id: string;
    nombre: string;
    cantidad: number;
    total: number;
  }[];
  ventas_por_cajero: {
    usuario_id: string;
    nombre: string;
    cantidad: number;
    total: number;
  }[];
}

export interface RespuestaHistorialVentas {
  ventas: VentaHistorial[];
  hay_mas: boolean;
  siguiente_cursor: CursorHistorialVentas | null;
  estadisticas: EstadisticasHistorialVentas;
}

export interface ResultadoHistorialVentas {
  datos: RespuestaHistorialVentas | null;
  error: string | null;
}
