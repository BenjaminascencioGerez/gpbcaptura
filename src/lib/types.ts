export type Previo = {
  id: string;
  reference: string;
  cliente: string;
  fecha: string;
  bultos_tarimas: number | null;
  bultos_cajas_madera: number | null;
  bultos_otros: number | null;
  bultos_otros_tipo: string | null;
  peso_bruto: number | null;
  status: "draft" | "sent";
  sent_to_facturacion_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type Partida = {
  id: string;
  previo_id: string;
  no_partida: number;
  fraccion_arancelaria: string | null;
  nico: string | null;
  cant_factura: number | null;
  um_comercial: string | null;
  descripcion_aa: string | null;
  marca: string | null;
  modelo: string | null;
  submodelo: string | null;
  numserie: string | null;
  pais_origen: string | null;
  observaciones: string | null;
  peso: number | null;
  precio_unitario: number | null;
  total: number | null;
  id_cat_no_art_no: string | null;
  aplica_ma: string | null;
  kilos_por_pieza: number | null;
  umt: string | null;
  photo_url: string | null;
  photo_token: string;
  photo_uploaded_at: string | null;
  sort_order: number;
  created_at: string;
  classification_status: "pendiente" | "clasificado";
  clasificado_by: string | null;
  clasificado_at: string | null;
  glosado: boolean;
  glosado_by: string | null;
  glosado_at: string | null;
  notas_glosa: string | null;
};

export type ClasificacionArancelaria = {
  id: string;
  cliente: string;
  fraccion_arancelaria: string;
  nico: string | null;
  descripcion: string;
  regulaciones: string | null;
  photo_url: string | null;
  created_by: string | null;
  created_at: string;
};

export type PartidaAttachment = {
  id: string;
  partida_id: string;
  file_url: string;
  file_type: "photo" | "document";
  uploaded_via: "public_link" | "office";
  uploaded_at: string;
};
