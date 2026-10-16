"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadPartidaPhoto(
  token: string,
  _prevState: { error: string } | null,
  formData: FormData
) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona o toma una foto." };
  }

  const admin = createAdminClient();

  const { data: partida, error: findError } = await admin
    .from("partidas")
    .select("id, no_partida, previo_id")
    .eq("photo_token", token)
    .single();

  if (findError || !partida) return { error: "Link inválido o expirado." };

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${partida.previo_id}/${partida.id}-${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("partida-photos")
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) return { error: `No se pudo subir la foto: ${uploadError.message}` };

  const { data: publicUrl } = admin.storage.from("partida-photos").getPublicUrl(path);

  const { error: updateError } = await admin
    .from("partidas")
    .update({ photo_url: publicUrl.publicUrl, photo_uploaded_at: new Date().toISOString() })
    .eq("id", partida.id);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/previos/${partida.previo_id}`);
  return { error: "", success: true as const };
}
