import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { canManageUsers, ROLE_LABELS } from "@/lib/roles";
import { getCurrentRole } from "@/lib/roles-server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getCurrentRole();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/previos">
              <Image src="/gpb-logo.png" alt="GPB Forwarding LLC." width={160} height={53} />
            </Link>
            <nav className="flex gap-4 text-sm font-medium">
              <Link href="/previos" className="text-muted-foreground hover:text-foreground">
                Previos
              </Link>
              <Link href="/historial" className="text-muted-foreground hover:text-foreground">
                Historial de previos
              </Link>
              <Link href="/catalogo" className="text-muted-foreground hover:text-foreground">
                Catálogo
              </Link>
              {canManageUsers(role) && (
                <Link href="/admin/usuarios" className="text-muted-foreground hover:text-foreground">
                  Usuarios
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {role && <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>}
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <form action={signOut}>
              <Button variant="outline" size="sm" type="submit">
                Salir
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
