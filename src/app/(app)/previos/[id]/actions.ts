"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canClassify, canGlosar, isReadOnly } from "@/lib/roles";
import { getCurrentRole } from "@/lib/roles-server";
import { notifyEjecutivos } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

type PartidaInput = {
  previo_id: string;
  no_partida: number;
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
  };
}

export async function addPartida(previoId: string, _prevState: { error: string } | null, formData: FormData) {
  const role = await getCurrentRole();
  if (isReadOnly(role)) return { error: "Tu rol (Ejecutivo) solo tiene acceso de lectura." };

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
  const role = await getCurrentRole();
  if (isReadOnly(role)) return { error: "Tu rol (Ejecutivo) solo tiene acceso de lectura." };

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
  const role = await getCurrentRole();
  if (isReadOnly(role)) return;

  const supabase = await createClient();
  await supabase.from("partidas").delete().eq("id", partidaId);
  revalidatePath(`/previos/${previoId}`);
}

export async function updatePrevioHeader(previoId: string, formData: FormData) {
  const role = await getCurrentRole();
  if (isReadOnly(role)) return;

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

export async function classifyPartida(
  previoId: string,
  partidaId: string,
  _prevState: { error: string } | null,
  formData: FormData
) {
  const role = await getCurrentRole();
  if (!canClassify(role)) return { error: "No tienes permiso para clasificar." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fraccion = String(formData.get("fraccion_arancelaria") ?? "").trim();
  if (!fraccion) return { error: "La fracción arancelaria es obligatoria." };
  if (!/^\d{8}$/.test(fraccion)) {
    return { error: "La fracción arancelaria debe tener exactamente 8 dígitos (TIGIE), sin puntos ni guiones." };
  }

  const nico = String(formData.get("nico") ?? "").trim() || null;
  if (nico && !/^\d{2}$/.test(nico)) {
    return { error: "El NICO debe tener exactamente 2 dígitos." };
  }
  const regulaciones = String(formData.get("aplica_ma") ?? "").trim() || null;
  const saveToCatalog = formData.get("save_to_catalog") === "on";

  const { data: previo } = await supabase.from("previos").select("reference, cliente").eq("id", previoId).single();

  const { error } = await supabase
    .from("partidas")
    .update({
      fraccion_arancelaria: fraccion,
      nico,
      aplica_ma: regulaciones,
      classification_status: "clasificado",
      clasificado_by: user?.id ?? null,
      clasificado_at: new Date().toISOString(),
    })
    .eq("id", partidaId);

  if (error) return { error: error.message };

  if (saveToCatalog && previo?.cliente) {
    const { data: partida } = await supabase.from("partidas").select("descripcion_aa, no_partida").eq("id", partidaId).single();
    await supabase.from("clasificaciones_arancelarias").insert({
      cliente: previo.cliente,
      fraccion_arancelaria: fraccion,
      nico,
      descripcion: partida?.descripcion_aa ?? `Partida ${partida?.no_partida ?? ""}`,
      regulaciones,
      created_by: user?.id ?? null,
    });
  }

  await notifyEjecutivos({
    eventType: "partida_clasificada",
    previoId,
    partidaId,
    payload: {
      reference: previo?.reference ?? "",
      fraccion_arancelaria: fraccion,
      regulaciones: regulaciones ?? "Ninguna",
    },
  });

  revalidatePath(`/previos/${previoId}`);
  return { error: "" };
}

export async function glosarPartida(
  previoId: string,
  partidaId: string,
  _prevState: { error: string } | null,
  formData: FormData
) {
  const role = await getCurrentRole();
  if (!canGlosar(role)) return { error: "No tienes permiso para glosar." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partidaActual } = await supabase
    .from("partidas")
    .select("aplica_ma, clasificado_by, classification_status")
    .eq("id", partidaId)
    .single();

  if (partidaActual?.classification_status !== "clasificado") {
    return { error: "Esta partida todavía no está clasificada." };
  }

  if (user && partidaActual.clasificado_by === user.id) {
    return { error: "Quien clasifica no puede glosar la misma partida (separación de funciones)." };
  }

  if (partidaActual.aplica_ma) {
    const { count } = await supabase
      .from("partida_attachments")
      .select("id", { count: "exact", head: true })
      .eq("partida_id", partidaId)
      .eq("file_type", "document");
    if (!count) {
      return {
        error: `Esta partida requiere "${partidaActual.aplica_ma}" — adjunta el documento/evidencia antes de glosar.`,
      };
    }
  }

  const notas = String(formData.get("notas_glosa") ?? "").trim() || null;

  const { data: previo } = await supabase.from("previos").select("reference").eq("id", previoId).single();

  const { error } = await supabase
    .from("partidas")
    .update({
      glosado: true,
      glosado_by: user?.id ?? null,
      glosado_at: new Date().toISOString(),
      notas_glosa: notas,
    })
    .eq("id", partidaId);

  if (error) return { error: error.message };

  await notifyEjecutivos({
    eventType: "partida_glosada",
    previoId,
    partidaId,
    payload: { reference: previo?.reference ?? "", notas: notas ?? "" },
  });

  revalidatePath(`/previos/${previoId}`);
  return { error: "" };
}

export async function addOfficeAttachment(
  previoId: string,
  partidaId: string,
  _prevState: { error: string } | null,
  formData: FormData
) {
  const role = await getCurrentRole();
  if (isReadOnly(role)) return { error: "Tu rol (Ejecutivo) solo tiene acceso de lectura." };

  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Selecciona al menos un archivo." };

  const admin = createAdminClient();
  let coverUrl: string | null = null;

  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${previoId}/${partidaId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const isPhoto = file.type.startsWith("image/");

    const { error: uploadError } = await admin.storage
      .from("partida-photos")
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) return { error: `No se pudo subir "${file.name}": ${uploadError.message}` };

    const { data: publicUrl } = admin.storage.from("partida-photos").getPublicUrl(path);
    await admin.from("partida_attachments").insert({
      partida_id: partidaId,
      file_url: publicUrl.publicUrl,
      file_type: isPhoto ? "photo" : "document",
      uploaded_via: "office",
    });
    if (isPhoto && !coverUrl) coverUrl = publicUrl.publicUrl;
  }

  if (coverUrl) {
    const { data: partida } = await admin.from("partidas").select("photo_url").eq("id", partidaId).single();
    if (!partida?.photo_url) {
      await admin
        .from("partidas")
        .update({ photo_url: coverUrl, photo_uploaded_at: new Date().toISOString() })
        .eq("id", partidaId);
    }
  }

  revalidatePath(`/previos/${previoId}`);
  return { error: "" };
}

export async function sendToFacturacion(previoId: string) {
  const role = await getCurrentRole();
  if (isReadOnly(role)) return { error: "Tu rol (Ejecutivo) solo tiene acceso de lectura." };

  const supabase = await createClient();
  const { data: previo, error } = await supabase
    .from("previos")
    .select("*")
    .eq("id", previoId)
    .single();

  if (error || !previo) return { error: error?.message ?? "Previo no encontrado." };
  if (!previo.peso_bruto) return { error: "Captura el peso bruto antes de enviar a facturación." };

  const { count: pendientes } = await supabase
    .from("partidas")
    .select("id", { count: "exact", head: true })
    .eq("previo_id", previoId)
    .eq("classification_status", "pendiente");

  if (pendientes && pendientes > 0) {
    return {
      error: `Hay ${pendientes} partida(s) sin clasificar — clasifícalas antes de enviar a facturación.`,
    };
  }

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

  await notifyEjecutivos({
    eventType: "previo_enviado_facturacion",
    previoId,
    payload: { reference: previo.reference, peso_bruto: previo.peso_bruto },
  });

  revalidatePath(`/previos/${previoId}`);
  return { error: "" };
}
