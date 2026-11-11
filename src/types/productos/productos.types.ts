export interface ProductoGestion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  unidad: string;
  precio: number;
  costo: number;
  tasa_impuesto: number;
  activo: boolean;
  imagen_path: string | null;
  imagen_url: string | null;
  existencia: number;
  existencia_minima: number;
  creado_en: string;
  actualizado_en: string;
}

export interface DatosProducto {
  codigo: string;
  nombre: string;
  descripcion: string;
  unidad: string;
  precio: number;
  costo: number;
  tasa_impuesto: number;
  existencia_inicial: number;
  existencia_minima: number;
}

export interface DatosEdicionProducto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  unidad: string;
  precio: number;
  costo: number;
  tasa_impuesto: number;
  existencia_minima: number;
}

export interface ResultadoGuardadoProducto {
  id: string;
  advertencia: string | null;
}
