"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadPartidaPhoto(
  token: string,
  _prevState: { error: string } | null,
  formData: FormData
) {
  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Selecciona o toma al menos una foto." };
  }

  const admin = createAdminClient();

  const { data: partida, error: findError } = await admin
    .from("partidas")
    .select("id, no_partida, previo_id, photo_url")
    .eq("photo_token", token)
    .single();

  if (findError || !partida) return { error: "Link inválido o expirado." };

  let coverUrl = partida.photo_url as string | null;

  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${partida.previo_id}/${partida.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
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
      partida_id: partida.id,
      file_url: publicUrl.publicUrl,
      file_type: isPhoto ? "photo" : "document",
      uploaded_via: "public_link",
    });

    if (isPhoto && !coverUrl) coverUrl = publicUrl.publicUrl;
  }

  await admin
    .from("partidas")
    .update({ photo_url: coverUrl, photo_uploaded_at: new Date().toISOString() })
    .eq("id", partida.id);

  revalidatePath(`/previos/${partida.previo_id}`);
  return { error: "", success: true as const };
}
