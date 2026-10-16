"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canClassify } from "@/lib/roles";
import { getCurrentRole } from "@/lib/roles-server";

export async function addClasificacion(_prevState: { error: string } | null, formData: FormData) {
  const role = await getCurrentRole();
  if (!canClassify(role)) return { error: "No tienes permiso para editar el catálogo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cliente = String(formData.get("cliente") ?? "").trim();
  const fraccion = String(formData.get("fraccion_arancelaria") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();

  if (!cliente || !fraccion || !descripcion) {
    return { error: "Cliente, fracción arancelaria y descripción son obligatorios." };
  }

  const { error } = await supabase.from("clasificaciones_arancelarias").insert({
    cliente,
    fraccion_arancelaria: fraccion,
    nico: String(formData.get("nico") ?? "").trim() || null,
    descripcion,
    regulaciones: String(formData.get("regulaciones") ?? "").trim() || null,
    created_by: user?.id ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath("/catalogo");
  return { error: "" };
}

export async function deleteClasificacion(id: string) {
  const role = await getCurrentRole();
  if (!canClassify(role)) return;

  const supabase = await createClient();
  await supabase.from("clasificaciones_arancelarias").delete().eq("id", id);
  revalidatePath("/catalogo");
}
