import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/roles";
import { nombreDeUsuario } from "@/lib/revisor";

export type UsuarioAsignable = { id: string; nombre: string; email: string; role: Role };

// Usuarios con alguno de los roles dados, para los selectores de asignación.
export async function listarUsuariosConRol(roles: Role[]): Promise<UsuarioAsignable[]> {
  const admin = createAdminClient();
  const { data: rolesData } = await admin.from("user_roles").select("user_id, role").in("role", roles);
  const rolPorUsuario = new Map((rolesData ?? []).map((r) => [r.user_id as string, r.role as Role]));
  if (rolPorUsuario.size === 0) return [];

  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return (data?.users ?? [])
    .filter((u) => rolPorUsuario.has(u.id))
    .map((u) => ({
      id: u.id,
      nombre: nombreDeUsuario(u) || (u.email ?? u.id),
      email: u.email ?? "",
      role: rolPorUsuario.get(u.id)!,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
