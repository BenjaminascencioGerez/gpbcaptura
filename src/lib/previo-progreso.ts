import type { Partida, Previo } from "./types";

export type Etapa =
  | "revision_fisica"
  | "clasificacion"
  | "glosa"
  | "documentacion"
  | "glosa_final"
  | "glosado"
  | "enviado_facturacion";

// "glosa" se muestra como Confirmación de fracciones.
export const ETAPA_LABELS: Record<Etapa, string> = {
  revision_fisica: "Revisión física",
  clasificacion: "Clasificación",
  glosa: "Confirmación de fracciones",
  documentacion: "Documentación",
  glosa_final: "Glosa",
  glosado: "Glosado (listo para facturar)",
  enviado_facturacion: "Enviado a facturación",
};

export const ESTADO_LABELS: Record<Previo["estado"], string> = {
  en_bodega: "En bodega",
  importado: "Importado",
};

type PartidaProgreso = Pick<Partida, "id" | "photo_url" | "classification_status" | "revision_estado">;

// Una partida cuenta como capturada por el revisor cuando ya tiene al menos
// una foto o documento (link público o subida en oficina).
export function calcularProgreso(
  previo: Pick<
    Previo,
    | "status"
    | "enviado_clasificacion_at"
    | "enviado_glosa_at"
    | "enviado_documentacion_at"
    | "enviado_glosa_final_at"
    | "glosado_final_at"
    | "etapa_manual"
  >,
  partidas: PartidaProgreso[],
  partidasConAdjunto: Set<string>
): {
  avance: number;
  capturadas: number;
  total: number;
  etapa: Etapa;
  devueltas: number;
  infoSolicitada: number;
} {
  const total = partidas.length;
  const capturadas = partidas.filter((p) => p.photo_url || partidasConAdjunto.has(p.id)).length;
  const avance = total > 0 ? Math.round((capturadas / total) * 100) : 0;

  // Si el previo se envió a clasificación o a glosa, esa es su etapa; si no
  // (previos anteriores a la asignación), se deduce de sus partidas.
  let etapa: Etapa;
  if (previo.status === "sent") etapa = "enviado_facturacion";
  else if (previo.etapa_manual) etapa = previo.etapa_manual;
  else if (previo.glosado_final_at) etapa = "glosado";
  else if (previo.enviado_glosa_final_at) etapa = "glosa_final";
  else if (previo.enviado_documentacion_at) etapa = "documentacion";
  else if (previo.enviado_glosa_at) etapa = "glosa";
  else if (previo.enviado_clasificacion_at) etapa = "clasificacion";
  else if (total === 0 || capturadas < total) etapa = "revision_fisica";
  else if (partidas.some((p) => p.classification_status === "pendiente")) etapa = "clasificacion";
  else etapa = "glosa";

  const devueltas = partidas.filter((p) => p.revision_estado === "devuelta").length;
  const infoSolicitada = partidas.filter((p) => p.revision_estado === "info_solicitada").length;
  return { avance, capturadas, total, etapa, devueltas, infoSolicitada };
}

export function totalBultos(p: Pick<Previo, "bultos_tarimas" | "bultos_cajas_madera" | "bultos_otros" | "bultos_inventario">) {
  const sum = (p.bultos_tarimas ?? 0) + (p.bultos_cajas_madera ?? 0) + (p.bultos_otros ?? 0);
  if (sum > 0) return String(sum);
  return p.bultos_inventario ?? "—";
}
