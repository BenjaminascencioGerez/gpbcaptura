import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Previo } from "@/lib/types";

export default async function PreviosPage() {
  const supabase = await createClient();
  const { data: previos } = await supabase
    .from("previos")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Previo[]>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Previos</h1>
        <Button nativeButton={false} render={<Link href="/previos/new" />}>
          Nuevo previo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Peso bruto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(previos ?? []).map((p) => (
                <TableRow key={p.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/previos/${p.id}`} className="font-medium hover:underline">
                      {p.reference}
                    </Link>
                  </TableCell>
                  <TableCell>{p.cliente ?? "—"}</TableCell>
                  <TableCell>{p.fecha}</TableCell>
                  <TableCell>{p.peso_bruto ? `${p.peso_bruto} kg` : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "sent" ? "default" : "secondary"}>
                      {p.status === "sent" ? "Enviado" : "Borrador"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(previos ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aún no hay previos capturados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
