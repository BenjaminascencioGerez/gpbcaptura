import Link from "next/link";
import { notFound } from "next/navigation";
import { PaperclipIcon, PlusIcon, UploadIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ClasificacionArancelaria, Partida, PartidaAttachment, Previo } from "@/lib/types";
import { canClassify, canGlosar, isReadOnly } from "@/lib/roles";
import { getCurrentRole } from "@/lib/roles-server";
import { PrevioHeaderForm } from "./previo-header-form";
import { PartidaFormDialog } from "./partida-form-dialog";
import { PartidaLinkDialog } from "./partida-link-dialog";
import { DeletePartidaButton } from "./delete-partida-button";
import { SendToFacturacionButton } from "./send-to-facturacion-button";
import { ClassifyPartidaDialog } from "./classify-partida-dialog";
import { GlosarPartidaDialog } from "./glosar-partida-dialog";
import { ImportMorePartidasDialog } from "./import-more-partidas-dialog";
import { EstadoButton } from "../estado-button";
import { ESTADO_LABELS } from "@/lib/previo-progreso";

export default async function PrevioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const role = await getCurrentRole();
  const readOnly = isReadOnly(role);
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

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
    .order("sin_factura", { ascending: true })
    .order("sort_order", { ascending: true })
    .returns<Partida[]>();

  const rows = partidas ?? [];
  const partidaIds = rows.map((p) => p.id);

  const { data: attachmentsData } = partidaIds.length
    ? await supabase.from("partida_attachments").select("*").in("partida_id", partidaIds).returns<PartidaAttachment[]>()
    : { data: [] as PartidaAttachment[] };

  const attachmentsByPartida = new Map<string, PartidaAttachment[]>();
  for (const a of attachmentsData ?? []) {
    const list = attachmentsByPartida.get(a.partida_id) ?? [];
    list.push(a);
    attachmentsByPartida.set(a.partida_id, list);
  }

  const { data: catalogo } = previo.cliente
    ? await supabase
        .from("clasificaciones_arancelarias")
        .select("*")
        .eq("cliente", previo.cliente)
        .order("fraccion_arancelaria")
        .returns<ClasificacionArancelaria[]>()
    : { data: [] as ClasificacionArancelaria[] };

  const sinFacturaCount = rows.filter((p) => p.sin_factura).length;
  const sumaPesoPartidas = rows.reduce((acc, p) => acc + (p.peso ?? 0), 0);
  const pesoBruto = previo.peso_bruto ?? 0;
  const pesoDeltaPct = pesoBruto > 0 ? Math.abs(pesoBruto - sumaPesoPartidas) / pesoBruto : 0;
  const showPesoWarning = rows.length > 0 && pesoBruto > 0 && pesoDeltaPct > 0.1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={previo.estado === "importado" ? "/historial" : "/previos"}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← {previo.estado === "importado" ? "Historial de previos" : "Previos"}
          </Link>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            {previo.reference}
            <Badge variant={previo.status === "sent" ? "default" : "secondary"}>
              {previo.status === "sent" ? "Enviado" : "Borrador"}
            </Badge>
            <Badge variant={previo.estado === "importado" ? "default" : "outline"}>
              {ESTADO_LABELS[previo.estado]}
            </Badge>
          </h1>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <EstadoButton previoId={previo.id} estado={previo.estado} reference={previo.reference} />
            <SendToFacturacionButton previoId={previo.id} disabled={previo.status === "sent"} />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Encabezado</CardTitle>
        </CardHeader>
        <CardContent>
          <PrevioHeaderForm previo={previo} readOnly={readOnly} />
        </CardContent>
      </Card>

      {showPesoWarning && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          El peso bruto ({pesoBruto} kg) difiere {Math.round(pesoDeltaPct * 100)}% de la suma de pesos de
          las partidas ({sumaPesoPartidas.toFixed(2)} kg). Verifica antes de enviar a facturación.
        </div>
      )}

      {sinFacturaCount > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          ⚠ {sinFacturaCount} partida(s) sin No. de Partida — no vienen físicamente en la factura actual y
          necesitan una factura nueva antes de poder enviarse. Están al final de la tabla.
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Partidas ({rows.length})</CardTitle>
          {!readOnly && (
            <PartidaFormDialog
              previoId={previo.id}
              nextNoPartida={rows.length + 1}
              trigger={
                <Button size="sm" variant="outline">
                  <PlusIcon className="size-4" /> Nueva partida
                </Button>
              }
            />
          )}
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Fracción</TableHead>
                <TableHead>Clasificación</TableHead>
                <TableHead>Glosa</TableHead>
                <TableHead>Adjuntos</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const attachments = attachmentsByPartida.get(p.id) ?? [];
                const expectedTotal =
                  p.cant_factura != null && p.precio_unitario != null
                    ? p.cant_factura * p.precio_unitario
                    : null;
                const totalMismatch =
                  expectedTotal != null && p.total != null && Math.abs(expectedTotal - p.total) > 0.01;
                return (
                  <TableRow key={p.id} className={p.sin_factura ? "bg-destructive/5" : undefined}>
                    <TableCell className="font-medium">
                      {p.sin_factura ? (
                        <Badge variant="destructive" className="whitespace-nowrap">
                          Sin factura
                        </Badge>
                      ) : (
                        p.no_partida
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={p.descripcion_aa ?? ""}>
                      {p.descripcion_aa ?? "—"}
                      {p.sin_factura && (
                        <div className="text-xs text-destructive mt-0.5">
                          Requiere agregarse a una factura nueva
                        </div>
                      )}
                      {totalMismatch && (
                        <div className="text-xs text-destructive mt-0.5">
                          ⚠ cant. × precio ({expectedTotal?.toFixed(2)}) ≠ total ({p.total})
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{p.fraccion_arancelaria ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.classification_status === "clasificado" ? "default" : "secondary"}>
                        {p.classification_status === "clasificado" ? "Clasificado" : "Pendiente"}
                      </Badge>
                      {p.aplica_ma && (
                        <div className="text-xs text-muted-foreground mt-1">{p.aplica_ma}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.glosado ? "default" : "secondary"}>
                        {p.glosado ? "Glosada" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <PartidaLinkDialog
                        previoId={previo.id}
                        partidaId={p.id}
                        token={p.photo_token}
                        noPartida={p.no_partida}
                        attachments={attachments}
                        readOnly={readOnly}
                        trigger={
                          <Button variant="ghost" size="icon-sm" title="Adjuntos / link para foto">
                            <PaperclipIcon className="size-4" />
                            {attachments.length > 0 && (
                              <span className="ml-0.5 text-xs">{attachments.length}</span>
                            )}
                          </Button>
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end flex-wrap">
                        {canClassify(role) && (
                          <ClassifyPartidaDialog
                            previoId={previo.id}
                            partida={p}
                            catalogo={catalogo ?? []}
                            attachments={attachments}
                            trigger={
                              <Button variant="ghost" size="sm">
                                Clasificar
                              </Button>
                            }
                          />
                        )}
                        {canGlosar(role) &&
                          p.classification_status === "clasificado" &&
                          p.clasificado_by !== currentUser?.id && (
                          <GlosarPartidaDialog
                            previoId={previo.id}
                            partida={p}
                            attachments={attachments}
                            trigger={
                              <Button variant="ghost" size="sm">
                                Glosar
                              </Button>
                            }
                          />
                        )}
                        {!readOnly && (
                          <>
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
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Sin partidas todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {!readOnly && (
            <div className="flex items-center gap-2 border-t p-3">
              <PartidaFormDialog
                previoId={previo.id}
                nextNoPartida={rows.length + 1}
                trigger={
                  <Button size="sm" variant="outline">
                    <PlusIcon className="size-4" /> Nueva partida
                  </Button>
                }
              />
              <ImportMorePartidasDialog
                previoId={previo.id}
                trigger={
                  <Button size="sm" variant="outline">
                    <UploadIcon className="size-4" /> Cargar más partidas desde Excel
                  </Button>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
