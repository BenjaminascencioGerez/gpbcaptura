"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// La foto sube directo del navegador a Supabase Storage (bypass de Vercel,
// que limita el body de una Server Action a 4.5MB) — este action solo crea
// la URL firmada de subida.
export async function requestPublicUploadSlot(token: string, fileName: string) {
  const admin = createAdminClient();

  const { data: partida, error: findError } = await admin
    .from("partidas")
    .select("id, previo_id")
    .eq("photo_token", token)
    .single();

  if (findError || !partida) return { error: "Link inválido o expirado." } as const;

  const ext = fileName.split(".").pop() || "jpg";
  const path = `${partida.previo_id}/${partida.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const { data, error } = await admin.storage.from("partida-photos").createSignedUploadUrl(path);
  if (error || !data) return { error: `No se pudo preparar la subida: ${error?.message}` } as const;

  return { error: "", path, token: data.token, partidaId: partida.id } as const;
}

export async function confirmPublicUpload(
  photoToken: string,
  path: string,
  fileType: "photo" | "document"
) {
  const admin = createAdminClient();

  const { data: partida, error: findError } = await admin
    .from("partidas")
    .select("id, previo_id, photo_url")
    .eq("photo_token", photoToken)
    .single();

  if (findError || !partida) return { error: "Link inválido o expirado." };

  const { data: publicUrl } = admin.storage.from("partida-photos").getPublicUrl(path);

  const { error: insertError } = await admin.from("partida_attachments").insert({
    partida_id: partida.id,
    file_url: publicUrl.publicUrl,
    file_type: fileType,
    uploaded_via: "public_link",
  });
  if (insertError) return { error: insertError.message };

  if (fileType === "photo" && !partida.photo_url) {
    await admin
      .from("partidas")
      .update({ photo_url: publicUrl.publicUrl, photo_uploaded_at: new Date().toISOString() })
      .eq("id", partida.id);
  }

  revalidatePath(`/previos/${partida.previo_id}`);
  return { error: "" };
}
