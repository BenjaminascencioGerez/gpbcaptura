import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageUsers, type Role } from "@/lib/roles";
import { getCurrentRole } from "@/lib/roles-server";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleSelect } from "./role-select";

export default async function UsuariosPage() {
  const role = await getCurrentRole();
  if (!canManageUsers(role)) redirect("/previos");

  const admin = createAdminClient();
  const { data: authUsers } = await admin.auth.admin.listUsers();
  const { data: roles } = await admin.from("user_roles").select("user_id, role");

  const rolesByUser = new Map((roles ?? []).map((r) => [r.user_id, r.role as Role]));

  const users = (authUsers?.users ?? [])
    .map((u) => ({ id: u.id, email: u.email ?? "—", role: rolesByUser.get(u.id) ?? ("captura" as Role) }))
    .sort((a, b) => a.email.localeCompare(b.email));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios y roles</h1>
        <p className="text-sm text-muted-foreground">
          Controla qué puede hacer cada persona dentro de GPBCaptura.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <RoleSelect userId={u.id} role={u.role} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
