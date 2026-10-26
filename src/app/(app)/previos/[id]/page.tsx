import Link from "next/link";
import { notFound } from "next/navigation";
import { PaperclipIcon, PlusIcon, UploadIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ClasificacionArancelaria, Partida, PartidaAttachment, Previo } from "@/lib/types";
import { canClassify, canDocumentar, canGlosar, isReadOnly, isSuperAdmin } from "@/lib/roles";
import { getCurrentRole } from "@/lib/roles-server";
import { PrevioHeaderForm } from "./previo-header-form";
import { PartidaFormDialog } from "./partida-form-dialog";
import { PartidaLinkDialog } from "./partida-link-dialog";
import { DeletePartidaButton } from "./delete-partida-button";
import { SendToFacturacionButton } from "./send-to-facturacion-button";
import { ClassifyPartidaDialog } from "./classify-partida-dialog";
import { GlosarPartidaDialog } from "./glosar-partida-dialog";
import { ImportMorePartidasDialog } from "./import-more-partidas-dialog";
import { etiquetaPartida } from "@/lib/partida";
import { AsignarDialog } from "./asignar-dialog";
import { EnviarDocumentacionButton } from "./enviar-documentacion-button";
import { CambiarEtapaControl } from "./cambiar-etapa-control";
import { MarcarGlosadoButton } from "./marcar-glosado-button";
import { SinDocumentosButton } from "./sin-documentos-button";
import { calcularProgreso } from "@/lib/previo-progreso";
import { DownloadIcon } from "lucide-react";
import { listarUsuariosConRol } from "@/lib/usuarios-server";
import { EstadoButton } from "../estado-button";
import { ESTADO_LABELS } from "@/lib/previo-progreso";

export default async function PrevioDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const { carga } = await searchParams;
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
  const pendientesClasificar = rows.filter((p) => p.classification_status === "pendiente").length;
  const todasConfirmadas = rows.length > 0 && rows.every((p) => p.glosado && !p.revision_estado);
  const superAdmin = isSuperAdmin(role);
  const etapaActual = calcularProgreso(
    previo,
    rows,
    new Set(rows.filter((p) => attachmentsByPartida.get(p.id)?.length).map((p) => p.id))
  ).etapa;
  const sinFoto = rows.filter((p) => !p.photo_url && !(attachmentsByPartida.get(p.id)?.length)).length;
  // Ejecutivos también necesitan la lista (envían a glosa desde Documentación).
  const asignables = await listarUsuariosConRol(["clasificador", "glosador", "administrador", "super_admin"]);
  const clasificadores = asignables.filter((u) => u.role !== "glosador");
  const glosadores = asignables.filter((u) => u.role !== "clasificador");
  const fechaCorta = (iso: string) =>
    new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

  // Un grupo por factura en el orden en que aparecen; las sin factura al final.
  // Con una sola factura (o ninguna) la tabla se ve sin encabezados de grupo.
  const grupos = new Map<string, Partida[]>();
  for (const p of rows) {
    const key = p.sin_factura ? "__sin_factura__" : (p.factura ?? "");
    const list = grupos.get(key) ?? [];
    list.push(p);
    grupos.set(key, list);
  }
  const agrupar = grupos.size > 1 && [...grupos.keys()].some((k) => k && k !== "__sin_factura__");
  const facturasPrevio = [...new Set(rows.map((p) => p.factura).filter((f): f is string => Boolean(f)))];
  const sumaPesoPartidas = rows.reduce((acc, p) => acc + (p.peso ?? 0), 0);
  const pesoBruto = previo.peso_bruto ?? 0;
  const pesoDeltaPct = pesoBruto > 0 ? Math.abs(pesoBruto - sumaPesoPartidas) / pesoBruto : 0;
  const showPesoWarning = rows.length > 0 && pesoBruto > 0 && pesoDeltaPct > 0.1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
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
            {previo.sin_documentos && <Badge variant="destructive">Sin documentos</Badge>}
          </h1>
          {previo.sin_documentos && previo.sin_documentos_nota && (
            <p className="mt-1 text-sm text-destructive">Faltan: {previo.sin_documentos_nota}</p>
          )}
          {(previo.enviado_clasificacion_at || previo.enviado_glosa_at || previo.enviado_documentacion_at) && (
            <p className="mt-1 text-sm text-muted-foreground">
              {previo.enviado_clasificacion_at && (
                <>
                  Clasificación: <span className="text-foreground">{previo.clasificador_nombre ?? "—"}</span> (
                  {fechaCorta(previo.enviado_clasificacion_at)})
                </>
              )}
              {previo.enviado_clasificacion_at && previo.enviado_glosa_at && " · "}
              {previo.enviado_glosa_at && (
                <>
                  Confirma fracciones: <span className="text-foreground">{previo.glosador_nombre ?? "—"}</span> (
                  {fechaCorta(previo.enviado_glosa_at)})
                </>
              )}
              {previo.enviado_documentacion_at && (
                <>
                  {" · "}Documentación ({fechaCorta(previo.enviado_documentacion_at)})
                </>
              )}
              {previo.enviado_glosa_final_at && (
                <>
                  {" · "}Glosa: <span className="text-foreground">{previo.glosa_final_nombre ?? "—"}</span> (
                  {fechaCorta(previo.enviado_glosa_final_at)})
                </>
              )}
              {previo.glosado_final_at && <>{" · "}Glosado ({fechaCorta(previo.glosado_final_at)})</>}
            </p>
          )}
        </div>
        {!readOnly && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {previo.status !== "sent" && (
              <SinDocumentosButton previoId={previo.id} sinDocumentos={previo.sin_documentos} />
            )}
            {superAdmin && previo.status !== "sent" && (
              <CambiarEtapaControl previoId={previo.id} etapaActual={etapaActual} />
            )}
            <EstadoButton previoId={previo.id} estado={previo.estado} reference={previo.reference} />
            {previo.status !== "sent" && (
              <AsignarDialog
                previoId={previo.id}
                tipo="clasificacion"
                usuarios={clasificadores}
                asignadoId={previo.clasificador_id}
                aviso={
                  sinFoto > 0
                    ? `${sinFoto} partida(s) todavía no tienen foto o documento de la revisión física.`
                    : undefined
                }
                trigger={
                  <Button
                    variant={previo.enviado_clasificacion_at ? "outline" : "default"}
                    disabled={rows.length === 0 && !superAdmin}
                  >
                    {previo.enviado_clasificacion_at ? "Reasignar clasificador" : "Enviar a clasificación"}
                  </Button>
                }
              />
            )}
            {previo.status !== "sent" && previo.enviado_clasificacion_at && !previo.enviado_documentacion_at && (
              <AsignarDialog
                previoId={previo.id}
                tipo="glosa"
                usuarios={clasificadores}
                asignadoId={previo.glosador_id}
                aviso={
                  pendientesClasificar > 0
                    ? `Faltan ${pendientesClasificar} partida(s) por clasificar; no se pueden enviar las fracciones todavía.`
                    : undefined
                }
                trigger={
                  <Button variant={previo.enviado_glosa_at ? "outline" : "default"}>
                    {previo.enviado_glosa_at ? "Reasignar quién confirma" : "Enviar fracciones"}
                  </Button>
                }
              />
            )}
            {previo.status !== "sent" &&
              previo.enviado_glosa_at &&
              (todasConfirmadas || superAdmin) &&
              !previo.enviado_documentacion_at && (
              <EnviarDocumentacionButton previoId={previo.id} />
            )}
            <SendToFacturacionButton previoId={previo.id} disabled={previo.status === "sent"} />
          </div>
        )}
        {previo.enviado_documentacion_at && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" nativeButton={false} render={<a href={`/previos/${previo.id}/pedimento`} />}>
              <DownloadIcon className="size-4" /> Descargar Excel para pedimento
            </Button>
            {previo.status !== "sent" && !previo.glosado_final_at && canDocumentar(role) && (
              <AsignarDialog
                previoId={previo.id}
                tipo="glosa_final"
                usuarios={glosadores}
                asignadoId={previo.glosa_final_id}
                trigger={
                  <Button variant={previo.enviado_glosa_final_at ? "outline" : "default"}>
                    {previo.enviado_glosa_final_at ? "Reasignar glosador" : "Enviar a glosa"}
                  </Button>
                }
              />
            )}
            {previo.status !== "sent" && previo.enviado_glosa_final_at && !previo.glosado_final_at && canGlosar(role) && (
              <MarcarGlosadoButton previoId={previo.id} />
            )}
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

      {typeof carga === "string" && carga && (
        <div className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Se cargaron {carga}.
        </div>
      )}

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
                <TableHead>Confirmación</TableHead>
                <TableHead>Adjuntos</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...grupos.entries()].flatMap(([key, grupo]) => [
                ...(agrupar
                  ? [
                      <TableRow key={`grupo-${key}`} className="bg-muted/60 hover:bg-muted/60">
                        <TableCell colSpan={7} className="py-2 text-sm font-medium">
                          {key === "__sin_factura__"
                            ? `Sin factura · ${grupo.length} ${grupo.length === 1 ? "partida" : "partidas"}`
                            : `${key ? `Factura ${key}` : "Sin número de factura"} · ${grupo.length} ${
                                grupo.length === 1 ? "partida" : "partidas"
                              } · ${grupo.reduce((s, p) => s + (p.peso ?? 0), 0).toFixed(2)} kg · $ ${grupo
                                .reduce((s, p) => s + (p.total ?? 0), 0)
                                .toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </TableCell>
                      </TableRow>,
                    ]
                  : []),
                ...grupo.map((p) => {
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
                      {p.revision_estado && p.revision_nota && (
                        <div
                          className={`text-xs mt-0.5 whitespace-normal ${
                            p.revision_estado === "devuelta" ? "text-destructive" : "text-amber-700"
                          }`}
                        >
                          {p.revision_estado === "devuelta" ? "Regresada: " : "Se solicita: "}
                          {p.revision_nota}
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
                      {p.revision_estado === "devuelta" ? (
                        <Badge variant="destructive">Devuelta</Badge>
                      ) : p.revision_estado === "info_solicitada" ? (
                        <Badge variant="outline" className="border-amber-400 text-amber-700">
                          Info solicitada
                        </Badge>
                      ) : (
                        <Badge variant={p.glosado ? "default" : "secondary"}>
                          {p.glosado ? "Confirmada" : "Pendiente"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <PartidaLinkDialog
                        previoId={previo.id}
                        partidaId={p.id}
                        token={p.photo_token}
                        etiqueta={etiquetaPartida(p)}
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
                        {canClassify(role) &&
                          p.classification_status === "clasificado" &&
                          p.clasificado_by !== currentUser?.id && (
                          <GlosarPartidaDialog
                            previoId={previo.id}
                            partida={p}
                            attachments={attachments}
                            trigger={
                              <Button variant="ghost" size="sm">
                                Revisar fracción
                              </Button>
                            }
                          />
                        )}
                        {!readOnly && (
                          <>
                            <PartidaFormDialog
                              previoId={previo.id}
                              partida={p}
                              facturas={facturasPrevio}
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
              }),
              ])}
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
                facturas={facturasPrevio}
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
