import { createClient } from "@/lib/supabase/server";
import { canClassify } from "@/lib/roles";
import { getCurrentRole } from "@/lib/roles-server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ClasificacionArancelaria } from "@/lib/types";
import { NewClasificacionForm } from "./new-form";
import { DeleteClasificacionButton } from "./delete-button";

export default async function CatalogoPage() {
  const role = await getCurrentRole();
  const editable = canClassify(role);

  const supabase = await createClient();
  const { data } = await supabase
    .from("clasificaciones_arancelarias")
    .select("*")
    .order("cliente", { ascending: true })
    .order("fraccion_arancelaria", { ascending: true })
    .returns<ClasificacionArancelaria[]>();

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Catálogo de clasificación arancelaria</h1>
        <p className="text-sm text-muted-foreground">
          Fracciones ya clasificadas por cliente, reutilizables al capturar partidas.
        </p>
      </div>

      {editable && <NewClasificacionForm />}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Foto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fracción</TableHead>
                <TableHead>NICO</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Regulaciones</TableHead>
                {editable && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.photo_url ? (
                      <a href={c.photo_url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.photo_url}
                          alt={c.descripcion}
                          className="size-10 rounded object-cover border"
                        />
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{c.cliente}</TableCell>
                  <TableCell>{c.fraccion_arancelaria}</TableCell>
                  <TableCell>{c.nico ?? "—"}</TableCell>
                  <TableCell className="max-w-sm truncate" title={c.descripcion}>
                    {c.descripcion}
                  </TableCell>
                  <TableCell>
                    {c.regulaciones ? (
                      <Badge variant="secondary">{c.regulaciones}</Badge>
                    ) : (
                      <span className="text-muted-foreground">Ninguna</span>
                    )}
                  </TableCell>
                  {editable && (
                    <TableCell>
                      <DeleteClasificacionButton id={c.id} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={editable ? 7 : 6} className="text-center text-muted-foreground py-8">
                    Catálogo vacío todavía.
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
