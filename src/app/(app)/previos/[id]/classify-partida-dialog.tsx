"use client";

import { useActionState, useEffect, useState } from "react";
import { classifyPartida, lookupLigieUmt } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AttachmentsPreview } from "./attachments-preview";
import type { ClasificacionArancelaria, Partida, PartidaAttachment } from "@/lib/types";

export function ClassifyPartidaDialog({
  previoId,
  partida,
  catalogo,
  attachments,
  trigger,
}: {
  previoId: string;
  partida: Partida;
  catalogo: ClasificacionArancelaria[];
  attachments: PartidaAttachment[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [fraccion, setFraccion] = useState(partida.fraccion_arancelaria ?? "");
  const [nico, setNico] = useState(partida.nico ?? "");
  const [regulaciones, setRegulaciones] = useState(partida.aplica_ma ?? "");
  const [umt, setUmt] = useState(partida.umt ?? "");
  const [umtHint, setUmtHint] = useState("");
  const [refPhoto, setRefPhoto] = useState<string | null>(null);

  async function handleFraccionBlur() {
    if (!/^\d{8}$/.test(fraccion)) return;
    const result = await lookupLigieUmt(fraccion, nico || null);
    if (result.umt) {
      setUmtHint(
        result.requiereNom
          ? `LIGIE sugiere "${result.umt}" — esta fracción suele requerir NOM.`
          : `LIGIE sugiere "${result.umt}" para esta fracción.`
      );
      if (!umt) setUmt(result.umt);
    } else {
      setUmtHint("No se encontró esta fracción/NICO en el catálogo oficial LIGIE — captúralo a mano.");
    }
  }

  const action = classifyPartida.bind(null, previoId, partida.id);
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state && !state.error) setOpen(false);
  }, [state]);

  const catalogItems: Record<string, string> = Object.fromEntries(
    catalogo.map((c) => [c.id, `${c.fraccion_arancelaria} — ${c.descripcion}`])
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Clasificar partida {partida.no_partida ?? "(sin factura)"}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
          <p className="font-medium">{partida.descripcion_aa ?? "Sin descripción"}</p>
          {(partida.marca || partida.modelo) && (
            <p className="text-muted-foreground">
              {[partida.marca, partida.modelo].filter(Boolean).join(" / ")}
            </p>
          )}
        </div>
        <AttachmentsPreview attachments={attachments} />
        <Separator />

        <form action={formAction} className="space-y-4">
          {catalogo.length > 0 && (
            <div className="space-y-1.5">
              <Label>Usar del catálogo</Label>
              <Select
                items={catalogItems}
                onValueChange={(id) => {
                  const c = catalogo.find((x) => x.id === id);
                  if (!c) return;
                  setFraccion(c.fraccion_arancelaria);
                  setNico(c.nico ?? "");
                  setRegulaciones(c.regulaciones ?? "");
                  setRefPhoto(c.photo_url);
                  lookupLigieUmt(c.fraccion_arancelaria, c.nico ?? null).then((result) => {
                    if (result.umt) {
                      setUmt(result.umt);
                      setUmtHint(`LIGIE sugiere "${result.umt}" para esta fracción.`);
                    }
                  });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {catalogo.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fraccion_arancelaria} — {c.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {refPhoto && (
                <div className="flex items-center gap-2 pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={refPhoto} alt="Referencia del catálogo" className="size-16 rounded border object-cover" />
                  <p className="text-xs text-muted-foreground">
                    Foto de referencia guardada — compárala contra la mercancía actual.
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="fraccion_arancelaria">Fracción Arancelaria</Label>
            <Input
              id="fraccion_arancelaria"
              name="fraccion_arancelaria"
              required
              value={fraccion}
              onChange={(e) => setFraccion(e.target.value)}
              onBlur={handleFraccionBlur}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nico">NICO</Label>
            <Input
              id="nico"
              name="nico"
              value={nico}
              onChange={(e) => setNico(e.target.value)}
              onBlur={handleFraccionBlur}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="umt">UMT (unidad de tasación)</Label>
            <Input id="umt" name="umt" value={umt} onChange={(e) => setUmt(e.target.value)} />
            {umtHint && <p className="text-xs text-muted-foreground">{umtHint}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aplica_ma">Regulaciones / NOM (si aplica)</Label>
            <Input
              id="aplica_ma"
              name="aplica_ma"
              placeholder="Ej. NOM-004-SCFI"
              value={regulaciones}
              onChange={(e) => setRegulaciones(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="save_to_catalog" defaultChecked className="size-4" />
            Guardar en el catálogo del cliente para reutilizar
          </label>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Marcar como clasificado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
