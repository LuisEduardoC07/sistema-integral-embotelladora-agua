export interface ConfiguracionSistema {
  id: string;
  clave: number;
  nombre_comercial: string | null;
  telefono_contacto: string | null;
  whatsapp: string | null;
  correo_contacto: string | null;
  direccion: string | null;
  horario_atencion: string | null;
  zona_horaria: string;
  moneda: string;
  entregas_habilitadas: boolean;
  costo_entrega: number;
  pedido_minimo: number;
  actualizado_por: string | null;
  actualizado_en: string;
}

export type DatosConfiguracion = Pick<
  ConfiguracionSistema,
  | "nombre_comercial"
  | "telefono_contacto"
  | "whatsapp"
  | "correo_contacto"
  | "direccion"
  | "horario_atencion"
  | "zona_horaria"
  | "moneda"
  | "entregas_habilitadas"
  | "costo_entrega"
  | "pedido_minimo"
>;