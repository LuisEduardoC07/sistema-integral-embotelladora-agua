export type EstadoPedido =
  | "pendiente"
  | "confirmado"
  | "en_preparacion"
  | "en_camino"
  | "entregado"
  | "cancelado";

export interface ItemCarritoPedido {
  producto_id: string;
  cantidad: number;
}

export interface DetallePedidoCliente {
  id: string;
  pedido_id: string;
  producto_id: string;
  codigo_producto: string;
  nombre_producto: string;
  unidad: string;
  cantidad: number | string;
  precio_unitario: number | string;
  tasa_impuesto: number | string;
  subtotal: number | string;
  impuesto: number | string;
  total: number | string;
}

export interface PedidoCliente {
  id: string;
  numero: number;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string | null;
  direccion_entrega: string;
  fecha_entrega: string;
  hora_entrega: string;
  observaciones: string | null;
  subtotal: number | string;
  impuesto: number | string;
  total: number | string;
  estado: EstadoPedido;
  creado_en: string;
  detalles: DetallePedidoCliente[];
}
