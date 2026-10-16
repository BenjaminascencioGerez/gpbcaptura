import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/roles";

export async function getCurrentRole(): Promise<Role | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: Role }>();

  return data?.role ?? null;
}
