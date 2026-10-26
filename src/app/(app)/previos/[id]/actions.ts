"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canClassify, canGlosar, isReadOnly } from "@/lib/roles";
import { getCurrentRole } from "@/lib/roles-server";
import { notifyEjecutivos } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePrevioExcel } from "@/lib/previo-excel";
import { asignarRevisorSiFalta } from "@/lib/revisor";
import { resumenPorFactura } from "@/lib/partida";

type PartidaInput = {
  previo_id: string;
  no_partida: number | null;
  factura: string | null;
  sin_factura: boolean;
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
  kilos_por_pieza: number | null;
  umt: string | null;
};

function fromFormData(
  previoId: string,
  formData: FormData,
  sortOrder: number,
  fallbackToNextNumber: boolean
): PartidaInput {
  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const num = (k: string) => {
    const v = formData.get(k);
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const noPartida = num("no_partida") ?? (fallbackToNextNumber ? sortOrder + 1 : null);
  return {
    previo_id: previoId,
    no_partida: noPartida,
    factura: str("factura"),
    sin_factura: noPartida === null,
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
    kilos_por_pieza: num("kilos_por_pieza"),
    umt: str("umt"),
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
    .insert({ ...fromFormData(previoId, formData, count ?? 0, true), sort_order: count ?? 0 });

  if (error) return { error: error.message };
  await asignarRevisorSiFalta(supabase, previoId);
  revalidatePath(`/previos/${previoId}`);
  return { error: "" };
}

export async function importMorePartidas(previoId: string, _prevState: { error: string } | null, formData: FormData) {
  const role = await getCurrentRole();
  if (isReadOnly(role)) return { error: "Tu rol (Ejecutivo) solo tiene acceso de lectura." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo .xlsx." };
  }

  let parsed;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    parsed = await parsePrevioExcel(buffer);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo leer el archivo." };
  }

  const supabase = await createClient();
  const { data: existing, count } = await supabase
    .from("partidas")
    .select("no_partida, factura", { count: "exact" })
    .eq("previo_id", previoId);

  // Una partida es la misma si coincide factura + No. de Partida (cada factura
  // empieza en 1). Las sin número (sin_factura) nunca se consideran duplicadas —
  // no hay forma confiable de comparar sin un No. de Partida.
  const clave = (p: { factura: string | null; no_partida: number | null }) => `${p.factura ?? ""}|${p.no_partida}`;
  const existentes = new Set((existing ?? []).filter((p) => p.no_partida !== null).map(clave));
  const newRows = parsed.partidas.filter((p) => p.no_partida === null || !existentes.has(clave(p)));
  const skipped = parsed.partidas.length - newRows.length;

  if (newRows.length === 0) {
    return {
      error: `Las ${parsed.partidas.length} partidas del archivo ya existen en este previo (misma factura y No. de Partida) — no se agregó nada.`,
    };
  }

  const startOrder = count ?? 0;
  const { error } = await supabase.from("partidas").insert(
    newRows.map((p, i) => ({ ...p, previo_id: previoId, sort_order: startOrder + i }))
  );

  if (error) return { error: error.message };
  await asignarRevisorSiFalta(supabase, previoId);
  revalidatePath(`/previos/${previoId}`);
  return {
    error: "",
    added: newRows.length,
    skipped,
    message:
      skipped > 0
        ? `Se agregaron ${resumenPorFactura(newRows)}; se omitieron ${skipped} que ya existían (misma factura y No. de Partida).`
        : `Se agregaron ${resumenPorFactura(newRows)}.`,
  };
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
    .update(fromFormData(previoId, formData, 0, false))
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
  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
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
      referencia_cliente: str("referencia_cliente"),
      cliente: str("cliente"),
      proveedor: str("proveedor"),
      fecha: String(formData.get("fecha") ?? "") || undefined,
      fecha_arribo: str("fecha_arribo"),
      fecha_revision: str("fecha_revision"),
      revisor: str("revisor"),
      recibido_por: str("recibido_por"),
      peso_bruto: num("peso_bruto"),
      bultos_tarimas: num("bultos_tarimas"),
      bultos_cajas_madera: num("bultos_cajas_madera"),
      bultos_otros: num("bultos_otros"),
      bultos_otros_tipo: str("bultos_otros_tipo"),
    })
    .eq("id", previoId);

  revalidatePath(`/previos/${previoId}`);
}

export async function lookupLigieUmt(fraccion: string, nico: string | null) {
  if (!/^\d{8}$/.test(fraccion)) return { umt: null, requiereNom: false };

  const supabase = await createClient();
  let query = supabase
    .from("fracciones_ligie")
    .select("umt, requiere_nom")
    .eq("fraccion_arancelaria", fraccion);

  if (nico) query = query.eq("nico", nico);

  const { data } = await query.limit(1).maybeSingle();
  return { umt: data?.umt ?? null, requiereNom: data?.requiere_nom ?? false };
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
  const umt = String(formData.get("umt") ?? "").trim() || null;
  const saveToCatalog = formData.get("save_to_catalog") === "on";

  const { data: previo } = await supabase.from("previos").select("reference, cliente").eq("id", previoId).single();

  const { error } = await supabase
    .from("partidas")
    .update({
      fraccion_arancelaria: fraccion,
      nico,
      aplica_ma: regulaciones,
      umt,
      classification_status: "clasificado",
      clasificado_by: user?.id ?? null,
      clasificado_at: new Date().toISOString(),
    })
    .eq("id", partidaId);

  if (error) return { error: error.message };

  if (saveToCatalog && previo?.cliente) {
    const { data: partida } = await supabase
      .from("partidas")
      .select("descripcion_aa, no_partida, photo_url")
      .eq("id", partidaId)
      .single();
    await supabase.from("clasificaciones_arancelarias").insert({
      cliente: previo.cliente,
      fraccion_arancelaria: fraccion,
      nico,
      descripcion: partida?.descripcion_aa ?? `Partida ${partida?.no_partida ?? ""}`,
      regulaciones,
      photo_url: partida?.photo_url ?? null,
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

// La foto sube directo del navegador a Supabase Storage (bypass de Vercel,
// que limita el body de una Server Action a 4.5MB) — este action solo crea
// la URL firmada de subida.
export async function requestOfficeUploadSlot(previoId: string, partidaId: string, fileName: string) {
  const role = await getCurrentRole();
  if (isReadOnly(role)) return { error: "Tu rol (Ejecutivo) solo tiene acceso de lectura." } as const;

  const admin = createAdminClient();
  const ext = fileName.split(".").pop() || "jpg";
  const path = `${previoId}/${partidaId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const { data, error } = await admin.storage.from("partida-photos").createSignedUploadUrl(path);
  if (error || !data) return { error: `No se pudo preparar la subida: ${error?.message}` } as const;

  return { error: "", path, token: data.token } as const;
}

export async function confirmOfficeUpload(
  previoId: string,
  partidaId: string,
  path: string,
  fileType: "photo" | "document"
) {
  const role = await getCurrentRole();
  if (isReadOnly(role)) return { error: "Tu rol (Ejecutivo) solo tiene acceso de lectura." };

  const admin = createAdminClient();
  const { data: publicUrl } = admin.storage.from("partida-photos").getPublicUrl(path);

  const { error: insertError } = await admin.from("partida_attachments").insert({
    partida_id: partidaId,
    file_url: publicUrl.publicUrl,
    file_type: fileType,
    uploaded_via: "office",
  });
  if (insertError) return { error: insertError.message };

  if (fileType === "photo") {
    const { data: partida } = await admin.from("partidas").select("photo_url").eq("id", partidaId).single();
    if (!partida?.photo_url) {
      await admin
        .from("partidas")
        .update({ photo_url: publicUrl.publicUrl, photo_uploaded_at: new Date().toISOString() })
        .eq("id", partidaId);
    }
  }

  await asignarRevisorSiFalta(await createClient(), previoId);
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

  // Al enviarse a facturación el previo se da por importado y pasa al historial.
  const now = new Date().toISOString();
  await supabase
    .from("previos")
    .update({ status: "sent", sent_to_facturacion_at: now, estado: "importado", importado_at: now })
    .eq("id", previoId);

  await notifyEjecutivos({
    eventType: "previo_enviado_facturacion",
    previoId,
    payload: { reference: previo.reference, peso_bruto: previo.peso_bruto },
  });

  revalidatePath(`/previos/${previoId}`);
  revalidatePath("/previos");
  revalidatePath("/historial");
  return { error: "" };
}
