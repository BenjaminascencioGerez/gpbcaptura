import type { SupabaseClient, User } from "@supabase/supabase-js";

// "saul.garcia@grupogerez.com" -> "Saul Garcia" cuando el usuario no tiene nombre en su perfil.
export function nombreDeUsuario(user: User): string {
  const meta = user.user_metadata ?? {};
  const nombre = meta.full_name ?? meta.name;
  if (typeof nombre === "string" && nombre.trim()) return nombre.trim();
  return (user.email ?? "")
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// El primero que captura partidas o sube fotos/documentos en oficina queda como
// revisor del previo; no sobrescribe uno ya asignado (se puede editar a mano).
export async function asignarRevisorSiFalta(supabase: SupabaseClient, previoId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const nombre = nombreDeUsuario(user);
  if (!nombre) return;
  await supabase.from("previos").update({ revisor: nombre }).eq("id", previoId).is("revisor", null);
}
