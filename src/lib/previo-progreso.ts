import type { Partida, Previo } from "./types";

export type Etapa = "revision_fisica" | "clasificacion" | "glosa" | "enviado_facturacion";

export const ETAPA_LABELS: Record<Etapa, string> = {
  revision_fisica: "Revisión física",
  clasificacion: "Clasificación",
  glosa: "Glosa",
  enviado_facturacion: "Enviado a facturación",
};

export const ESTADO_LABELS: Record<Previo["estado"], string> = {
  en_bodega: "En bodega",
  importado: "Importado",
};

type PartidaProgreso = Pick<Partida, "id" | "photo_url" | "classification_status">;

// Una partida cuenta como capturada por el revisor cuando ya tiene al menos
// una foto o documento (link público o subida en oficina).
export function calcularProgreso(
  previo: Pick<Previo, "status">,
  partidas: PartidaProgreso[],
  partidasConAdjunto: Set<string>
): { avance: number; capturadas: number; total: number; etapa: Etapa } {
  const total = partidas.length;
  const capturadas = partidas.filter((p) => p.photo_url || partidasConAdjunto.has(p.id)).length;
  const avance = total > 0 ? Math.round((capturadas / total) * 100) : 0;

  let etapa: Etapa;
  if (previo.status === "sent") etapa = "enviado_facturacion";
  else if (total === 0 || capturadas < total) etapa = "revision_fisica";
  else if (partidas.some((p) => p.classification_status === "pendiente")) etapa = "clasificacion";
  else etapa = "glosa";

  return { avance, capturadas, total, etapa };
}

export function totalBultos(p: Pick<Previo, "bultos_tarimas" | "bultos_cajas_madera" | "bultos_otros" | "bultos_inventario">) {
  const sum = (p.bultos_tarimas ?? 0) + (p.bultos_cajas_madera ?? 0) + (p.bultos_otros ?? 0);
  if (sum > 0) return String(sum);
  return p.bultos_inventario ?? "—";
}
