"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageUsers, type Role } from "@/lib/roles";
import { getCurrentRole } from "@/lib/roles-server";

export async function setUserRole(userId: string, role: Role) {
  const currentRole = await getCurrentRole();
  if (!canManageUsers(currentRole)) {
    return { error: "No tienes permiso para cambiar roles." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id" });

  if (error) return { error: error.message };
  revalidatePath("/admin/usuarios");
  return { error: "" };
}
