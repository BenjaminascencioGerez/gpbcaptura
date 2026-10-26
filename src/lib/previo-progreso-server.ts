import type { SupabaseClient } from "@supabase/supabase-js";
import type { Partida, Previo } from "./types";
import { calcularProgreso } from "./previo-progreso";

type PartidaProgreso = Pick<Partida, "id" | "previo_id" | "photo_url" | "classification_status">;

// Avance y etapa de varios previos con dos consultas (partidas + adjuntos).
export async function cargarProgreso(supabase: SupabaseClient, previos: Pick<Previo, "id" | "status">[]) {
  const previoIds = previos.map((p) => p.id);

  const { data: partidasData } = previoIds.length
    ? await supabase
        .from("partidas")
        .select("id, previo_id, photo_url, classification_status")
        .in("previo_id", previoIds)
        .returns<PartidaProgreso[]>()
    : { data: [] as PartidaProgreso[] };

  const partidas = partidasData ?? [];
  const { data: adjuntosData } = partidas.length
    ? await supabase
        .from("partida_attachments")
        .select("partida_id")
        .in("partida_id", partidas.map((p) => p.id))
        .returns<{ partida_id: string }[]>()
    : { data: [] as { partida_id: string }[] };

  const conAdjunto = new Set((adjuntosData ?? []).map((a) => a.partida_id));
  const partidasPorPrevio = new Map<string, PartidaProgreso[]>();
  for (const p of partidas) {
    const list = partidasPorPrevio.get(p.previo_id) ?? [];
    list.push(p);
    partidasPorPrevio.set(p.previo_id, list);
  }

  return new Map(
    previos.map((p) => [p.id, calcularProgreso(p, partidasPorPrevio.get(p.id) ?? [], conAdjunto)])
  );
}
