"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type PartidaInput = {
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
};

function fromFormData(previoId: string, formData: FormData, sortOrder: number): PartidaInput {
  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const num = (k: string) => {
    const v = formData.get(k);
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    previo_id: previoId,
    no_partida: Number(formData.get("no_partida")) || sortOrder + 1,
    fraccion_arancelaria: str("fraccion_arancelaria"),
    nico: str("nico"),
    cant_factura: num("cant_factura"),
    um_comercial: str("um_comercial"),
    descripcion_aa: str("descripcion_aa"),
    marca: str("marca"),
    modelo: str("modelo"),
    submodelo: str("submodelo"),
    numserie: str("numserie"),
    pais_origen: str("pais_origen"),
    observaciones: str("observaciones"),
    peso: num("peso"),
    precio_unitario: num("precio_unitario"),
    total: num("total"),
    id_cat_no_art_no: str("id_cat_no_art_no"),
    aplica_ma: str("aplica_ma"),
  };
}

export async function addPartida(previoId: string, _prevState: { error: string } | null, formData: FormData) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("partidas")
    .select("id", { count: "exact", head: true })
    .eq("previo_id", previoId);

  const { error } = await supabase
    .from("partidas")
    .insert({ ...fromFormData(previoId, formData, count ?? 0), sort_order: count ?? 0 });

  if (error) return { error: error.message };
  revalidatePath(`/previos/${previoId}`);
  return { error: "" };
}

export async function updatePartida(
  previoId: string,
  partidaId: string,
  _prevState: { error: string } | null,
  formData: FormData
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("partidas")
    .update(fromFormData(previoId, formData, 0))
    .eq("id", partidaId);

  if (error) return { error: error.message };
  revalidatePath(`/previos/${previoId}`);
  return { error: "" };
}

export async function deletePartida(previoId: string, partidaId: string) {
  const supabase = await createClient();
  await supabase.from("partidas").delete().eq("id", partidaId);
  revalidatePath(`/previos/${previoId}`);
}

export async function updatePrevioHeader(previoId: string, formData: FormData) {
  const supabase = await createClient();
  const num = (k: string) => {
    const v = formData.get(k);
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  await supabase
    .from("previos")
    .update({
      reference: String(formData.get("reference") ?? "").trim(),
      cliente: String(formData.get("cliente") ?? "").trim() || null,
      fecha: String(formData.get("fecha") ?? "") || undefined,
      peso_bruto: num("peso_bruto"),
      bultos_tarimas: num("bultos_tarimas"),
      bultos_cajas_madera: num("bultos_cajas_madera"),
      bultos_otros: num("bultos_otros"),
      bultos_otros_tipo: String(formData.get("bultos_otros_tipo") ?? "").trim() || null,
    })
    .eq("id", previoId);

  revalidatePath(`/previos/${previoId}`);
}

export async function sendToFacturacion(previoId: string) {
  const supabase = await createClient();
  const { data: previo, error } = await supabase
    .from("previos")
    .select("*")
    .eq("id", previoId)
    .single();

  if (error || !previo) return { error: error?.message ?? "Previo no encontrado." };
  if (!previo.peso_bruto) return { error: "Captura el peso bruto antes de enviar a facturación." };

  const apiUrl = process.env.GPBFACTURACION_API_URL;
  const apiKey = process.env.GPBFACTURACION_API_KEY;
  if (!apiUrl || !apiKey) {
    return { error: "No está configurada la conexión con GPBFacturación (faltan variables de entorno)." };
  }

  try {
    const res = await fetch(`${apiUrl}/api/external/previos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({ reference: previo.reference, peso_bruto: previo.peso_bruto }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { error: `GPBFacturación respondió ${res.status}: ${text}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo contactar a GPBFacturación." };
  }

  await supabase
    .from("previos")
    .update({ status: "sent", sent_to_facturacion_at: new Date().toISOString() })
    .eq("id", previoId);

  revalidatePath(`/previos/${previoId}`);
  return { error: "" };
}
