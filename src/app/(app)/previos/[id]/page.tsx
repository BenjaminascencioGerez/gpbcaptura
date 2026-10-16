import Link from "next/link";
import { notFound } from "next/navigation";
import { CameraIcon, LinkIcon, PlusIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Partida, Previo } from "@/lib/types";
import { PrevioHeaderForm } from "./previo-header-form";
import { PartidaFormDialog } from "./partida-form-dialog";
import { PartidaLinkDialog } from "./partida-link-dialog";
import { DeletePartidaButton } from "./delete-partida-button";
import { SendToFacturacionButton } from "./send-to-facturacion-button";

export default async function PrevioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: previo } = await supabase
    .from("previos")
    .select("*")
    .eq("id", id)
    .single<Previo>();

  if (!previo) notFound();

  const { data: partidas } = await supabase
    .from("partidas")
    .select("*")
    .eq("previo_id", id)
    .order("sort_order", { ascending: true })
    .returns<Partida[]>();

  const rows = partidas ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/previos" className="text-sm text-muted-foreground hover:underline">
            ← Previos
          </Link>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            {previo.reference}
            <Badge variant={previo.status === "sent" ? "default" : "secondary"}>
              {previo.status === "sent" ? "Enviado" : "Borrador"}
            </Badge>
          </h1>
        </div>
        <SendToFacturacionButton previoId={previo.id} disabled={previo.status === "sent"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Encabezado</CardTitle>
        </CardHeader>
        <CardContent>
          <PrevioHeaderForm previo={previo} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Partidas ({rows.length})</CardTitle>
          <PartidaFormDialog
            previoId={previo.id}
            nextNoPartida={rows.length + 1}
            trigger={
              <Button size="sm" variant="outline">
                <PlusIcon className="size-4" /> Nueva partida
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Marca / Modelo</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>P. Unitario</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Foto</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.no_partida}</TableCell>
                  <TableCell className="max-w-xs truncate" title={p.descripcion_aa ?? ""}>
                    {p.descripcion_aa ?? "—"}
                  </TableCell>
                  <TableCell>
                    {[p.marca, p.modelo].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell>{p.peso ?? "—"}</TableCell>
                  <TableCell>{p.precio_unitario ?? "—"}</TableCell>
                  <TableCell>{p.total ?? "—"}</TableCell>
                  <TableCell>
                    {p.photo_url ? (
                      <a href={p.photo_url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.photo_url}
                          alt={`Foto partida ${p.no_partida}`}
                          className="size-10 rounded object-cover border"
                        />
                      </a>
                    ) : (
                      <Badge variant="secondary">Sin foto</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <PartidaLinkDialog
                        token={p.photo_token}
                        noPartida={p.no_partida}
                        trigger={
                          <Button variant="ghost" size="icon-sm" title="Link / QR para foto">
                            {p.photo_url ? <LinkIcon className="size-4" /> : <CameraIcon className="size-4" />}
                          </Button>
                        }
                      />
                      <PartidaFormDialog
                        previoId={previo.id}
                        partida={p}
                        trigger={
                          <Button variant="ghost" size="sm">
                            Editar
                          </Button>
                        }
                      />
                      <DeletePartidaButton previoId={previo.id} partidaId={p.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Sin partidas todavía.
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
