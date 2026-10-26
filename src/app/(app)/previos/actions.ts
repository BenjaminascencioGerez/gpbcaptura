"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parsePrevioExcel } from "@/lib/previo-excel";
import { isReadOnly } from "@/lib/roles";
import { getCurrentRole } from "@/lib/roles-server";

export async function createPrevioManual(_prevState: { error: string } | null, formData: FormData) {
  const role = await getCurrentRole();
  if (isReadOnly(role)) return { error: "Tu rol (Ejecutivo) solo tiene acceso de lectura." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const reference = String(formData.get("reference") ?? "").trim();
  if (!reference) return { error: "La referencia (GBI) es obligatoria." };

  const { data, error } = await supabase
    .from("previos")
    .insert({
      reference,
      referencia_cliente: String(formData.get("referencia_cliente") ?? "").trim() || null,
      cliente: String(formData.get("cliente") ?? "").trim() || null,
      fecha: String(formData.get("fecha") ?? "") || new Date().toISOString().slice(0, 10),
      bultos_tarimas: numOrNull(formData.get("bultos_tarimas")),
      bultos_cajas_madera: numOrNull(formData.get("bultos_cajas_madera")),
      bultos_otros: numOrNull(formData.get("bultos_otros")),
      bultos_otros_tipo: String(formData.get("bultos_otros_tipo") ?? "").trim() || null,
      peso_bruto: numOrNull(formData.get("peso_bruto")),
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") return { error: `Ya existe un previo con la referencia "${reference}".` };
    return { error: error?.message ?? "No se pudo crear el previo." };
  }

  redirect(`/previos/${data.id}`);
}

export async function importPrevioExcel(_prevState: { error: string } | null, formData: FormData) {
  const role = await getCurrentRole();
  if (isReadOnly(role)) return { error: "Tu rol (Ejecutivo) solo tiene acceso de lectura." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo .xlsx." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let parsed;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    parsed = await parsePrevioExcel(buffer);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo leer el archivo." };
  }

  const { header, partidas } = parsed;
  if (!header.reference) {
    return { error: "No se encontró el No. de Referencia (celda D11) en el archivo." };
  }

  const { data: previo, error: previoError } = await supabase
    .from("previos")
    .insert({
      reference: header.reference,
      cliente: header.cliente || null,
      fecha: header.fecha ?? new Date().toISOString().slice(0, 10),
      bultos_tarimas: header.bultos_tarimas,
      peso_bruto: header.peso_bruto,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (previoError || !previo) {
    if (previoError?.code === "23505") {
      return { error: `Ya existe un previo con la referencia "${header.reference}".` };
    }
    return { error: previoError?.message ?? "No se pudo crear el previo." };
  }

  const { error: partidasError } = await supabase.from("partidas").insert(
    partidas.map((p) => ({ ...p, previo_id: previo.id }))
  );

  if (partidasError) {
    return { error: `Previo creado, pero falló la carga de partidas: ${partidasError.message}` };
  }

  redirect(`/previos/${previo.id}`);
}

export async function setPrevioEstado(previoId: string, estado: "en_bodega" | "importado") {
  const role = await getCurrentRole();
  if (isReadOnly(role)) return { error: "Tu rol (Ejecutivo) solo tiene acceso de lectura." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("previos")
    .update({ estado, importado_at: estado === "importado" ? new Date().toISOString() : null })
    .eq("id", previoId);
  if (error) return { error: error.message };

  revalidatePath("/previos");
  revalidatePath("/historial");
  revalidatePath(`/previos/${previoId}`);
  return { error: "" };
}

function numOrNull(v: FormDataEntryValue | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
